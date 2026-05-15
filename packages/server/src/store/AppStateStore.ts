import * as fs from "fs";
import * as path from "path";
import type {
  AppState,
  AppDataState,
  ProviderInfo,
  SelectionState,
  Match,
  MatchEvent,
  MatchLineups,
  MatchStats,
  MatchId,
  Toggles,
  ResolumeConfig,
  ResolumeZone,
} from "@parerineavizate/shared/models";
import { DEFAULT_TOGGLES, DEFAULT_RESOLUME_CONFIG } from "@parerineavizate/shared/models";
import { config } from "../config.js";
import { storeLogger } from "../utils/logger.js";

// Re-export for convenience
export type { AppState };

export function createDefaultState(): AppState {
  return {
    schemaVersion: 1,
    updatedAt: Date.now(),
    provider: {
      name: config.provider,
      status: "ok",
      message: undefined,
      lastSuccessAt: undefined,
    },
    selection: {
      mainMatchId: null,
      tickerMatchIds: [],
      themeId: "UCL",
      toggles: { ...DEFAULT_TOGGLES },
    },
    data: {
      mainMatch: undefined,
      tickerMatches: [],
      events: [],
      lineups: undefined,
      stats: undefined,
    },
    ui: {
      operatorNotes: undefined,
    },
  };
}

export type StateUpdateCallback = (state: AppState) => void;

export class AppStateStore {
  private state: AppState;
  private filePath: string;
  private debounceMs: number;
  private persistTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners: Set<StateUpdateCallback> = new Set();

  constructor(
    filePath: string = config.stateFilePath,
    debounceMs: number = config.persistDebounceMs
  ) {
    this.filePath = path.resolve(filePath);
    this.debounceMs = debounceMs;
    this.state = this.loadOrCreate();
  }

  private loadOrCreate(): AppState {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, "utf-8");
        const parsed = JSON.parse(raw) as AppState;

        // Validate schemaVersion
        if (parsed.schemaVersion !== 1) {
          storeLogger.warn(
            { schemaVersion: parsed.schemaVersion },
            "Unknown schemaVersion, creating default state"
          );
          return createDefaultState();
        }

        // Merge with defaults for new fields (e.g. resolume)
        const merged: AppState = {
          ...parsed,
          resolume: parsed.resolume || DEFAULT_RESOLUME_CONFIG,
          selection: {
            ...parsed.selection,
            toggles: { ...DEFAULT_TOGGLES, ...parsed.selection?.toggles },
          },
        };

