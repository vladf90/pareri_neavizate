import type {
  AppState,
  MatchId,
  Toggles,
  Standings,
  H2HStats,
  TeamForm,
  TopScorers,
  MatchLineups,
  ResolumeConfig,
  ResolumeZone,
} from "./models";

export type SchemaVersion = 1;

export interface WsEnvelope<TType extends string, TPayload> {
  schemaVersion: SchemaVersion;
  type: TType;
  ts: number; // unix ms
  payload: TPayload;
}

// ---- Client -> Server (Admin / Overlay) ----

export type AdminHello = WsEnvelope<
  "admin:hello",
  { role: "admin"; clientId: string; pin?: string }
>;

export type OverlayHello = WsEnvelope<
  "overlay:hello",
  {
    role: "overlay";
    clientId: string;
    overlay:
      | "hud"
      | "ticker"
      | "lineup"
      | "standings"
      | "h2h"
      | "form"
      | "topscorers"
      | "stats"
      | "livestandings"
      | "master"
      | "resolume"
      | "versus";
    format: "16x9" | "9x16" | "custom";
  }
>;

export type AdminSetMainMatch = WsEnvelope<"admin:setMainMatch", { matchId: MatchId | null }>;

export type AdminSetTickerMatches = WsEnvelope<"admin:setTickerMatches", { matchIds: MatchId[] }>;

export type AdminSetTheme = WsEnvelope<"admin:setTheme", { themeId: string }>;

export type AdminSetOverlayToggles = WsEnvelope<
  "admin:setOverlayToggles",
  { toggles: Partial<Toggles> }
>;

export type AdminClearMainMatch = WsEnvelope<"admin:clearMainMatch", Record<string, never>>;

export type AdminClearTicker = WsEnvelope<"admin:clearTicker", Record<string, never>>;

export type AdminResetSession = WsEnvelope<"admin:resetSession", Record<string, never>>;

// Resolume Multi-Display Config
export type AdminSetResolumeConfig = WsEnvelope<
  "admin:setResolumeConfig",
  { config: ResolumeConfig }
>;

export type AdminUpdateResolumeZone = WsEnvelope<
  "admin:updateResolumeZone",
  { zoneId: string; updates: Partial<ResolumeZone> }
>;

export type AdminShowVersus = WsEnvelope<
  "admin:showVersus",
  { 
    player1: {
      id: number;
      name: string;
      firstname: string;
      lastname: string;
      photoUrl?: string;
      position: string;
      marketValue?: { value: number; currency: string } | null;
      statistics: {
        goals: number;
        assists: number;
        appearances: number;
        minutes: number;
        rating: number | null;
      };
    };
    player2: {
      id: number;
      name: string;
      firstname: string;
      lastname: string;
      photoUrl?: string;
      position: string;
      marketValue?: { value: number; currency: string } | null;
      statistics: {
        goals: number;
        assists: number;
        appearances: number;
        minutes: number;
        rating: number | null;
      };
    };
  }
>;

export type AdminHideVersus = WsEnvelope<"admin:hideVersus", Record<string, never>>;

export type AdminTestEvent = WsEnvelope<
  "admin:testEvent",
  {
    matchId?: MatchId;
    event: {
      kind: "GOAL" | "YELLOW" | "RED" | "SUB" | "VAR" | "INFO";
      team: "HOME" | "AWAY";
      label?: string;
      player?: string;
      minute?: number;
    };
  }
>;

// Widget Data Requests (Client -> Server)
export type RequestStandings = WsEnvelope<"widget:requestStandings", { seasonId: string }>;

export type RequestH2H = WsEnvelope<"widget:requestH2H", { team1Id: string; team2Id: string }>;

export type RequestTeamForm = WsEnvelope<"widget:requestTeamForm", { teamId: string }>;

export type RequestTopScorers = WsEnvelope<
  "widget:requestTopScorers",
  { seasonId: string; limit?: number }
>;

export type RequestLineups = WsEnvelope<"widget:requestLineups", { fixtureId: string }>;

export type RequestMatchWidgets = WsEnvelope<"widget:requestMatchWidgets", { matchId: MatchId }>;

