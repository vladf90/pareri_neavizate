// Shared Internal Models (client + server)
// v1 - schemaVersion: 1

export type MatchId = string;
export type TeamId = string;
export type PlayerId = string;
export type CompetitionId = string;

export type TeamSide = "HOME" | "AWAY";

export type MatchStatus =
  | "NS" // not started
  | "LIVE"
  | "HT"
  | "FT"
  | "AET"
  | "PEN"
  | "SUSP"
  | "POST"
  | "CANC"
  | "ABD";

export type ClockPhase = "PRE" | "1H" | "HT" | "2H" | "ET1" | "ETHT" | "ET2" | "PEN" | "FT";

export type ProviderName = "sportmonks" | "mock";
export type ProviderStatus = "ok" | "degraded" | "down";

export type OverlayFormat = "16x9" | "9x16";

export interface Competition {
  id: CompetitionId;
  name: string;
  shortName?: string;
  country?: string;
  logoUrl?: string;
  season?: { id: string; name?: string };
}

export interface Round {
  id: string;
  name: string;      // e.g., "8" or "Quarter-Final"
  finished?: boolean;
}

export interface Team {
  id: TeamId;
  name: string;
  shortName: string;
  crestUrl?: string;
  colors?: { primary?: string; secondary?: string };
}

export interface Venue {
  name?: string;
  city?: string;
  country?: string;
  imageUrl?: string;
}

export interface WeatherReport {
  temperature: number;       // °C (evening temperature for match time)
  feelsLike?: number;        // °C feels like
  condition: string;         // "clear sky", "overcast clouds", "rain", etc.
  icon?: string;             // URL to weather icon
  wind?: {
    speed: number;           // km/h
    direction?: number;      // degrees (0-360)
  };
  humidity?: number;         // percentage (0-100)
  clouds?: number;           // percentage (0-100)
}

export interface Referee {
  id: string;
  name: string;
  type?: string; // "referee", "assistant", "fourth_official", "var"
}

export interface Score {
  home: number;
  away: number;
}

export interface PenaltyScore {
  home: number;
  away: number;
}

export interface MatchClock {
  phase: ClockPhase;
  minute: number;
  seconds?: number;       // Seconds within minute (0-59) for interpolation
  started?: number;       // Unix timestamp when period started (for client interpolation)
  ticking?: boolean;      // Whether the clock is currently running
  addedMinute?: number;
  display: string; // ex: "45+3", "12", "HT"
  isLive: boolean;
  lastUpdatedAt: number; // unix ms
}

export interface Match {
  id: MatchId;
  competition: Competition;
  round?: Round;      // Etapa/Runda (e.g., "Etapa 8" or "Quarter-Final")
  startTime: number; // unix ms
  status: MatchStatus;
  venue?: Venue;

  homeTeam: Team;
  awayTeam: Team;

  score: Score;
  penalties?: PenaltyScore;
  clock: MatchClock;
  referees?: Referee[];
  weather?: WeatherReport;

  lastChangedAt: number; // unix ms (useful for de-dupe / UI)
}

export type EventKind =
  | "GOAL"
  | "OWN_GOAL"
  | "PENALTY_GOAL"
  | "MISS_PEN"
  | "PENALTY_SHOOTOUT_GOAL"
  | "PENALTY_SHOOTOUT_MISS"
  | "YELLOW"
  | "RED"
  | "SECOND_YELLOW"
  | "SUB"
  | "VAR"
  | "INFO";

export interface MatchEvent {
  id: string;
  matchId: MatchId;
  kind: EventKind;
  teamSide: TeamSide;

  minute: number;
  addedMinute?: number;
  displayMinute: string;

  timestamp?: number; // unix ms if available
  player?: { id?: PlayerId; name: string };
  assist?: { id?: PlayerId; name: string };
  replacedPlayer?: { id?: PlayerId; name: string };

  detail?: string;
  scoreAfter?: Score;
  
  // VAR related flags
  isVarPending?: boolean; // True if event is pending VAR decision
  isRescinded?: boolean;  // True if event was rescinded/cancelled
  
  // Extra details from SportMonks
  info?: string;          // "Right foot shot", "Header", "Foul", etc.
  addition?: string;      // "1st Goal", "Goal disallowed", "1st Substitution", etc.
  subTypeId?: number;     // SportMonks sub_type_id for more specific categorization
  result?: string;        // Score after event, e.g., "1-0", "2-1"
}

export type PositionCode = "GK" | "DF" | "MF" | "FW";

export interface LineupPlayer {
  id?: PlayerId;
  name: string;
  number?: number;
  position?: PositionCode;
  role?: "STARTER" | "SUB" | "BENCH";
  photoUrl?: string;

