import { create } from "zustand";
import type { AppState, Match, MatchId, Toggles, ResolumeConfig, ResolumeZone, PlayerDetails, VersusData } from "@parerineavizate/shared/models";
import type { ServerToClient } from "@parerineavizate/shared/wsEvents";
import { env } from "@parerineavizate/shared/wsEvents";
import { getWsClient, type ConnectionStatus } from "@/ws";
import { API_BASE_URL } from "@/config";
import { useGoalAlertStore } from "./goalAlertStore";

interface League {
  id: string;
  name: string;
  country?: string;
  matchCount?: number;
}

interface SquadPlayer {
  id: number;
  name: string;
  number: number | null;
  positionId: number;
  detailedPositionId: number;
  photoUrl?: string;
}

interface AppStore {
  // State
  appState: AppState | null;
  connectionStatus: ConnectionStatus;
  availableMatches: Match[];
  isLoadingMatches: boolean;

  // Filter state
  selectedDate: string;
  selectedLeagueId: string | null;
  availableLeagues: League[];
  isLoadingLeagues: boolean;

  // Squad state
  homeSquad: SquadPlayer[];
  awaySquad: SquadPlayer[];
  isLoadingHomeSquad: boolean;
  isLoadingAwaySquad: boolean;

  // Versus state
  versusData: VersusData;
  isLoadingVersusPlayer1: boolean;
  isLoadingVersusPlayer2: boolean;

  // Actions
  setAppState: (state: AppState) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  handleServerMessage: (message: ServerToClient) => void;
  fetchAvailableMatches: () => Promise<void>;

  // Filter actions
  setSelectedDate: (date: string) => void;
  setSelectedLeagueId: (leagueId: string | null) => void;
  fetchLeaguesForDate: (date: string) => Promise<void>;
  fetchFixtures: (date: string, leagueId?: string | null) => Promise<void>;
  fetchSquad: (teamId: string, side: "home" | "away") => Promise<void>;
  fetchPlayerDetails: (playerId: number, position: 1 | 2, seasonId?: string, leagueId?: string) => Promise<void>;
  showVersus: (player1Id: number, player2Id: number, seasonId?: string, leagueId?: string) => Promise<void>;
  hideVersus: () => void;

  // WS Actions (send messages to server)
  setMainMatch: (matchId: MatchId | null) => void;
  setTickerMatches: (matchIds: MatchId[]) => void;
  setTheme: (themeId: string) => void;
  setOverlayToggles: (toggles: Partial<Toggles>) => void;
  clearMainMatch: () => void;
  clearTicker: () => void;
  resetSession: () => void;
  testEvent: (event: {
    kind: "GOAL" | "YELLOW" | "RED" | "SUB" | "VAR" | "INFO";
    team: "HOME" | "AWAY";
    label?: string;
    player?: string;
    minute?: number;
  }) => void;
  
  // Resolume Actions
  setResolumeConfig: (config: ResolumeConfig) => void;
  updateResolumeZone: (zoneId: string, updates: Partial<ResolumeZone>) => void;
}

// Get today's date in YYYY-MM-DD format
const getTodayDate = () => new Date().toISOString().split("T")[0];