export type ClientToServer =
  | AdminHello
  | OverlayHello
  | AdminSetMainMatch
  | AdminSetTickerMatches
  | AdminSetTheme
  | AdminSetOverlayToggles
  | AdminClearMainMatch
  | AdminClearTicker
  | AdminResetSession
  | AdminSetResolumeConfig
  | AdminUpdateResolumeZone
  | AdminShowVersus
  | AdminHideVersus
  | AdminTestEvent
  | RequestStandings
  | RequestH2H
  | RequestTeamForm
  | RequestTopScorers
  | RequestLineups
  | RequestMatchWidgets;

// ---- Server -> Client ----

export type ServerHello = WsEnvelope<"server:hello", { serverTime: number; state: AppState }>;

export type StateUpdate = WsEnvelope<"state:update", { state: AppState }>;

export type ProviderStatusEvent = WsEnvelope<
  "provider:status",
  {
    provider: "sportmonks" | "mock";
    status: "ok" | "degraded" | "down";
    message?: string;
    lastSuccessAt?: number;
  }
>;

export type ServerError = WsEnvelope<
  "error",
  { code: string; message: string; details?: Record<string, unknown> }
>;

// Widget Data Responses (Server -> Client)
export type StandingsUpdate = WsEnvelope<"widget:standings", { standings: Standings }>;

export type H2HUpdate = WsEnvelope<"widget:h2h", { h2h: H2HStats }>;

export type TeamFormUpdate = WsEnvelope<"widget:teamForm", { teamId: string; form: TeamForm }>;

export type TopScorersUpdate = WsEnvelope<"widget:topScorers", { topScorers: TopScorers }>;

export type LineupsUpdate = WsEnvelope<"widget:lineups", { lineups: MatchLineups }>;

// Composite widget data for a match
export type MatchWidgetsUpdate = WsEnvelope<
  "widget:matchWidgets",
  {
    matchId: MatchId;
    standings?: Standings;
    h2h?: H2HStats;
    homeForm?: TeamForm;
    awayForm?: TeamForm;
    topScorers?: TopScorers;
    lineups?: MatchLineups;
  }
>;

export type VersusUpdate = WsEnvelope<
  "versus:update",
  {
    visible: boolean;
    player1?: {
      id: number;
      name: string;
      firstname: string;
      lastname: string;
      photoUrl?: string;
      position: string;
      marketValue?: { value: number; currency: string } | null;
      statistics: {
        goals: number;
        assists: number;
        appearances: number;
        minutes: number;
        rating: number | null;
      };
    };
    player2?: {
      id: number;
      name: string;
      firstname: string;
      lastname: string;
      photoUrl?: string;
      position: string;
      marketValue?: { value: number; currency: string } | null;
      statistics: {
        goals: number;
        assists: number;
        appearances: number;
        minutes: number;
        rating: number | null;
      };
    };
  }
>;

export type TipeeAlert = WsEnvelope<
  "tipee:alert",
  {
    type: "dono" | "member";
    user: string;
    amount?: string;
    tier: 1 | 2 | 3;
    platform?: string;
    message?: string;
  }
>;

// Goal Alert - triggered automatically when a goal event is detected
export interface GoalAlertPayload {
  id: string;
  matchId: MatchId;
  teamName: string;
  teamLogo?: string;
  minute: string;
  newScore: string;
  teamSide: "HOME" | "AWAY";
  playerName?: string;
  isOwnGoal?: boolean;
  isPenalty?: boolean;
  isTickerMatch?: boolean;  // True if goal is from a ticker match (not main match)
}

export type GoalAlertEvent = WsEnvelope<"goal:alert", GoalAlertPayload>;

export type ServerToClient =
  | ServerHello
  | StateUpdate
  | ProviderStatusEvent
  | ServerError
  | StandingsUpdate
  | H2HUpdate
  | TeamFormUpdate
  | TopScorersUpdate
  | LineupsUpdate
  | MatchWidgetsUpdate
  | VersusUpdate
  | TipeeAlert
  | GoalAlertEvent;

// Helpers
export const nowMs = () => Date.now();

export function env<TType extends string, TPayload>(
  type: TType,
  payload: TPayload
): WsEnvelope<TType, TPayload> {
  return { schemaVersion: 1, type, ts: nowMs(), payload };
}
