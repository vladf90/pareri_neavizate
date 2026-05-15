/**
 * SportMonks API Response Types (minimal for v1)
 * These are internal to the adapter and should NOT be exported to UI
 */

export interface SMParticipant {
  id: number;
  name: string;
  short_code?: string;
  image_path?: string;
  meta?: {
    location?: "home" | "away";
  };
}

export interface SMScore {
  description: string;
  score: {
    participant: string;
    goals: number;
  };
}

export interface SMState {
  id: number;
  state: string;
  name: string;
  short_name: string;
  developer_name: string;
}

export interface SMVenue {
  id: number;
  name?: string;
  city_name?: string;
  country_id?: number;
  image_path?: string;
}

export interface SMWeatherReport {
  id: number;
  fixture_id: number;
  venue_id: number;
  temperature: {
    day: number;
    morning: number;
    evening: number;
    night: number;
  };
  feels_like: {
    day: number;
    morning: number;
    evening: number;
    night: number;
  };
  wind: {
    speed: number;
    direction: number;
  };
  humidity: string;      // e.g., "85%"
  pressure: number;
  clouds: string;        // e.g., "100%"
  description: string;   // e.g., "overcast clouds"
  icon: string;          // URL
  type: "forecast" | "current";
  metric: string;        // "celcius"
  current?: unknown;
}

export interface SMReferee {
  id: number;
  common_name?: string;
  name?: string;
  type?: {
    id: number;
    name: string;
    developer_name: string;
  };
}

export interface SMLeague {
  id: number;
  name: string;
  short_code?: string;
  country_id?: number;
  image_path?: string;
}

export interface SMSeason {
  id: number;
  name: string;
}

export interface SMRound {
  id: number;
  name: string;
  finished?: boolean;
  is_current?: boolean;
  starting_at?: string;
  ending_at?: string;
  games_in_current_week?: boolean;
}

export interface SMFixture {
  id: number;
  sport_id: number;
  league_id: number;
  season_id: number;
  stage_id?: number;
  round_id?: number;
  starting_at: string;
  starting_at_timestamp: number;
  participants?: SMParticipant[];
  scores?: SMScore[];
  state?: SMState;
  venue?: SMVenue;
  league?: SMLeague;
  season?: SMSeason;
  round?: SMRound;
  events?: SMEvent[];
  lineups?: SMLineup[];
  statistics?: SMStatistic[];
  trends?: SMTrend[];
  periods?: SMPeriod[];
  referees?: SMReferee[];
  formations?: SMFormation[];
  coaches?: SMCoach[];
  weatherreport?: SMWeatherReport;
}

export interface SMCoach {
  id: number;
  player_id?: number;
  sport_id?: number;
  country_id?: number;
  nationality_id?: number;
  city_id?: number;
  common_name?: string;
  firstname?: string;
  lastname?: string;
  name?: string;
  display_name?: string;
  image_path?: string;
  height?: number;
  weight?: number;
  date_of_birth?: string;
  gender?: string;
  meta?: {
    participant_id?: number;
  };
}

export interface SMEvent {
  id: number;
  type_id: number;
  participant_id?: number;
  player_id?: number;
  player_name?: string;
  related_player_id?: number;
  related_player_name?: string;
  minute?: number;
  extra_minute?: number;
  addition?: string;
  info?: string;
  result?: string;
  // Extra fields from SportMonks
  sub_type_id?: number;       // Sub-type for more specific categorization
  rescinded?: boolean | null; // True if event was rescinded (e.g., card cancelled)
  injured?: boolean | null;   // True if player was injured
  on_bench?: boolean;         // True if player was on bench
  coach_id?: number | null;   // Coach ID if event involves coach
  section?: string;           // "event" or other section type
  sort_order?: number;        // Order within same minute
}

export interface SMLineup {
  id: number;
  fixture_id: number;
  team_id: number;
  player_id: number;
  player_name: string;
  jersey_number?: number;
  type_id: number; // starter, bench, etc.
  formation_position?: number;
  formation_field?: string; // Position on field, e.g. "1:1" (row:col)
  position_id?: number;
  player?: {
    id: number;
    name: string;
    display_name?: string;
    image_path?: string;
  };
}

export interface SMStatistic {
  id: number;
  fixture_id: number;
  type_id: number;
  participant_id: number;
  data: {
    value: number | string;
  };
  /** Home or away location (available when statistics.type include is used) */
  location?: "home" | "away";
  /** Included type object with developer_name for mapping */
  type?: {
    id: number;
    developer_name: string;
    name: string;
    code?: string;
    model_type?: string;
    stat_group?: string;
  };
}

/**
 * SMTrend - Per-minute statistics from live matches
 * Has participant_id and minute for tracking changes over time
 * Different structure from SMStatistic - needs grouping by type + participant
 */
export interface SMTrend {
  id: number;
  fixture_id: number;
  type_id: number;
  participant_id: number;
  /** The value at this minute */
  value: number | string;
  /** The minute this stat was recorded */
  minute?: number;
  type?: {
    id: number;
    developer_name: string;
    name: string;
    code?: string;
    model_type?: string;
    stat_group?: string;
  };
}

// Statistic Type IDs - comprehensive mapping from SportMonks
export const SM_STATS_TYPE_IDS = {
  BALL_POSSESSION: 42,
  SHOTS_TOTAL: 56,
  SHOTS_ON_TARGET: 85,
  SHOTS_OFF_TARGET: 86,
  CORNERS: 51,
  OFFSIDES: 52,
  FOULS: 57,
  SAVES: 84,
  YELLOWCARDS: 87,
  REDCARDS: 88,
  XG: 1605,
  PASSES: 41,
  PASSES_ACCURATE: 1604,
} as const;

