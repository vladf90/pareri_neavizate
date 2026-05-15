import type { Provider } from "../providers/Provider.js";
import type { ProviderRegistry } from "../providers/ProviderRegistry.js";
import type { AppStateStore } from "../store/AppStateStore.js";
import type { WsServer } from "../ws/WsServer.js";
import { FixtureOrchestrator } from "./FixtureOrchestrator.js";
import { StandingsPoller } from "./StandingsPoller.js";
import { GoalDetector } from "../services/GoalDetector.js";
import { pollLogger } from "../utils/logger.js";
import { config } from "../config.js";

/**
 * PollingManager watches AppState selection changes
 * and automatically starts/stops pollers as needed.
 *
 * ARCHITECTURE (v4 - Consolidated Orchestrator):
 * 
 * FIXTURE ORCHESTRATOR (Primary):
 * - Single /fixtures/multi/{ids} call every 2s
 * - Fetches ALL data: scores, events, stats, trends, lineups
 * - Handles both MainMatch and Ticker in one call
 * 
 * STANDINGS POLLER:
 * - /standings/live/leagues/{id} or /standings/seasons/{id}
 * - Polls every 10s (separate rate limit entity)
 * 
 * Rate Limit Budget (per entity, separate!):
 * - Fixture Entity: 3000/h → ~1800/h used (60%)
 * - Standing Entity: 3000/h → ~360/h used (12%)
 */
export class PollingManager {
  private store: AppStateStore;
  private wsServer: WsServer;
  private providerRegistry: ProviderRegistry;

  // Consolidated Fixture Orchestrator
  private fixtureOrchestrator: FixtureOrchestrator | null = null;
  private standingsPoller: StandingsPoller | null = null;
  
  private goalDetector: GoalDetector;
  
  // Subscription cleanup functions
  private orchestratorUnsubscribe: (() => void) | null = null;
  private unsubscribe: (() => void) | null = null;
  
  private lastMainMatchId: string | null = null;
  private lastTickerMatchIds: string[] = [];

  constructor(store: AppStateStore, wsServer: WsServer, providerRegistry: ProviderRegistry) {
    this.store = store;
    this.wsServer = wsServer;
    this.providerRegistry = providerRegistry;
    
    // Create GoalDetector for automatic goal alerts
    this.goalDetector = new GoalDetector(wsServer, store);
  }

  start(): void {
    pollLogger.info("PollingManager starting");

    const provider = this.providerRegistry.getActiveProvider();
    if (provider) {
      // Start consolidated FixtureOrchestrator (single API call for all data)
      this.startFixtureOrchestrator(provider);
      // Start StandingsPoller (separate rate limit entity)
      this.startStandingsPoller(provider);
      pollLogger.info("Consolidated orchestrator architecture started");
    }

    // Subscribe to state changes
    this.unsubscribe = this.store.subscribe((state) => {
      this.handleSelectionChange(state.selection.mainMatchId, state.selection.tickerMatchIds);
    });

    // Initial check
    const state = this.store.getState();
    this.handleSelectionChange(state.selection.mainMatchId, state.selection.tickerMatchIds);
  }

  stop(): void {
    pollLogger.info("PollingManager stopping");

    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    
    // Unsubscribe from orchestrator updates
    if (this.orchestratorUnsubscribe) {
      this.orchestratorUnsubscribe();
      this.orchestratorUnsubscribe = null;
    }

    // Stop all pollers
    this.stopFixtureOrchestrator();
    this.stopStandingsPoller();
  }

  // ==================== ORCHESTRATOR METHODS ====================
  
  private startFixtureOrchestrator(provider: Provider): void {
    if (this.fixtureOrchestrator) {
      this.fixtureOrchestrator.setProvider(provider);
      this.fixtureOrchestrator.setGoalDetector(this.goalDetector);
      if (!this.fixtureOrchestrator.isRunning()) {
        this.fixtureOrchestrator.start();
      }
    } else {
      this.fixtureOrchestrator = new FixtureOrchestrator(
        provider,
        this.store,
        this.wsServer,
        config.pollFixtureOrchestratorMs
      );
      this.fixtureOrchestrator.setGoalDetector(this.goalDetector);
      this.fixtureOrchestrator.start();
      pollLogger.info(
        { intervalMs: config.pollFixtureOrchestratorMs },
        "FixtureOrchestrator started (consolidated /fixtures/multi polling)"
      );
    }
  }
  
  private stopFixtureOrchestrator(): void {
    if (this.fixtureOrchestrator) {
      this.fixtureOrchestrator.stop();
    }
  }
  
  private startStandingsPoller(provider: Provider): void {
    if (this.standingsPoller) {
      this.standingsPoller.setProvider(provider);
      if (!this.standingsPoller.isRunning()) {
        this.standingsPoller.start();
      }
    } else {
      this.standingsPoller = new StandingsPoller(
        provider,
        this.store,
        this.wsServer,
        config.pollStandingsMs
      );
      this.standingsPoller.start();
      pollLogger.info(
        { intervalMs: config.pollStandingsMs },
        "StandingsPoller started"
      );
    }
  }
  
  private stopStandingsPoller(): void {
    if (this.standingsPoller) {
      this.standingsPoller.stop();
    }
  }

  private handleSelectionChange(mainMatchId: string | null, tickerMatchIds: string[]): void {
    const provider = this.providerRegistry.getActiveProvider();
    if (!provider) {
      pollLogger.warn("No active provider");
      return;
    }

    // Log changes for debugging
    if (mainMatchId !== this.lastMainMatchId) {
      this.lastMainMatchId = mainMatchId;
      pollLogger.debug({ mainMatchId }, "Main match selection changed");
    }

    const tickerChanged =
      tickerMatchIds.length !== this.lastTickerMatchIds.length ||
      tickerMatchIds.some((id, i) => id !== this.lastTickerMatchIds[i]);

    if (tickerChanged) {
      this.lastTickerMatchIds = [...tickerMatchIds];
      pollLogger.debug({ tickerCount: tickerMatchIds.length }, "Ticker selection changed");
    }

    // The FixtureOrchestrator automatically watches the store for selection changes
    // and will start polling the appropriate matches
  }
}