  // Formation position (1-11) - indicates exact spot in tactical formation
  formationPosition?: number;
  
  // Formation field position from API, e.g., "2:3" means row 2, column 3
  formationField?: string;

  // Pitch layout coordinates, 0..100 (optional)
  x?: number;
  y?: number;
}

export interface TeamLineup {
  teamSide: TeamSide;
  teamName?: string; // Added for widget display
  formation?: string;
  manager?: string; // Coach/Manager name
  form?: string[]; // Recent results: ["W", "W", "D", "L", "W"]
  startingXI: LineupPlayer[];
  bench?: LineupPlayer[];
}

export interface MatchLineups {
  matchId: MatchId;
  home: TeamLineup;
  away: TeamLineup;
  lastUpdatedAt: number;
}

export type StatsKey =
  | "possession"
  | "shots_total"
  | "shots_on_target"
  | "corners"
  | "fouls"
  | "xg"
  | "passes"
  | "passes_accuracy";

export interface MatchStats {
  matchId: MatchId;
  home: Partial<Record<StatsKey, number>>;
  away: Partial<Record<StatsKey, number>>;
  lastUpdatedAt: number;
}

/**
 * GFX Toggle Keys - all available broadcast graphics
 * Stream Deck / API can control these
 */
export type GfxKey =
  // Master Overlay Elements
  | "showMasterScoreboard"
  | "showMasterLineupsHome"
  | "showMasterLineupsAway"
  | "showMasterTicker"
  | "showMasterSocials"
  | "showMasterBranding"
  | "showMasterLiveStandings"
  | "showMasterStats"
  // Standalone Overlays
  | "showStandings"
  | "showLiveStandings"
  | "showH2H"
  | "showTopScorers"
  | "showStats"
  | "showForm"
  | "showStartingSoon";

export interface Toggles extends Partial<Record<GfxKey, boolean>> {
  [key: string]: boolean | undefined;
}

export interface ProviderInfo {
  name: ProviderName;
  status: ProviderStatus;
  message?: string;
  lastSuccessAt?: number;
}

export interface SelectionState {
  mainMatchId: MatchId | null;
  tickerMatchIds: MatchId[];
  themeId: string;
  toggles: Toggles;
}

export interface AppDataState {
  mainMatch?: Match;
  tickerMatches: Match[];
  events: MatchEvent[];
  lineups?: MatchLineups;
  stats?: MatchStats;
}

export interface AppState {
  schemaVersion: 1;
  updatedAt: number;

  provider: ProviderInfo;
  selection: SelectionState;
  data: AppDataState;
  
  // Resolume multi-display configuration
  resolume?: ResolumeConfig;

  ui: {
    operatorNotes?: string;
  };
}

// Default toggles (server can use)
export const DEFAULT_TOGGLES: Toggles = {
  // Master Overlay controls
  showMasterScoreboard: true,
  showMasterLineupsHome: false,
  showMasterLineupsAway: false,
  showMasterTicker: true,
  showMasterSocials: true,
  showMasterBranding: true,
  showMasterLiveStandings: false,
  showMasterStats: false,
  // Standalone Overlays (off by default)
  showStandings: false,
  showLiveStandings: false,
  showH2H: false,
  showTopScorers: false,
  showStats: false,
  showForm: false,
  showStartingSoon: false,
};

/**
 * DEFAULT RESOLUME CONFIG
 * 5400x1920 canvas with 5 vertical zones (1080x1920 each)
 * TV layout: 5 vertical displays side by side
 */
export const DEFAULT_RESOLUME_CONFIG: ResolumeConfig = {
  canvasWidth: 5400,
  canvasHeight: 1920,
  backgroundColor: "transparent",
  zones: [
    // Zone 1 - Left section (TV1 area)
    {
      id: "zone-1",
      name: "Zone 1",
      widgetType: "none",
      x: 0,
      y: 0,
      width: 1080,
      height: 1920,
      scale: 1,
      visible: true,
      config: { widgetWidth: 1080, widgetHeight: 1920 },
    },
    // Zone 2 - Center-left (TV2 area)
    {
      id: "zone-2",
      name: "Zone 2",
      widgetType: "none",
      x: 1080,
      y: 0,
      width: 1080,
      height: 1920,
      scale: 1,
      visible: true,
      config: { widgetWidth: 1080, widgetHeight: 1920 },
    },
    // Zone 3 - Center-right (TV3 area)
    {
      id: "zone-3",
      name: "Zone 3",
      widgetType: "none",
      x: 2160,
      y: 0,
      width: 1080,
      height: 1920,
      scale: 1,
      visible: true,
      config: { widgetWidth: 1080, widgetHeight: 1920 },
    },
    // Zone 4 - Right-left (TV4 area - vertical)
    {
      id: "zone-4",
      name: "Zone 4",
      widgetType: "none",
      x: 3240,
      y: 0,
      width: 1080,
      height: 1920,
      scale: 1,
      visible: true,
      config: { widgetWidth: 1080, widgetHeight: 1920 },
    },
    // Zone 5 - Right-right (TV5 area - vertical)
    {
      id: "zone-5",
      name: "Zone 5",
      widgetType: "none",
      x: 4320,
      y: 0,
      width: 1080,
      height: 1920,
      scale: 1,
      visible: true,
      config: { widgetWidth: 1080, widgetHeight: 1920 },
    },
  ],
  lastUpdatedAt: Date.now(),
};