        storeLogger.info({ filePath: this.filePath }, "Loaded state from file");
        return merged;
      }
    } catch (err) {
      storeLogger.warn({ filePath: this.filePath, error: err }, "Failed to load state");
    }

    storeLogger.info("Creating default state");
    return createDefaultState();
  }

  private schedulePersist(): void {
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
    }

    this.persistTimer = setTimeout(() => {
      this.persistSync();
      this.persistTimer = null;
    }, this.debounceMs);
  }

  private persistSync(): void {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(this.filePath, JSON.stringify(this.state, null, 2), "utf-8");
      storeLogger.debug({ filePath: this.filePath }, "Persisted state");
    } catch (err) {
      storeLogger.error({ filePath: this.filePath, error: err }, "Failed to persist state");
    }
  }

  getState(): AppState {
    return this.state;
  }

  subscribe(callback: StateUpdateCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.state);
      } catch (err) {
        storeLogger.error({ error: err }, "Listener error");
      }
    }
  }

  private updateState(partial: Partial<AppState>): void {
    this.state = {
      ...this.state,
      ...partial,
      updatedAt: Date.now(),
    };
    this.schedulePersist();
    this.notifyListeners();
  }

  // --- Provider ---
  setProvider(provider: ProviderInfo): void {
    this.updateState({ provider });
  }

  updateProviderStatus(status: ProviderInfo["status"], message?: string): void {
    this.updateState({
      provider: {
        ...this.state.provider,
        status,
        message,
        lastSuccessAt: status === "ok" ? Date.now() : this.state.provider.lastSuccessAt,
      },
    });
  }

  // --- Selection ---
  setMainMatchId(matchId: MatchId | null): void {
    this.updateState({
      selection: {
        ...this.state.selection,
        mainMatchId: matchId,
      },
    });
  }

  setTickerMatchIds(matchIds: MatchId[]): void {
    this.updateState({
      selection: {
        ...this.state.selection,
        tickerMatchIds: matchIds,
      },
    });
  }

  setTheme(themeId: string): void {
    this.updateState({
      selection: {
        ...this.state.selection,
        themeId,
      },
    });
  }

  setToggles(toggles: Partial<Toggles>): void {
    this.updateState({
      selection: {
        ...this.state.selection,
        toggles: {
          ...this.state.selection.toggles,
          ...toggles,
        },
      },
    });
  }

  // --- Data ---
  setMainMatch(match: Match | undefined): void {
    // Optimization: Skip update if match hasn't changed
    const current = this.state.data.mainMatch;
    
    if (match && current) {
      // Check if key properties are the same
      if (
        current.id === match.id &&
        current.status === match.status &&
        current.clock.minute === match.clock.minute &&
        current.score.home === match.score.home &&
        current.score.away === match.score.away
      ) {
        return; // No meaningful changes
      }
    } else if (!match && !current) {
      return; // Both undefined
    }

    this.updateState({
      data: {
        ...this.state.data,
        mainMatch: match,
      },
    });
  }

  setTickerMatches(matches: Match[]): void {
    this.updateState({
      data: {
        ...this.state.data,
        tickerMatches: matches,
      },
    });
  }

  setEvents(events: MatchEvent[]): void {
    // Optimization: Only update if events actually changed
    const currentEvents = this.state.data.events;
    
    // Quick check: same length and same IDs in same order
    if (currentEvents.length === events.length) {
      const sameEvents = currentEvents.every((e, i) => {
        const newEvent = events[i];
        return e.id === newEvent.id && 
               e.minute === newEvent.minute;
      });
      
      if (sameEvents) {
        // No changes detected, skip update to avoid unnecessary broadcast
        return;
      }
    }

    this.updateState({
      data: {
        ...this.state.data,
        events,
      },
    });
  }

  addEvent(event: MatchEvent): void {
    // Check if event already exists
    if (this.state.data.events.some((e) => e.id === event.id)) {
      return;
    }

    this.updateState({
      data: {
        ...this.state.data,
        events: [...this.state.data.events, event],
      },
    });
  }

  setLineups(lineups: MatchLineups | undefined): void {
    // Optimization: Skip if lineups haven't changed (deep comparison would be expensive, 
    // but lineups rarely change during a match, so we can use a simple check)
    const current = this.state.data.lineups;
    
    if (!lineups && !current) {
      return; // Both undefined
    }
    
    if (lineups && current) {
      // Simple check: same home/away starting lineup length
      const sameHome = lineups.home.startingXI.length === current.home.startingXI.length;
      const sameAway = lineups.away.startingXI.length === current.away.startingXI.length;
      
      if (sameHome && sameAway) {
        // Lineups structure is the same, likely no changes (substitutions would change bench)
        const sameBenchHome = (lineups.home.bench?.length || 0) === (current.home.bench?.length || 0);
        const sameBenchAway = (lineups.away.bench?.length || 0) === (current.away.bench?.length || 0);
        
        // Check if form has been added (it may be missing initially and added by enrichLineupsWithForm)
        const sameFormHome = JSON.stringify(lineups.home.form) === JSON.stringify(current.home.form);
        const sameFormAway = JSON.stringify(lineups.away.form) === JSON.stringify(current.away.form);
        
        // Check if formation or manager changed
        const sameFormation = lineups.home.formation === current.home.formation &&
                              lineups.away.formation === current.away.formation;
        const sameManager = lineups.home.manager === current.home.manager &&
                            lineups.away.manager === current.away.manager;
        
        storeLogger.debug({
          newHomeForm: lineups.home.form,
          currentHomeForm: current.home.form,
          sameFormHome,
          newAwayForm: lineups.away.form,
          currentAwayForm: current.away.form,
          sameFormAway,
          sameFormation,
          sameManager,
          newHomeFormation: lineups.home.formation,
          currentHomeFormation: current.home.formation,
          newHomeManager: lineups.home.manager,
          currentHomeManager: current.home.manager,
        }, "setLineups form comparison");
        
        if (sameBenchHome && sameBenchAway && sameFormHome && sameFormAway && sameFormation && sameManager) {
          return; // No lineup changes detected
        }
      }
    }

    storeLogger.debug({
      hasForm: !!(lineups?.home?.form),
      homeForm: lineups?.home?.form,
      awayForm: lineups?.away?.form,
    }, "setLineups UPDATING state with new lineups");
    
    this.updateState({
      data: {
        ...this.state.data,
        lineups,
      },
    });
  }

  setStats(stats: MatchStats | undefined): void {
    // Optimization: Skip if stats haven't changed
    const current = this.state.data.stats;
    
    if (!stats && !current) {
      return; // Both undefined
    }
    
    if (stats && current) {
      // Compare key stats to detect changes
      const sameStats =
        stats.home.possession === current.home.possession &&
        stats.away.possession === current.away.possession &&
        stats.home.shots_total === current.home.shots_total &&
        stats.away.shots_total === current.away.shots_total &&
        stats.home.shots_on_target === current.home.shots_on_target &&
        stats.away.shots_on_target === current.away.shots_on_target;
      
      if (sameStats) {
        return; // No stat changes detected
      }
    }

    this.updateState({
      data: {
        ...this.state.data,
        stats,
      },
    });
  }

  // --- Bulk data update ---
  setData(data: Partial<AppDataState>): void {
    this.updateState({
      data: {
        ...this.state.data,
        ...data,
      },
    });
  }

  // --- UI ---
  setOperatorNotes(notes: string | undefined): void {
    this.updateState({
      ui: {
        ...this.state.ui,
        operatorNotes: notes,
      },
    });
  }

  // --- Reset main match data ---
  clearMainMatchData(): void {
    this.updateState({
      data: {
        ...this.state.data,
        mainMatch: undefined,
        events: [],
        lineups: undefined,
        stats: undefined,
      },
    });
  }

  // --- Resolume Config ---
  setResolumeConfig(config: ResolumeConfig): void {
    this.updateState({
      resolume: {
        ...config,
        lastUpdatedAt: Date.now(),
      },
    });
  }

  updateResolumeZone(zoneId: string, updates: Partial<ResolumeZone>): void {
    const currentConfig = this.state.resolume || DEFAULT_RESOLUME_CONFIG;
    const zones = currentConfig.zones.map((zone) => {
      if (zone.id !== zoneId) return zone;
      
      // Merge updates with existing zone
      const updatedZone = { ...zone, ...updates };
      
      // Handle explicit null/undefined values - these mean "remove the property"
      // spanZones: null means clear the span
      if ('spanZones' in updates && (updates.spanZones === null || updates.spanZones === undefined)) {
        delete updatedZone.spanZones;
      }
      
      // Same for other optional properties that might need clearing
      if ('widgetOffsetX' in updates && updates.widgetOffsetX === null) {
        delete updatedZone.widgetOffsetX;
      }
      if ('widgetOffsetY' in updates && updates.widgetOffsetY === null) {
        delete updatedZone.widgetOffsetY;
      }
      
      return updatedZone;
    });

    this.updateState({
      resolume: {
        ...currentConfig,
        zones,
        lastUpdatedAt: Date.now(),
      },
    });
  }

  getResolumeConfig(): ResolumeConfig {
    return this.state.resolume || DEFAULT_RESOLUME_CONFIG;
  }

  // --- Force persist (for graceful shutdown) ---
  forcePersist(): void {
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
    }
    this.persistSync();
  }
}

// Singleton instance
let storeInstance: AppStateStore | null = null;

export function getStore(): AppStateStore {
  if (!storeInstance) {
    storeInstance = new AppStateStore();
  }
  return storeInstance;
}

export function initStore(filePath?: string, debounceMs?: number): AppStateStore {
  storeInstance = new AppStateStore(filePath, debounceMs);
  return storeInstance;
}