export interface SMPeriod {
  id: number;
  fixture_id: number;
  type_id: number;
  started: number;
  ended: number | null;
  counts_from: number;
  ticking: boolean;
  sort_order: number;
  description: string;
  time_added: number | null;
  period_length: number;
  minutes: number;
  seconds: number;
  has_timer: boolean;
}

export interface SMResponse<T> {
  data: T;
  subscription?: unknown[];
  rate_limit?: {
    resets_in_seconds: number;
    remaining: number;
    requested_entity: string;
  };
  timezone?: string;
}

// ==================== STANDINGS TYPES ====================

export interface SMStandingDetail {
  id: number;
  standing_id: number;
  type_id: number;
  value: number;
}

export interface SMStandingForm {
  id: number;
  fixture_id: number;
  form: "W" | "D" | "L";
}

export interface SMStandingRuleType {
  id: number;
  name: string; // e.g., "Champions League", "Relegation", "Europa League"
  code?: string;
  developer_name?: string;
  model_type?: string;
}

export interface SMStandingRule {
  id: number;
  model_type: string; // "promotion", "relegation", "playoff", "standing", etc.
  position?: number;
  type?: SMStandingRuleType; // Included when using ?include=rule.type
}

export interface SMStandingEntry {
  id: number;
  participant_id: number;
  position: number;
  points: number;
  result?: "up" | "down" | "equal"; // Position change direction
  participant?: SMParticipant;
  details?: SMStandingDetail[];
  form?: SMStandingForm[];
  standing_rule?: SMStandingRule;
  rule?: SMStandingRule; // Some endpoints use 'rule' instead of 'standing_rule'
}

// Sportmonks standing detail type IDs
export const SM_STANDING_TYPE_IDS = {
  PLAYED: 129,
  WON: 130,
  DRAWN: 131,
  LOST: 132,
  GOALS_FOR: 133,
  GOALS_AGAINST: 134,
  GOAL_DIFFERENCE: 179,
} as const;

// ==================== H2H TYPES ====================

export interface SMH2HMatch {
  id: number;
  starting_at: string;
  participants?: SMParticipant[];
  scores?: SMScore[];
  venue?: SMVenue;
  league?: SMLeague;
}

// ==================== TEAM FORM TYPES ====================

export interface SMTeamWithLatest {
  id: number;
  name: string;
  short_code?: string;
  image_path?: string;
  latest?: SMFixture[];
}

// ==================== TOP SCORERS TYPES ====================

export interface SMTopScorer {
  id: number;
  player_id: number;
  type_id: number;
  position: number;
  total: number;
  participant_id: number;
  player?: {
    id: number;
    common_name?: string;
    display_name?: string;
    name?: string;
    image_path?: string;
  };
  participant?: SMParticipant;
}

// Sportmonks top scorer type IDs
export const SM_TOPSCORER_TYPE_IDS = {
  GOALS: 208,
  ASSISTS: 209,
  RED_CARDS: 215,
} as const;

// ==================== LINEUP TYPES (Extended) ====================

export interface SMLineupPlayer {
  id: number;
  sport_id: number;
  fixture_id: number;
  player_id: number;
  team_id: number;
  position_id: number;
  formation_field?: string;
  type_id: number;
  formation_position?: number;
  player_name: string;
  jersey_number?: number;
  player?: {
    id: number;
    common_name?: string;
    display_name?: string;
    name?: string;
    image_path?: string;
  };
}

export interface SMFormation {
  id: number;
  fixture_id: number;
  participant_id: number;
  formation: string;
  location: "home" | "away";
}

// Sportmonks lineup type IDs
export const SM_LINEUP_TYPE_IDS = {
  STARTER: 11,
  BENCH: 12,
} as const;

// Sportmonks position IDs
export const SM_POSITION_IDS = {
  GOALKEEPER: 24,
  DEFENDER: 25,
  MIDFIELDER: 26,
  FORWARD: 27,
} as const;

// ==================== FIXTURE WITH LINEUPS TYPE ====================

export interface SMFixtureWithLineups {
  id: number;
  participants?: SMParticipant[];
  lineups?: SMLineupPlayer[];
  formations?: SMFormation[];
  coaches?: SMCoach[];
}

// ==================== SQUAD TYPES ====================

export interface SMSquadPlayer {
  player_id: number;
  jersey_number: number | null;
  position_id: number;
  detailed_position_id: number;
  player?: {
    id: number;
    display_name?: string;
    common_name?: string;
    image_path?: string;
  };
}

export interface SMSquadResponse {
  data: SMSquadPlayer[] | { data: SMSquadPlayer[] };
}

// ==================== PLAYER DETAIL TYPES ====================

export interface SMPlayerStatisticDetail {
  type_id?: number;
  type?: { id: number };
  value?: number | string;
  total?: number | string;
  data?: { value?: number | string };
}

export interface SMPlayerStatistic {
  season_id: number;
  league_id: number;
  details?: SMPlayerStatisticDetail[] | {
    goals?: { total?: number };
    assists?: { total?: number };
    lineups?: { total?: number };
    minutes?: { total?: number };
    rating?: string | number;
  };
}

export interface SMPlayerData {
  id: number;
  display_name?: string;
  common_name?: string;
  firstname?: string;
  lastname?: string;
  image_path?: string;
  height?: number;
  weight?: number;
  date_of_birth?: string;
  nationality?: string;
  market_value?: number;
  market_value_currency_code?: string;
  position?: { name?: string };
  detailedPosition?: { name?: string };
  statistics?: SMPlayerStatistic[];
}

export interface SMPlayerResponse {
  data: SMPlayerData;
}