/**
 * GFX Metadata - describes each GFX element for API/UI
 */
export interface GfxMeta {
  key: GfxKey;
  label: string;
  description: string;
  category: "master" | "standalone" | "effect";
  defaultEnabled: boolean;
}

export const GFX_REGISTRY: GfxMeta[] = [
  // Master Overlay
  { key: "showMasterScoreboard", label: "Scoreboard", description: "Main match scoreboard HUD", category: "master", defaultEnabled: true },
  { key: "showMasterLineupsHome", label: "Lineups Home", description: "Home team lineup panel", category: "master", defaultEnabled: false },
  { key: "showMasterLineupsAway", label: "Lineups Away", description: "Away team lineup panel", category: "master", defaultEnabled: false },
  { key: "showMasterTicker", label: "Live Ticker", description: "Bottom ticker with other matches", category: "master", defaultEnabled: true },
  { key: "showMasterSocials", label: "Socials", description: "Instagram handles rotation", category: "master", defaultEnabled: true },
  { key: "showMasterBranding", label: "Branding", description: "Pareri Neavizate brand popup", category: "master", defaultEnabled: true },
  { key: "showMasterLiveStandings", label: "Master Standings", description: "Live standings in Master Overlay", category: "master", defaultEnabled: false },
  { key: "showMasterStats", label: "Match Stats", description: "Live match statistics panel", category: "master", defaultEnabled: false },
  // Standalone
  { key: "showStandings", label: "Standings", description: "League table overlay", category: "standalone", defaultEnabled: false },
  { key: "showLiveStandings", label: "Live Standings", description: "Live league table with current results", category: "standalone", defaultEnabled: false },
  { key: "showH2H", label: "Head to Head", description: "H2H comparison overlay", category: "standalone", defaultEnabled: false },
  { key: "showTopScorers", label: "Top Scorers", description: "Season top scorers overlay", category: "standalone", defaultEnabled: false },
  { key: "showStats", label: "Match Stats", description: "Live match statistics", category: "standalone", defaultEnabled: false },
  { key: "showForm", label: "Form Guide", description: "Team form comparison", category: "standalone", defaultEnabled: false },
  { key: "showStartingSoon", label: "Starting Soon", description: "Pre-match countdown overlay", category: "standalone", defaultEnabled: false },
];

// ==================== WIDGET MODELS ====================

/**
 * Qualification Zone - derived from API standing rules
 * Used for styling standings rows based on what each position qualifies for
 */
export type QualificationZone = 
  | "champion"           // League champion
  | "promotion"          // Promotion / Direct qualification (e.g., UCL group stage)
  | "promotion_playoff"  // Promotion playoff / Qualification playoff
  | "playoff"            // Playoff spot
  | "relegation_playoff" // Relegation playoff
  | "relegation"         // Relegation / Elimination
  | "none";              // No special consequence

/**
 * STANDINGS - League Table
 */
export interface StandingEntry {
  position: number;
  team: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form?: string[]; // ["W", "W", "D", "L", "W"]
  isLive?: boolean; // highlighted during live match
  positionChange?: number; // +2 = moved up 2 places, -1 = dropped 1 place, 0 = unchanged
  qualificationZone?: QualificationZone; // From API standing rules
  qualificationLabel?: string; // e.g., "Champions League", "Relegation"
}

export interface Standings {
  competitionId: CompetitionId;
  competitionName: string;
  seasonId: string;
  entries: StandingEntry[];
  lastUpdatedAt: number;
}

/**
 * LIVE STANDINGS - Real-time during matches
 */
export interface LiveStandingChange {
  teamId: TeamId;
  previousPosition: number;
  newPosition: number;
  pointsGained?: number;
  timestamp: number;
}

export interface LiveStandings extends Standings {
  changes: LiveStandingChange[];
}

/**
 * RESOLUME MULTI-DISPLAY OVERLAY
 * Configurable zones for multi-TV setups (e.g., 5400x1800 canvas)
 */
