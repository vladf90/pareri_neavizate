import type { Provider, BatchMatchData } from "../providers/Provider.js";
import type { AppStateStore } from "../store/AppStateStore.js";
import type { WsServer } from "../ws/WsServer.js";
import type { GoalDetector } from "../services/GoalDetector.js";
import type {
  Match,
  MatchId,
  MatchEvent,
  MatchStats,
  MatchLineups,
} from "@parerineavizate/shared/models";
import { config } from "../config.js";
import { pollLogger } from "../utils/logger.js";

/**
 * FixtureOrchestrator - Consolidated polling for ALL fixture data
 * 
 * NEW ARCHITECTURE (per docs/New structure):
 * - Single API call every 2 seconds using /fixtures/multi/{ids}
 * - Fetches ALL data in one request: scores, events, stats, trends, lineups
 * - Replaces separate LivescoresPoller + FixturesPoller + MainMatchPoller + TickerPoller
 * 
 * Includes:
 * - state;participants;scores;periods;events.player;events.type
 * - statistics.type;trends.type;round;lineups.player;lineups.type
 * 
 * Rate Limit Budget:
 * - Fixture Entity: 3000/h available
 * - 2s interval = ~1800 req/h (60% usage)
 */

interface CachedMatchData {
  match: Match;
  events: MatchEvent[];
  stats: MatchStats | null;
  lineups: MatchLineups | null;
  fetchedAt: number;
}

export class FixtureOrchestrator {
  private provider: Provider;
  private store: AppStateStore;
  private wsServer: WsServer;
  private goalDetector: GoalDetector | null = null;
  
  private intervalMs: number;
  private timer: ReturnType<typeof setInterval> | null = null;
  private isPolling = false;

  // Cache for all polled fixtures
  private cache: Map<MatchId, CachedMatchData> = new Map();
  private lastPollAt: number = 0;
  
  // Subscribers for cache updates
  private subscribers: Set<() => void> = new Set();

