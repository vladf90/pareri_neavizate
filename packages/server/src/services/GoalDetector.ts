/**
 * GoalDetector - Detects new goals from match events and broadcasts alerts.
 * 
 * Monitors events from FixtureOrchestrator and detects when new GOAL events appear.
 * Also monitors ticker matches for score changes (since we don't have events for them).
 * Broadcasts goal:alert via WebSocket to trigger LiveTicker animations.
 */

import type { WsServer } from "../ws/WsServer.js";
import type { AppStateStore } from "../store/AppStateStore.js";
import type { MatchEvent, Match, EventKind } from "@parerineavizate/shared/models";
import type { GoalAlertPayload } from "@parerineavizate/shared/wsEvents";
import { pollLogger } from "../utils/logger.js";

// Event kinds that count as goals
const GOAL_EVENT_KINDS: EventKind[] = ["GOAL", "OWN_GOAL", "PENALTY_GOAL"];

export class GoalDetector {
  private wsServer: WsServer;
  private store: AppStateStore;
  
  // Track seen event IDs to avoid duplicate alerts (for main match)
  private seenEventIds: Set<string> = new Set();
  
  // Track current match to detect match changes
  private currentMatchId: string | null = null;
  
  // Track previous scores for ticker matches (matchId -> "home-away")
  private tickerPreviousScores: Map<string, string> = new Map();

  constructor(wsServer: WsServer, store: AppStateStore) {
    this.wsServer = wsServer;
    this.store = store;
  }

  /**
   * Process events and detect new goals.
   * Called by FixtureOrchestrator after events are updated.
   */
  processEvents(events: MatchEvent[], match: Match): void {
    // Detect match change - reset seen events
    if (this.currentMatchId !== match.id) {
      pollLogger.debug(
        { oldMatchId: this.currentMatchId, newMatchId: match.id },
        "GoalDetector: Match changed, resetting seen events"
      );
      this.seenEventIds.clear();
      this.currentMatchId = match.id;
      
      // Pre-populate with existing events to avoid alerting on initial load
      for (const event of events) {
        this.seenEventIds.add(event.id);
      }
      return;
    }

    // Find new goal events
    const newGoals = events.filter(event => 
      GOAL_EVENT_KINDS.includes(event.kind) && 
      !this.seenEventIds.has(event.id)
    );

    // Process each new goal
    for (const goalEvent of newGoals) {
      this.seenEventIds.add(goalEvent.id);
      
      // Get team info based on which team scored
      const isHomeTeam = goalEvent.teamSide === "HOME";
      const team = isHomeTeam ? match.homeTeam : match.awayTeam;
      
      // For own goals, the scoring team is opposite (own goal benefits opponent)
      const isOwnGoal = goalEvent.kind === "OWN_GOAL";
      
      // Create goal alert payload
      const goalAlert: GoalAlertPayload = {
        id: `goal-${Date.now()}-${goalEvent.id}`,
        matchId: match.id,
        teamName: team.shortName || team.name,
        teamLogo: team.crestUrl,
        minute: goalEvent.displayMinute,
        newScore: `${match.score.home} - ${match.score.away}`,
        teamSide: goalEvent.teamSide,
        playerName: goalEvent.player?.name,
        isOwnGoal,
        isPenalty: goalEvent.kind === "PENALTY_GOAL",
      };

      pollLogger.info(
        { 
          goalAlert, 
          eventId: goalEvent.id, 
          eventKind: goalEvent.kind,
          player: goalEvent.player?.name 
        },
        "GoalDetector: New goal detected!"
      );

      // Broadcast goal alert to all clients
      this.wsServer.broadcastGoalAlert(goalAlert);
    }

    // Update seen events (also add non-goal events to track them)
    for (const event of events) {
      this.seenEventIds.add(event.id);
    }
  }

  /**
   * Reset detector state (e.g., when clearing main match).
   */
  reset(): void {
    this.seenEventIds.clear();
    this.currentMatchId = null;
    pollLogger.debug("GoalDetector: Reset main match tracking");
  }