export type ResolumeWidgetType = 
  | "none"                  // Empty zone
  | "livestandings"         // Live Standings widget
  | "livestandings-ucl1"    // Live Standings UCL (positions 1-16)
  | "livestandings-ucl2"    // Live Standings UCL (positions 17-32)
  | "versus"                // Versus H2H player comparison
  | "scoreboard"            // Scoreboard widget
  | "ticker"                // Live ticker
  | "custom";               // Custom content (future)

export interface ResolumeZone {
  id: string;
  name: string;
  widgetType: ResolumeWidgetType;
  
  // Position & Size (pixels in canvas)
  x: number;
  y: number;
  width: number;
  height: number;
  
  // Zone Transform (legacy, mainly for zone-level adjustments)
  scale: number;      // 1 = 100%, 0.5 = 50%, etc. - applies to entire zone
  rotation?: number;  // degrees (optional)
  
  // Widget Transform (applies to widget content inside the zone)
  widgetScale?: number;    // 1 = 100%, 0.8 = 80%, etc. - scales the widget
  widgetOffsetX?: number;  // Horizontal offset in pixels (positive = right)
  widgetOffsetY?: number;  // Vertical offset in pixels (positive = down)
  widgetAlignment?: "center" | "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right";
  
  // Multi-zone spanning - if set, this widget spans across multiple zones
  // The bounding box is calculated from all spanned zones
  spanZones?: string[];  // Array of zone IDs to span (e.g. ["zone-4", "zone-5"])
  
  // Visibility
  visible: boolean;
  opacity?: number;   // 0-1
  
  // Widget-specific config (optional)
  config?: Record<string, any>;
}

export interface ResolumeConfig {
  // Canvas dimensions
  canvasWidth: number;
  canvasHeight: number;
  
  // Background
  backgroundColor?: string;
  
  // Zones
  zones: ResolumeZone[];
  
  // Metadata
  lastUpdatedAt: number;
}

/**
 * HEAD TO HEAD - H2H between two teams
 */
export interface H2HMatch {
  id: MatchId;
  date: number; // unix ms
  homeTeam: Team;
  awayTeam: Team;
  homeScore: number;
  awayScore: number;
  venue?: string;
  competition?: string;
  winner: "home" | "away" | "draw";
}

export interface H2HStats {
  team1: Team;
  team2: Team;
  totalMatches: number;
  team1Wins: number;
  team2Wins: number;
  draws: number;
  team1Goals: number;
  team2Goals: number;
  lastMatches: H2HMatch[];
  lastUpdatedAt: number;
}

/**
 * TEAM FORM - Recent results
 */
export type FormResult = "W" | "D" | "L";

export interface FormMatch {
  id: MatchId;
  date: number;
  opponent: Team;
  isHome: boolean;
  goalsFor: number;
  goalsAgainst: number;
  result: FormResult;
  competition?: string;
}

export interface TeamForm {
  team: Team;
  matches: FormMatch[];
  summary: {
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
    form: string; // "WWDLW"
  };
  lastUpdatedAt: number;
}

/**
 * TOP SCORERS - League goal scorers
 */
export interface TopScorer {
  rank: number;
  player: {
    id: PlayerId;
    name: string;
    displayName: string;
    photoUrl?: string;
  };
  team: Team;
  goals: number;
  assists?: number;
  penalties?: number;
  minutesPlayed?: number;
}

export interface TopScorers {
  competitionId: CompetitionId;
  competitionName: string;
  seasonId: string;
  scorers: TopScorer[];
  lastUpdatedAt: number;
}

/**
 * MATCH DETAIL - Extended match info for widgets
 */
export interface MatchDetail {
  match: Match;
  events: MatchEvent[];
  stats?: MatchStats;
  lineups?: MatchLineups;
  h2h?: H2HStats;
  homeForm?: TeamForm;
  awayForm?: TeamForm;
  standings?: Standings;
}

// ==================== VERSUS OVERLAY MODELS ====================

/**
 * PLAYER DETAILS - For Versus overlay comparison
 */
export interface PlayerDetails {
  id: number;
  name: string;
  firstname: string;
  lastname: string;
  photoUrl?: string;
  height?: number;
  weight?: number;
  dateOfBirth?: string;
  nationality?: string;
  position: string;
  marketValue?: {
    value: number;
    currency: string;
  } | null;
  statistics: {
    goals: number;
    assists: number;
    appearances: number;
    minutes: number;
    rating: number | null;
  };
}

/**
 * VERSUS DATA - Player comparison state
 */
export interface VersusData {
  player1: PlayerDetails | null;
  player2: PlayerDetails | null;
  visible: boolean;
}