export const useAppStore = create<AppStore>((set, get) => ({
  appState: null,
  connectionStatus: "disconnected",
  availableMatches: [],
  isLoadingMatches: false,

  // Filter state
  selectedDate: getTodayDate(),
  selectedLeagueId: null,
  availableLeagues: [],
  isLoadingLeagues: false,

  // Squad state
  homeSquad: [],
  awaySquad: [],
  isLoadingHomeSquad: false,
  isLoadingAwaySquad: false,

  // Versus state
  versusData: {
    player1: null,
    player2: null,
    visible: false,
  },
  isLoadingVersusPlayer1: false,
  isLoadingVersusPlayer2: false,

  setAppState: (state) => set({ appState: state }),

  setConnectionStatus: (status) => set({ connectionStatus: status }),

  handleServerMessage: (message) => {
    switch (message.type) {
      case "server:hello":
        // Preserve versusData on reconnection - server doesn't store it
        console.log("[Store] server:hello - preserving versusData");
        set((state) => ({ 
          appState: message.payload.state,
          // Keep existing versusData if we have it
          versusData: state.versusData.visible ? state.versusData : state.versusData
        }));
        break;
      case "state:update":
        set({ appState: message.payload.state });
        break;
      case "provider:status": {
        // Update provider info in appState
        const currentState = get().appState;
        if (currentState) {
          set({
            appState: {
              ...currentState,
              provider: {
                name: message.payload.provider,
                status: message.payload.status,
                message: message.payload.message,
                lastSuccessAt: message.payload.lastSuccessAt,
              },
            },
          });
        }
        break;
      }
      case "goal:alert": {
        // Forward goal alert to goalAlertStore
        console.log("[Store] Received goal alert:", message.payload);
        useGoalAlertStore.getState().triggerGoal(message.payload);
        break;
      }
      case "versus:update": {
        // Update versus data from server broadcast
        console.log("[Store] Received versus:update:", JSON.stringify(message.payload, null, 2));
        console.log("[Store] Setting versusData visible:", message.payload.visible);
        set({
          versusData: {
            player1: message.payload.player1 || null,
            player2: message.payload.player2 || null,
            visible: message.payload.visible,
          },
        });
        // Log after set
        setTimeout(() => {
          const state = get();
          console.log("[Store] After set, versusData:", {
            visible: state.versusData.visible,
            hasPlayer1: !!state.versusData.player1,
            hasPlayer2: !!state.versusData.player2
          });
        }, 100);
        break;
      }
      case "error":
        console.error("[Store] Server error:", message.payload);
        break;
    }
  },

  fetchAvailableMatches: async () => {
    set({ isLoadingMatches: true });
    try {
      const res = await fetch(`${API_BASE_URL}/debug/matches`);
      if (res.ok) {
        const data = await res.json();
        set({ availableMatches: data.matches || [] });
      }
    } catch (err) {
      console.error("[Store] Failed to fetch matches:", err);
    } finally {
      set({ isLoadingMatches: false });
    }
  },

  // Filter actions
  setSelectedDate: (date) => set({ selectedDate: date }),

  setSelectedLeagueId: (leagueId) => set({ selectedLeagueId: leagueId }),

  fetchLeaguesForDate: async (date) => {
    set({ isLoadingLeagues: true, availableLeagues: [], selectedLeagueId: null });
    try {
      const res = await fetch(`${API_BASE_URL}/api/leagues?date=${date}`);
      if (res.ok) {
        const data = await res.json();
        set({ availableLeagues: data.leagues || [] });
      }
    } catch (err) {
      console.error("[Store] Failed to fetch leagues:", err);
    } finally {
      set({ isLoadingLeagues: false });
    }
  },

  fetchFixtures: async (date, leagueId) => {
    set({ isLoadingMatches: true });
    try {
      let url = `${API_BASE_URL}/api/fixtures?date=${date}`;
      if (leagueId) {
        url += `&leagueId=${leagueId}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        set({ availableMatches: data.matches || [] });
      }
    } catch (err) {
      console.error("[Store] Failed to fetch fixtures:", err);
    } finally {
      set({ isLoadingMatches: false });
    }
  },

  fetchSquad: async (teamId, side) => {
    if (side === "home") {
      set({ isLoadingHomeSquad: true });
    } else {
      set({ isLoadingAwaySquad: true });
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/squads/teams/${teamId}`);
      if (res.ok) {
        const data = await res.json();
        if (side === "home") {
          set({ homeSquad: data.squad || [] });
        } else {
          set({ awaySquad: data.squad || [] });
        }
      }
    } catch (err) {
      console.error(`[Store] Failed to fetch ${side} squad:`, err);
    } finally {
      if (side === "home") {
        set({ isLoadingHomeSquad: false });
      } else {
        set({ isLoadingAwaySquad: false });
      }
    }
  },

  fetchPlayerDetails: async (playerId, position, seasonId, leagueId) => {
    console.log(`[Store] fetchPlayerDetails: playerId=${playerId}, position=${position}, seasonId=${seasonId}, leagueId=${leagueId}`);
    
    if (position === 1) {
      set({ isLoadingVersusPlayer1: true });
    } else {
      set({ isLoadingVersusPlayer2: true });
    }

    try {
      let url = `${API_BASE_URL}/api/players/${playerId}`;
      const params = [];
      if (seasonId) {
        params.push(`seasonId=${seasonId}`);
      }
      if (leagueId) {
        params.push(`leagueId=${leagueId}`);
      }
      if (params.length > 0) {
        url += `?${params.join('&')}`;
      }
      
      console.log(`[Store] Fetching player from: ${url}`);
      const res = await fetch(url);
      
      if (res.ok) {
        const playerData: PlayerDetails = await res.json();
        console.log(`[Store] Received player ${position}:`, playerData);
        
        set((state) => ({
          versusData: {
            ...state.versusData,
            [position === 1 ? 'player1' : 'player2']: playerData,
          }
        }));
      } else {
        console.error(`[Store] Failed to fetch player ${playerId}: ${res.status} ${res.statusText}`);
      }
    } catch (err) {
      console.error(`[Store] Failed to fetch player ${playerId}:`, err);
    } finally {
      if (position === 1) {
        set({ isLoadingVersusPlayer1: false });
      } else {
        set({ isLoadingVersusPlayer2: false });
      }
    }
  },

  showVersus: async (player1Id, player2Id, seasonId, leagueId) => {
    console.log('[Store] showVersus called:', { player1Id, player2Id, seasonId, leagueId });
    
    // Fetch both players in parallel
    const promises = [
      get().fetchPlayerDetails(player1Id, 1, seasonId, leagueId),
      get().fetchPlayerDetails(player2Id, 2, seasonId, leagueId),
    ];
    
    await Promise.all(promises);
    
    // Get the fetched player data
    const state = get();
    const { player1, player2 } = state.versusData;
    
    console.log('[Store] showVersus - Fetched players:', { 
      player1: player1?.name, 
      player2: player2?.name,
      hasPlayer1: !!player1,
      hasPlayer2: !!player2
    });
    
    if (!player1 || !player2) {
      console.error('[Store] Failed to load player data', { player1, player2 });
      alert('Failed to load player data. Check console for errors.');
      return;
    }
    
    // Set visible and broadcast to overlays
    set((state) => ({
      versusData: { ...state.versusData, visible: true }
    }));
    
    // Send WebSocket message to overlays with versus data
    console.log('[Store] Sending admin:showVersus via WebSocket', { 
      player1Name: player1.name,
      player2Name: player2.name
    });
    const ws = getWsClient();
    const message = env("admin:showVersus", { player1, player2 });
    console.log('[Store] WebSocket message:', message);
    ws.send(message);
  },

  hideVersus: () => {
    set((state) => ({
      versusData: { ...state.versusData, visible: false }
    }));
    
    // Send WebSocket message to hide versus
    const ws = getWsClient();
    ws.send(env("admin:hideVersus", {}));
  },

  // WS Actions
  setMainMatch: (matchId) => {
    const ws = getWsClient();
    ws.send(env("admin:setMainMatch", { matchId }));
  },

  setTickerMatches: (matchIds) => {
    const ws = getWsClient();
    ws.send(env("admin:setTickerMatches", { matchIds }));
  },

  setTheme: (themeId) => {
    const ws = getWsClient();
    ws.send(env("admin:setTheme", { themeId }));
  },

  setOverlayToggles: (toggles) => {
    const ws = getWsClient();
    ws.send(env("admin:setOverlayToggles", { toggles }));
  },

  clearMainMatch: () => {
    const ws = getWsClient();
    ws.send(env("admin:clearMainMatch", {}));
  },

  clearTicker: () => {
    const ws = getWsClient();
    ws.send(env("admin:clearTicker", {}));
  },

  resetSession: () => {
    const ws = getWsClient();
    ws.send(env("admin:resetSession", {}));
  },

  testEvent: (event) => {
    const ws = getWsClient();
    const matchId = get().appState?.selection.mainMatchId;
    ws.send(env("admin:testEvent", { matchId: matchId || undefined, event }));
  },
  
  // Resolume Actions
  setResolumeConfig: (config) => {
    const ws = getWsClient();
    ws.send(env("admin:setResolumeConfig", { config }));
  },
  
  updateResolumeZone: (zoneId, updates) => {
    const ws = getWsClient();
    ws.send(env("admin:updateResolumeZone", { zoneId, updates }));
  },
}));