  /**
   * Reset ticker tracking for specific matches.
   */
  resetTickerMatch(matchId: string): void {
    this.tickerPreviousScores.delete(matchId);
    pollLogger.debug({ matchId }, "GoalDetector: Reset ticker match tracking");
  }

  /**
   * Reset all ticker tracking.
   */
  resetAllTicker(): void {
    this.tickerPreviousScores.clear();
    pollLogger.debug("GoalDetector: Reset all ticker tracking");
  }

  /**
   * Process ticker matches and detect score changes (goals).
   * Called by FixtureOrchestrator after matches are updated.
   */
  processTickerMatches(matches: Match[]): void {
    const mainMatchId = this.store.getState().selection.mainMatchId;
    
    for (const match of matches) {
      // Skip main match (handled by processEvents with full event details)
      if (match.id === mainMatchId) continue;
      
      // Skip non-live matches
      if (match.status !== "LIVE") continue;
      
      const currentScore = `${match.score.home}-${match.score.away}`;
      const previousScore = this.tickerPreviousScores.get(match.id);
      
      // First time seeing this match - just record the score
      if (previousScore === undefined) {
        this.tickerPreviousScores.set(match.id, currentScore);
        pollLogger.debug(
          { matchId: match.id, score: currentScore },
          "GoalDetector: Recording initial ticker match score"
        );
        continue;
      }
      
      // No change
      if (currentScore === previousScore) continue;
      
      // Score changed! Detect which team scored
      const [prevHome, prevAway] = previousScore.split('-').map(Number);
      const homeScored = match.score.home > prevHome;
      const awayScored = match.score.away > prevAway;
      
      // Update stored score
      this.tickerPreviousScores.set(match.id, currentScore);
      
      // Broadcast goal alert(s)
      if (homeScored) {
        const goalAlert: GoalAlertPayload = {
          id: `ticker-goal-${Date.now()}-${match.id}-home`,
          matchId: match.id,
          teamName: match.homeTeam.shortName || match.homeTeam.name,
          teamLogo: match.homeTeam.crestUrl,
          minute: match.clock?.display || "?",
          newScore: currentScore.replace('-', ' - '),
          teamSide: "HOME",
          isOwnGoal: false,
          isPenalty: false,
          isTickerMatch: true,  // Flag to indicate this is from ticker
        };
        
        pollLogger.info(
          { matchId: match.id, team: "HOME", score: currentScore },
          "GoalDetector: Ticker match goal detected (HOME)!"
        );
        
        this.wsServer.broadcastGoalAlert(goalAlert);
      }
      
      if (awayScored) {
        const goalAlert: GoalAlertPayload = {
          id: `ticker-goal-${Date.now()}-${match.id}-away`,
          matchId: match.id,
          teamName: match.awayTeam.shortName || match.awayTeam.name,
          teamLogo: match.awayTeam.crestUrl,
          minute: match.clock?.display || "?",
          newScore: currentScore.replace('-', ' - '),
          teamSide: "AWAY",
          isOwnGoal: false,
          isPenalty: false,
          isTickerMatch: true,
        };
        
        pollLogger.info(
          { matchId: match.id, team: "AWAY", score: currentScore },
          "GoalDetector: Ticker match goal detected (AWAY)!"
        );
        
        this.wsServer.broadcastGoalAlert(goalAlert);
      }
    }
    
    // Cleanup: remove tracking for matches no longer in ticker
    const currentMatchIds = new Set(matches.map(m => m.id));
    for (const trackedId of this.tickerPreviousScores.keys()) {
      if (!currentMatchIds.has(trackedId)) {
        this.tickerPreviousScores.delete(trackedId);
      }
    }
  }

  /**
   * Get count of seen events (for debugging).
   */
  getSeenEventsCount(): number {
    return this.seenEventIds.size;
  }
  
  /**
   * Get count of tracked ticker matches (for debugging).
   */
  getTrackedTickerCount(): number {
    return this.tickerPreviousScores.size;
  }
}