  constructor(
    provider: Provider,
    store: AppStateStore,
    wsServer: WsServer,
    intervalMs: number = config.pollFixtureOrchestratorMs
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
   * Set goal detector for automatic goal alerts
   */
  setGoalDetector(detector: GoalDetector): void {
    this.goalDetector = detector;
  }

  /**
   * Start the orchestrator polling
   */
  start(): void {
    if (this.timer) return;

    pollLogger.info(
      { intervalMs: this.intervalMs },
      "FixtureOrchestrator starting (consolidated /fixtures/multi polling)"
    );

    // Initial poll immediately
    this.poll();

    this.timer = setInterval(() => {
      this.poll();
    }, this.intervalMs);
  }

  /**
   * Stop the orchestrator polling
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      pollLogger.info("FixtureOrchestrator stopped");
    }
  }

  /**
   * Check if orchestrator is running
   */
  isRunning(): boolean {
    return this.timer !== null;
  }

  /**
   * Get cached match data by ID
   */
  getMatch(matchId: MatchId): Match | null {
    return this.cache.get(matchId)?.match || null;
  }

  /**
   * Get cached events by match ID
   */
  getEvents(matchId: MatchId): MatchEvent[] {
    return this.cache.get(matchId)?.events || [];
  }

  /**
   * Get cached stats by match ID
   */
  getStats(matchId: MatchId): MatchStats | null {
    return this.cache.get(matchId)?.stats || null;
  }

  /**
   * Get cached lineups by match ID
   */
  getLineups(matchId: MatchId): MatchLineups | null {
    return this.cache.get(matchId)?.lineups || null;
  }

  /**
   * Get full cached data for a match
   */
  getFullMatchData(matchId: MatchId): CachedMatchData | null {
    return this.cache.get(matchId) || null;
  }

  /**
   * Get all cached matches
   */
  getAllCachedMatches(): Match[] {
    return Array.from(this.cache.values()).map((c) => c.match);
  }

  /**
   * Subscribe to cache updates
   */
  subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  /**
   * Check if cache is ready
   */
  isCacheReady(): boolean {
    return this.lastPollAt > 0;
  }

  /**
   * Get age of last poll
   */
  getLastPollAge(): number {
    return this.lastPollAt ? Date.now() - this.lastPollAt : Infinity;
  }

  /**
   * Force an immediate poll
   */
  async forcePoll(): Promise<void> {
    await this.poll();
  }

  /**
   * Main polling method - fetches data for all selected fixtures
   */
  private async poll(): Promise<void> {
    if (this.isPolling) return;
    this.isPolling = true;

    try {
      const state = this.store.getState();
      const mainMatchId = state.selection.mainMatchId;
      const tickerMatchIds = state.selection.tickerMatchIds;

      // Collect all fixture IDs to poll
      const allIds: MatchId[] = [];
      if (mainMatchId) allIds.push(mainMatchId);
      for (const id of tickerMatchIds) {
        if (!allIds.includes(id)) allIds.push(id);
      }

      if (allIds.length === 0) {
        // No fixtures selected, nothing to poll
        this.cache.clear();
        this.lastPollAt = Date.now();
        return;
      }

      // Single API call for ALL fixtures with FULL includes
      const batchData = await this.provider.getBatchMatchData(allIds, {
        events: true,
        stats: true,
        lineups: true,
      });

      const now = Date.now();

      // Update cache
      for (const data of batchData) {
        this.cache.set(data.match.id, {
          match: data.match,
          events: data.events || [],
          stats: data.stats || null,
          lineups: data.lineups || null,
          fetchedAt: now,
        });
      }

      // Remove stale entries (fixtures no longer selected)
      const currentIds = new Set(allIds);
      for (const cachedId of this.cache.keys()) {
        if (!currentIds.has(cachedId)) {
          this.cache.delete(cachedId);
        }
      }

      this.lastPollAt = now;

      // Update store with latest data
      this.updateStore(mainMatchId, tickerMatchIds, batchData);

      // Log polling stats
      const eventsCount = batchData.reduce((sum, d) => sum + (d.events?.length || 0), 0);
      const statsCount = batchData.filter((d) => d.stats).length;
      const lineupsCount = batchData.filter((d) => d.lineups).length;

      pollLogger.debug(
        {
          requested: allIds.length,
          fetched: batchData.length,
          eventsCount,
          statsCount,
          lineupsCount,
        },
        "FixtureOrchestrator poll completed"
      );

      // Notify subscribers
      for (const callback of this.subscribers) {
        try {
          callback();
        } catch (err) {
          pollLogger.error({ err }, "FixtureOrchestrator subscriber error");
        }
      }
    } catch (err) {
      pollLogger.error({ err }, "FixtureOrchestrator poll error");
    } finally {
      this.isPolling = false;
    }
  }

  /**
   * Update the store with latest polled data
   */
  private updateStore(
    mainMatchId: MatchId | null,
    tickerMatchIds: MatchId[],
    batchData: BatchMatchData[]
  ): void {
    const batchMap = new Map(batchData.map((d) => [d.match.id, d]));
    const state = this.store.getState();

    // Update main match
    if (mainMatchId) {
      const mainData = batchMap.get(mainMatchId);
      if (mainData) {
        this.store.setMainMatch(mainData.match);

        // Update events and detect goals
        if (mainData.events && mainData.events.length > 0) {
          this.store.setEvents(mainData.events);
          
          // Process events for goal detection
          if (this.goalDetector) {
            this.goalDetector.processEvents(mainData.events, mainData.match);
          }
        }

        // Update stats
        if (mainData.stats) {
          console.log(`[FixtureOrchestrator] Setting stats for ${mainMatchId}:`, JSON.stringify(mainData.stats, null, 2));
          this.store.setStats(mainData.stats);
        } else {
          console.log(`[FixtureOrchestrator] No stats available for ${mainMatchId}`);
        }

        // Update lineups (preserve form if already enriched)
        if (mainData.lineups) {
          const currentLineups = state.data.lineups;
          if (currentLineups?.home?.form || currentLineups?.away?.form) {
            const enrichedLineups = {
              ...mainData.lineups,
              home: { ...mainData.lineups.home, form: currentLineups.home?.form || mainData.lineups.home.form },
              away: { ...mainData.lineups.away, form: currentLineups.away?.form || mainData.lineups.away.form },
            };
            this.store.setLineups(enrichedLineups);
          } else {
            this.store.setLineups(mainData.lineups);
          }
        }
      }
    }

    // Update ticker matches
    if (tickerMatchIds.length > 0) {
      const tickerMatches: Match[] = [];
      for (const id of tickerMatchIds) {
        const data = batchMap.get(id);
        if (data) {
          tickerMatches.push(data.match);
        }
      }
      if (tickerMatches.length > 0) {
        this.store.setTickerMatches(tickerMatches);
      }
    }
  }
}
