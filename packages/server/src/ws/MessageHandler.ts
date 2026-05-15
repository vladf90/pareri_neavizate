import type { ClientToServer, GoalAlertPayload } from "@parerineavizate/shared/wsEvents";
import type { MatchEvent } from "@parerineavizate/shared/models";
import type { WsServer, WsClient } from "./WsServer.js";
import type { AppStateStore } from "../store/AppStateStore.js";
import type { ProviderRegistry } from "../providers/ProviderRegistry.js";
import { wsLogger } from "../utils/logger.js";
import { validatePayloadWithError, type MessageType } from "../validation/index.js";

export function createMessageHandler(
  store: AppStateStore,
  wsServer: WsServer,
  providerRegistry: ProviderRegistry
) {
  return async (client: WsClient, message: ClientToServer) => {
    try {
      // Validate payload if schema exists for this message type
      const messageType = message.type as MessageType;
      const validation = validatePayloadWithError(messageType, message.payload);
      
      if (!validation.success) {
        wsLogger.warn(
          { clientId: client.id, messageType, error: validation.error },
          "Message validation failed"
        );
        wsServer.sendError(client, "VALIDATION_ERROR", validation.error);
        return;
      }

      switch (message.type) {
        case "admin:setMainMatch": {
          const { matchId } = message.payload;
          wsLogger.info({ matchId }, "Setting main match");

          // Clear existing data when changing match
          if (matchId !== store.getState().selection.mainMatchId) {
            store.clearMainMatchData();
          }

          store.setMainMatchId(matchId);

          // Trigger immediate fetch if match selected
          if (matchId) {
            const provider = providerRegistry.getActiveProvider();
            if (provider) {
              try {
                const match = await provider.getMatchSnapshot(matchId);
                if (match) {
                  store.setMainMatch(match);
                  
                  // Fetch form data for both teams immediately on match change
                  // This ensures form data is available without waiting for cache
                  if (provider.getTeamForm) {
                    const [homeForm, awayForm] = await Promise.allSettled([
                      provider.getTeamForm(match.homeTeam.id),
                      provider.getTeamForm(match.awayTeam.id),
                    ]);
                    
                    wsLogger.debug(
                      { 
                        homeTeamId: match.homeTeam.id,
                        awayTeamId: match.awayTeam.id,
                        homeFormResult: homeForm.status,
                        awayFormResult: awayForm.status,
                      },
                      "Fetched team form data on match change"
                    );
                    
                    // Store form data in lineups if available
                    const currentLineups = store.getState().data.lineups;
                    if (currentLineups || (homeForm.status === 'fulfilled' || awayForm.status === 'fulfilled')) {
                      store.setLineups({
                        matchId: matchId,
                        lastUpdatedAt: Date.now(),
                        home: {
                          ...(currentLineups?.home || { 
                            teamSide: "HOME" as const, 
                            startingXI: [], 
                            bench: [] 
                          }),
                          form: homeForm.status === 'fulfilled' ? homeForm.value || undefined : currentLineups?.home?.form,
                        },
                        away: {
                          ...(currentLineups?.away || { 
                            teamSide: "AWAY" as const, 
                            startingXI: [], 
                            bench: [] 
                          }),
                          form: awayForm.status === 'fulfilled' ? awayForm.value || undefined : currentLineups?.away?.form,
                        },
                      });
                    }
                  }
                }

                const events = await provider.getMatchEvents(matchId);
                if (events) {
                  store.setEvents(events);
                }
                
                // Fetch lineups immediately on match change
                const lineups = await provider.getMatchLineups(matchId);
                if (lineups) {
                  // Preserve form data if already fetched
                  const currentLineups = store.getState().data.lineups;
                  store.setLineups({
                    ...lineups,
                    home: {
                      ...lineups.home,
                      form: currentLineups?.home?.form || lineups.home.form,
                    },
                    away: {
                      ...lineups.away,
                      form: currentLineups?.away?.form || lineups.away.form,
                    },
                  });
                }
              } catch (err) {
                wsLogger.error({ matchId, error: err }, "Failed to fetch match data");
              }
            }
          }
          break;
        }

        case "admin:setTickerMatches": {
          const { matchIds } = message.payload;
          wsLogger.info({ matchIds, count: matchIds.length }, "Setting ticker matches");
          store.setTickerMatchIds(matchIds);

          // Trigger immediate fetch
          if (matchIds.length > 0) {
            const provider = providerRegistry.getActiveProvider();
            if (provider) {
              try {
                const matches = await Promise.all(
                  matchIds.map((id) => provider.getMatchSnapshot(id))
                );
                store.setTickerMatches(
                  matches.filter((m): m is NonNullable<typeof m> => m !== null)
                );
              } catch (err) {
                wsLogger.error({ matchIds, error: err }, "Failed to fetch ticker matches");
              }
            }
          } else {
            store.setTickerMatches([]);
          }
          break;
        }

        case "admin:setTheme": {
          const { themeId } = message.payload;
          wsLogger.info({ themeId }, "Setting theme");
          store.setTheme(themeId);
          break;
        }

        case "admin:setOverlayToggles": {
          const { toggles } = message.payload;
          wsLogger.info({ toggles }, "Setting toggles");
          store.setToggles(toggles);
          break;
        }

        case "admin:clearMainMatch": {
          wsLogger.info("Clearing main match");
          store.setMainMatchId(null);
          store.clearMainMatchData();
          break;
        }

        case "admin:clearTicker": {
          wsLogger.info("Clearing ticker");
          store.setTickerMatchIds([]);
          store.setTickerMatches([]);
          break;
        }

        case "admin:resetSession": {
          wsLogger.info("Resetting session (clear main match + ticker)");
          store.setMainMatchId(null);
          store.clearMainMatchData();
          store.setTickerMatchIds([]);
          store.setTickerMatches([]);
          break;
        }

        case "admin:testEvent": {
          const { matchId, event } = message.payload;
          wsLogger.info({ matchId, event }, "Test event");

          const targetMatchId = matchId || store.getState().selection.mainMatchId;
          if (!targetMatchId) {
            wsServer.sendError(client, "NO_MATCH", "No match selected for test event");
            return;
          }

          // Create a test event with proper typing
          const testEvent: MatchEvent = {
            id: `test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            matchId: targetMatchId,
            kind: event.kind,
            teamSide: event.team,
            minute: event.minute ?? 45,
            displayMinute: event.minute ? String(event.minute) : "45",
            player: event.player ? { name: event.player } : undefined,
            detail: event.label,
          };

          store.addEvent(testEvent);
          
          // For GOAL events, also broadcast a goal alert immediately
          if (event.kind === "GOAL") {
            const mainMatch = store.getState().data.mainMatch;
            if (mainMatch) {
              const isHome = event.team === "HOME";
              const team = isHome ? mainMatch.homeTeam : mainMatch.awayTeam;
              
              const goalAlert: GoalAlertPayload = {
                id: `test-goal-${Date.now()}`,
                matchId: targetMatchId,
                teamName: team.shortName || team.name,
                teamLogo: team.crestUrl,
                minute: testEvent.displayMinute,
                newScore: `${mainMatch.score.home} - ${mainMatch.score.away}`,
                teamSide: event.team,
                playerName: event.player,
                isOwnGoal: false,
                isPenalty: false,
              };
              
              wsLogger.info({ goalAlert }, "Broadcasting test goal alert");
              wsServer.broadcastGoalAlert(goalAlert);
            }
          }
          break;
        }

        case "admin:setResolumeConfig": {
          const { config } = message.payload;
          wsLogger.info({ canvasSize: `${config.canvasWidth}x${config.canvasHeight}`, zones: config.zones.length }, "Setting Resolume config");
          store.setResolumeConfig(config);
          break;
        }

        case "admin:updateResolumeZone": {
          const { zoneId, updates } = message.payload;
          wsLogger.info({ zoneId, updates }, "Updating Resolume zone");
          store.updateResolumeZone(zoneId, updates);
          break;
        }

        case "admin:showVersus": {
          const { player1, player2 } = message.payload;
          wsLogger.info({ player1: player1.name, player2: player2.name }, "Show versus");
          
          wsServer.broadcastVersusUpdate({
            visible: true,
            player1,
            player2,
          });
          break;
        }

        case "admin:hideVersus": {
          wsLogger.info("Hide versus");
          
          wsServer.broadcastVersusUpdate({
            visible: false,
          });
          break;
        }

        default:
          wsLogger.warn({ messageType: (message as { type: string }).type }, "Unknown message type");
          wsServer.sendError(
            client,
            "UNKNOWN_TYPE",
            `Unknown message type: ${(message as { type: string }).type}`
          );
      }
    } catch (err) {
      wsLogger.error({ clientId: client.id, error: err }, "Error processing message");
      wsServer.sendError(client, "HANDLER_ERROR", "Failed to process message");
    }
  };
}
