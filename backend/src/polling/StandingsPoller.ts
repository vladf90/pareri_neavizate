import type { Provider } from "../providers/Provider.js";
import type { AppStateStore } from "../store/AppStateStore.js";
import type { WsServer } from "../ws/WsServer.js";
import type { Standings } from "@parerineavizate/shared/models";
import { config } from "../config.js";
import { pollLogger } from "../utils/logger.js";

/**
 * StandingsPoller - Dedicated polling for standings data
 * 
 * NEW ARCHITECTURE (per docs/New structure):
 * - Polls standings every 10 seconds
 * - Uses /standings/live/leagues/{leagueId} when matches are live
 * - Falls back to /standings/seasons/{seasonId} for static standings
 * 
 * Rate Limit Budget:
 * - Standing Entity: 3000/h available (separate from Fixture!)
 * - 10s interval = ~360 req/h (12% usage)
 */

interface CachedStandings {
  standings: Standings;
  isLive: boolean;
  fetchedAt: number;
}

export class StandingsPoller {
  private provider: Provider;
  private store: AppStateStore;
  private wsServer: WsServer;
  
  private intervalMs: number;
  private timer: ReturnType<typeof setInterval> | null = null;
  private isPolling = false;

  // Cache for standings
  private staticCache: CachedStandings | null = null;
  private liveCache: CachedStandings | null = null;
  private lastPollAt: number = 0;

  // Current polling configuration
  private currentSeasonId: string | null = null;
  private currentLeagueId: string | null = null;
  private currentCompetitionId: string | null = null;
  private currentCompetitionName: string | null = null;

  constructor(
    provider: Provider,
    store: AppStateStore,
    wsServer: WsServer,
    intervalMs: number = config.pollStandingsMs
  ) {
    this.provider = provider;
    this.store = store;
    this.wsServer = wsServer;
    this.intervalMs = intervalMs;
  }

  /**
   * Set or update the provider
   */
  setProvider(provider: Provider): void {
    this.provider = provider;
  }

  /**
   * Configure which league/season to poll standings for
   */
  configure(params: {
    seasonId?: string;
    leagueId?: string;
    competitionId?: string;
    competitionName?: string;
  }): void {
    this.currentSeasonId = params.seasonId || null;
    this.currentLeagueId = params.leagueId || null;
    this.currentCompetitionId = params.competitionId || null;
    this.currentCompetitionName = params.competitionName || null;
    
    // Clear cache when config changes
    this.staticCache = null;
    this.liveCache = null;
    
    pollLogger.info(
      { seasonId: this.currentSeasonId, leagueId: this.currentLeagueId },
      "StandingsPoller configured"
    );
  }

  /**
   * Start polling
   */
  start(): void {
    if (this.timer) return;

    pollLogger.info(
      { intervalMs: this.intervalMs },
      "StandingsPoller starting"
    );

    // Initial poll immediately
    this.poll();

    this.timer = setInterval(() => {
      this.poll();
    }, this.intervalMs);
  }

  /**
   * Stop polling
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      pollLogger.info("StandingsPoller stopped");
    }
  }

  /**
   * Check if poller is running
   */
  isRunning(): boolean {
    return this.timer !== null;
  }

  /**
   * Get cached static standings
   */
  getStaticStandings(): Standings | null {
    return this.staticCache?.standings || null;
  }

  /**
   * Get cached live standings
   */
  getLiveStandings(): Standings | null {
    return this.liveCache?.standings || null;
  }

  /**
   * Get best available standings (live preferred, static fallback)
   */
  getBestStandings(): Standings | null {
    // Prefer live standings if available and fresh (< 30s old)
    if (this.liveCache && Date.now() - this.liveCache.fetchedAt < 30000) {
      return this.liveCache.standings;
    }
    return this.staticCache?.standings || null;
  }

  /**
   * Force an immediate poll
   */
  async forcePoll(): Promise<void> {
    await this.poll();
  }

  /**
   * Main polling method
   */
  private async poll(): Promise<void> {
    if (this.isPolling) return;
    if (!this.currentSeasonId && !this.currentLeagueId) {
      // No standings configuration set, try to get from main match
      this.autoConfigureFromMainMatch();
      if (!this.currentSeasonId && !this.currentLeagueId) {
        return;
      }
    }

    this.isPolling = true;

    try {
      const competitionId = this.currentCompetitionId || this.currentLeagueId || "";
      const competitionName = this.currentCompetitionName || "Competition";
      const seasonId = this.currentSeasonId || "";

      // Try live standings first (if leagueId is available)
      if (this.currentLeagueId && this.provider.getLiveStandings) {
        try {
          const liveStandings = await this.provider.getLiveStandings(
            this.currentLeagueId,
            competitionId,
            competitionName,
            seasonId
          );
          
          if (liveStandings && liveStandings.entries.length > 0) {
            this.liveCache = {
              standings: liveStandings,
              isLive: true,
              fetchedAt: Date.now(),
            };
            pollLogger.debug(
              { leagueId: this.currentLeagueId, entries: liveStandings.entries.length },
              "StandingsPoller: live standings updated"
            );
          } else {
            // No live standings available (no matches live)
            this.liveCache = null;
          }
        } catch (err) {
          pollLogger.error({ err }, "StandingsPoller: live standings fetch failed");
        }
      }

      // Fetch static standings (always, as fallback)
      if (this.currentSeasonId && this.provider.getStandings) {
        try {
          const staticStandings = await this.provider.getStandings(
            this.currentSeasonId,
            competitionId,
            competitionName
          );
          
          if (staticStandings) {
            this.staticCache = {
              standings: staticStandings,
              isLive: false,
              fetchedAt: Date.now(),
            };
            pollLogger.debug(
              { seasonId: this.currentSeasonId, entries: staticStandings.entries.length },
              "StandingsPoller: static standings updated"
            );
          }
        } catch (err) {
          pollLogger.error({ err }, "StandingsPoller: static standings fetch failed");
        }
      }

      this.lastPollAt = Date.now();
    } catch (err) {
      pollLogger.error({ err }, "StandingsPoller poll error");
    } finally {
      this.isPolling = false;
    }
  }

  /**
   * Auto-configure from main match selection
   */
  private autoConfigureFromMainMatch(): void {
    const state = this.store.getState();
    const mainMatch = state.data.mainMatch;
    
    if (!mainMatch) return;

    const competition = mainMatch.competition;
    if (competition) {
      this.currentCompetitionId = competition.id;
      this.currentCompetitionName = competition.name;
      this.currentLeagueId = competition.id;
      
      if (competition.season) {
        this.currentSeasonId = competition.season.id;
      }
      
      pollLogger.debug(
        { competitionId: this.currentCompetitionId, seasonId: this.currentSeasonId },
        "StandingsPoller auto-configured from main match"
      );
    }
  }
}
