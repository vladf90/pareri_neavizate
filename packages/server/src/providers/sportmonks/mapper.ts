/**
 * SportMonks -> Internal Model Mapper
 * According to SPORTMONKS-MAPPING.md
 */

import type {
  Match,
  MatchEvent,
  MatchLineups,
  MatchStats,
  Team,
  Competition,
  Round,
  Venue,
  Score,
  MatchClock,
  MatchStatus,
  ClockPhase,
  EventKind,
  TeamSide,
  TeamLineup,
  LineupPlayer,
  PositionCode,
  Referee,
  StatsKey,
  WeatherReport,
  Standings,
  StandingEntry,
  QualificationZone,
} from "@parerineavizate/shared/models";

import type {
  SMFixture,
  SMParticipant,
  SMScore,
  SMState,
  SMEvent,
  SMLineup,
  SMStatistic,
  SMTrend,
  SMReferee,
  SMRound,
  SMWeatherReport,
  SMStandingEntry,
  SMStandingDetail,
} from "./types.js";

import { SM_STANDING_TYPE_IDS } from "./types.js";

// --- State Mapping ---

const STATE_MAP: Record<string, MatchStatus> = {
  NS: "NS", // Not Started
  INPLAY_1ST_HALF: "LIVE",
  INPLAY_2ND_HALF: "LIVE",
  HT: "HT", // Halftime
  FT: "FT", // Full Time
  FT_PEN: "PEN", // Full Time after Penalties
  AET: "AET", // After Extra Time
  BREAK: "HT", // Break
  ET: "LIVE", // Extra Time
  PEN_BREAK: "LIVE", // Penalty Break
  SUSP: "SUSP", // Suspended
  INT: "SUSP", // Interrupted
  POSTP: "POST", // Postponed
  CANC: "CANC", // Cancelled
  ABD: "ABD", // Abandoned
  WO: "FT", // Walkover
  AWARDED: "FT", // Awarded
  LIVE: "LIVE", // Generic live
};

const CLOCK_PHASE_MAP: Record<string, ClockPhase> = {
  NS: "PRE",
  INPLAY_1ST_HALF: "1H",
  HT: "HT",
  INPLAY_2ND_HALF: "2H",
  ET: "ET1",
  BREAK: "HT",
  FT: "FT",
  AET: "FT",
  FT_PEN: "FT",
  PEN_BREAK: "PEN",
};

// --- Event Type Mapping ---

// SportMonks event type IDs
// Reference: https://api.sportmonks.com/v3/core/types (model_type: "event")
const EVENT_TYPE_MAP: Record<number, EventKind> = {
  10: "VAR",                    // VAR Decision
  14: "GOAL",                   // Goal
  15: "OWN_GOAL",               // Own Goal
  16: "PENALTY_GOAL",           // Penalty (scored)
  17: "MISS_PEN",               // Missed Penalty
  18: "SUB",                    // Substitution
  19: "YELLOW",                 // Yellow Card
  20: "RED",                    // Red Card
  21: "SECOND_YELLOW",          // Second Yellow -> Red
  22: "PENALTY_SHOOTOUT_MISS",  // Penalty Shootout Miss
  23: "PENALTY_SHOOTOUT_GOAL",  // Penalty Shootout Goal
};

// --- Position Mapping ---

const POSITION_MAP: Record<number, PositionCode> = {
  24: "GK",
  25: "DF",
  26: "MF",
  27: "FW",
};

// --- Mapper Functions ---

export function mapTeam(participant: SMParticipant, side: TeamSide): Team {
  return {
    id: String(participant.id),
    name: participant.name,
    shortName: participant.short_code || participant.name.slice(0, 3).toUpperCase(),
    crestUrl: participant.image_path,
  };
}

export function mapCompetition(fixture: SMFixture): Competition {
  return {
    id: String(fixture.league_id),
    name: fixture.league?.name || "Unknown League",
    shortName: fixture.league?.short_code,
    logoUrl: fixture.league?.image_path,
    season: fixture.season
      ? { id: String(fixture.season.id), name: fixture.season.name }
      : undefined,
  };
}

export function mapVenue(venue?: SMFixture["venue"]): Venue | undefined {
  if (!venue) return undefined;
  return {
    name: venue.name,
    city: venue.city_name,
    imageUrl: venue.image_path,
  };
}

export function mapWeather(weather?: SMWeatherReport): WeatherReport | undefined {
  if (!weather) return undefined;
  
  // Use evening temperature as default (most matches are in evening)
  const temperature = weather.temperature?.evening ?? weather.temperature?.day ?? 0;
  const feelsLike = weather.feels_like?.evening ?? weather.feels_like?.day;
  
  // Parse humidity (e.g., "85%" -> 85)
  const humidityNum = weather.humidity ? parseInt(weather.humidity.replace('%', ''), 10) : undefined;
  
  // Parse clouds (e.g., "100%" -> 100)
  const cloudsNum = weather.clouds ? parseInt(weather.clouds.replace('%', ''), 10) : undefined;
  
  // Convert wind speed from m/s to km/h (SportMonks uses m/s)
  // 1 m/s = 3.6 km/h
  const windSpeedKmh = weather.wind?.speed ? Math.round(weather.wind.speed * 3.6) : undefined;
  
  return {
    temperature: Math.round(temperature),
    feelsLike: feelsLike !== undefined ? Math.round(feelsLike) : undefined,
    condition: weather.description || "Unknown",
    icon: weather.icon,
    wind: windSpeedKmh !== undefined ? {
      speed: windSpeedKmh,
      direction: weather.wind?.direction,
    } : undefined,
    humidity: humidityNum,
    clouds: cloudsNum,
  };
}

export function mapRound(round?: SMRound): Round | undefined {
  if (!round) return undefined;
  return {
    id: String(round.id),
    name: round.name,
    finished: round.finished,
  };
}

export function mapReferees(referees?: SMReferee[]): Referee[] | undefined {
  if (!referees || referees.length === 0) return undefined;
  
  // Sort: main referee first, then assistants
  const sorted = [...referees].sort((a, b) => {
    const aType = a.type?.developer_name?.toLowerCase() || "";
    const bType = b.type?.developer_name?.toLowerCase() || "";
    if (aType.includes("main") || aType === "referee") return -1;
    if (bType.includes("main") || bType === "referee") return 1;
    return 0;
  });
  
  return sorted.map((ref) => ({
    id: String(ref.id),
    name: ref.common_name || ref.name || "Unknown",
    type: ref.type?.developer_name?.toLowerCase(),
  }));
}

export function mapScore(scores?: SMScore[]): Score {
  if (!scores || scores.length === 0) {
    return { home: 0, away: 0 };
  }

  let home = 0;
  let away = 0;

  // Priority 1: Look for "CURRENT" score (most accurate for live/finished matches)
  for (const scoreItem of scores) {
    if (scoreItem.description === "CURRENT") {
      if (scoreItem.score.participant === "home") {
        home = scoreItem.score.goals;
      } else if (scoreItem.score.participant === "away") {
        away = scoreItem.score.goals;
      }
    }
  }

  // If we found CURRENT scores, return them
  if (home > 0 || away > 0) {
    return { home, away };
  }

  // Priority 2: Look for "2ND_HALF" (cumulative score at end of 2nd half)
  for (const scoreItem of scores) {
    if (scoreItem.description === "2ND_HALF") {
      if (scoreItem.score.participant === "home") {
        home = scoreItem.score.goals;
      } else if (scoreItem.score.participant === "away") {
        away = scoreItem.score.goals;
      }
    }
  }

  // If we found 2ND_HALF scores, return them
  if (home > 0 || away > 0) {
    return { home, away };
  }

  // Priority 3: Look for "1ST_HALF" only if match is still in first half
  for (const scoreItem of scores) {
    if (scoreItem.description === "1ST_HALF") {
      if (scoreItem.score.participant === "home") {
        home = scoreItem.score.goals;
      } else if (scoreItem.score.participant === "away") {
        away = scoreItem.score.goals;
      }
    }
  }

  return { home, away };
}

export function mapClock(state?: SMState, fixture?: SMFixture): MatchClock {
  const stateName = state?.developer_name || state?.short_name || "NS";
  const phase = CLOCK_PHASE_MAP[stateName] || "PRE";
  const isLive = stateName.startsWith("INPLAY") || stateName === "ET" || stateName === "LIVE";

  // Get minute from periods (most accurate) or calculate from start time
  let minute = 0;
  let seconds = 0;
  let started: number | undefined;
  let ticking = false;
  let addedTime: number | undefined;

  if (fixture?.periods && fixture.periods.length > 0) {
    // Find the current active period (ticking=true) or latest period
    const activePeriod =
      fixture.periods.find((p) => p.ticking) ||
      fixture.periods.sort((a, b) => b.sort_order - a.sort_order)[0];

    if (activePeriod) {
      minute = activePeriod.minutes;
      seconds = activePeriod.seconds || 0;
      started = activePeriod.started;
      ticking = activePeriod.ticking;
      if (activePeriod.time_added && activePeriod.time_added > 0) {
        addedTime = activePeriod.time_added;
      }
    }
  } else if (isLive && fixture?.starting_at_timestamp) {
    // Fallback: calculate from start time (less accurate)
    const elapsed = Math.floor((Date.now() / 1000 - fixture.starting_at_timestamp) / 60);
    minute = Math.max(0, Math.min(elapsed, 130));

    // Adjust for halftime break
    if (phase === "2H" && minute > 45) {
      minute = Math.min(minute - 15, 90); // 15 min halftime break
    }
  }

  // Handle halftime, fulltime, etc.
  let display = String(minute);
  if (phase === "HT") {
    display = "HT";
    minute = 45;
  } else if (phase === "FT") {
    display = "FT";
    minute = 90;
  } else if (phase === "PRE") {
    display = "-";
    minute = 0;
  } else if (addedTime) {
    // Show added time: "45+2"
    const baseMinute = phase === "1H" ? 45 : 90;
    display = `${baseMinute}+${addedTime}`;
  }

  return {
    phase,
    minute,
    seconds,
    started,
    ticking,
    addedMinute: addedTime,
    display,
    isLive,
    lastUpdatedAt: Date.now(),
  };
}

export function mapMatch(fixture: SMFixture): Match | null {
  const participants = fixture.participants || [];

  // Find home and away teams
  const homeParticipant = participants.find((p) => p.meta?.location === "home");
  const awayParticipant = participants.find((p) => p.meta?.location === "away");

  if (!homeParticipant || !awayParticipant) {
    console.warn(`[Mapper] Cannot find home/away teams for fixture ${fixture.id}`);
    return null;
  }

  const stateName = fixture.state?.developer_name || fixture.state?.short_name || "NS";
  const status: MatchStatus = STATE_MAP[stateName] || "NS";

  return {
    id: String(fixture.id),
    competition: mapCompetition(fixture),
    round: mapRound(fixture.round),
    startTime: fixture.starting_at_timestamp * 1000, // Convert to ms
    status,
    venue: mapVenue(fixture.venue),
    homeTeam: mapTeam(homeParticipant, "HOME"),
    awayTeam: mapTeam(awayParticipant, "AWAY"),
    score: mapScore(fixture.scores),
    clock: mapClock(fixture.state, fixture),
    referees: mapReferees(fixture.referees),
    weather: mapWeather(fixture.weatherreport),
    lastChangedAt: Date.now(),
  };
}

export function mapEvent(event: SMEvent, matchId: string, fixture: SMFixture): MatchEvent | null {
  let kind = EVENT_TYPE_MAP[event.type_id];
  if (!kind) {
    // Unknown event type, skip
    return null;
  }

  // Check for VAR-related events via addition field
  const additionLower = event.addition?.toLowerCase() || '';
  const isVarPending = additionLower.includes('pending var');
  const isDisallowed = additionLower.includes('disallowed') || additionLower.includes('anulat');
  const isRescinded = event.rescinded === true;
  
  // If goal is disallowed or rescinded, don't emit it as a GOAL event
  if ((isDisallowed || isRescinded) && (kind === 'GOAL' || kind === 'PENALTY_GOAL' || kind === 'OWN_GOAL')) {
    // Return null - disallowed goals shouldn't trigger goal animation
    return null;
  }

  // Determine team side
  let teamSide: TeamSide = "HOME";
  if (event.participant_id && fixture.participants) {
    const participant = fixture.participants.find((p) => p.id === event.participant_id);
    if (participant?.meta?.location === "away") {
      teamSide = "AWAY";
    }
  }

  const minute = event.minute || 0;
  const addedMinute = event.extra_minute;
  const displayMinute = addedMinute ? `${minute}+${addedMinute}` : String(minute);

  // For GOAL events, related_player is the ASSIST
  // For SUB events, player is IN, related_player is OUT
  const isGoalEvent = kind === 'GOAL' || kind === 'PENALTY_GOAL' || kind === 'OWN_GOAL' || 
                      kind === 'PENALTY_SHOOTOUT_GOAL';
  const isSubEvent = kind === 'SUB';

  // Parse result to scoreAfter if available (e.g., "1-0" -> { home: 1, away: 0 })
  let scoreAfter: { home: number; away: number } | undefined;
  if (event.result) {
    const parts = event.result.split('-');
    if (parts.length === 2) {
      scoreAfter = {
        home: parseInt(parts[0], 10) || 0,
        away: parseInt(parts[1], 10) || 0,
      };
    }
  }

  return {
    id: `sm_${event.id}`,
    matchId,
    kind,
    teamSide,
    minute,
    addedMinute,
    displayMinute,
    
    // Player who performed the action
    player: event.player_name
      ? { id: event.player_id ? String(event.player_id) : undefined, name: event.player_name }
      : undefined,
    
    // For goals: assist provider. For subs: player going OUT
    assist: isGoalEvent && event.related_player_name
      ? { id: event.related_player_id ? String(event.related_player_id) : undefined, name: event.related_player_name }
      : undefined,
    
    // For subs: player going OUT (same as related_player)
    replacedPlayer: isSubEvent && event.related_player_name
      ? { id: event.related_player_id ? String(event.related_player_id) : undefined, name: event.related_player_name }
      : undefined,
    
    // Legacy field for backward compatibility
    detail: event.info || event.addition,
    
    // Score after this event (for goals)
    scoreAfter,
    
    // VAR flags
    isVarPending,
    isRescinded,
    
    // All extra details from SportMonks for future use
    info: event.info || undefined,           // "Right foot shot", "Header", "Foul", etc.
    addition: event.addition || undefined,   // "1st Goal", "Goal disallowed", "1st Substitution", etc.
    subTypeId: event.sub_type_id || undefined, // Sub-type ID for more specific categorization
    result: event.result || undefined,       // Score string, e.g., "1-0"
  };
}

export function mapEvents(fixture: SMFixture): MatchEvent[] {
  if (!fixture.events) return [];

  const events: MatchEvent[] = [];
  const matchId = String(fixture.id);

  for (const smEvent of fixture.events) {
    const mapped = mapEvent(smEvent, matchId, fixture);
    if (mapped) {
      events.push(mapped);
    }
  }

  // Sort by minute
  events.sort((a, b) => {
    if (a.minute !== b.minute) return a.minute - b.minute;
    return (a.addedMinute || 0) - (b.addedMinute || 0);
  });

  return events;
}

export function mapLineups(fixture: SMFixture): MatchLineups | null {
  if (!fixture.lineups || fixture.lineups.length === 0) {
    return null;
  }

  const matchId = String(fixture.id);
  const participants = fixture.participants || [];

  // Find team IDs
  const homeTeam = participants.find((p) => p.meta?.location === "home");
  const awayTeam = participants.find((p) => p.meta?.location === "away");

  if (!homeTeam || !awayTeam) {
    return null;
  }

  // Get formations if available
  const formations = fixture.formations || [];
  const homeFormation = formations.find((f) => f.participant_id === homeTeam.id);
  const awayFormation = formations.find((f) => f.participant_id === awayTeam.id);

  // Get coaches if available
  const coaches = fixture.coaches || [];
  const homeCoach = coaches.find((c) => c.meta?.participant_id === homeTeam.id);
  const awayCoach = coaches.find((c) => c.meta?.participant_id === awayTeam.id);

  const mapLineupPlayer = (lineup: SMLineup): LineupPlayer => ({
    id: lineup.player_id ? String(lineup.player_id) : undefined,
    name: lineup.player?.display_name || lineup.player?.name || lineup.player_name,
    number: lineup.jersey_number,
    position: lineup.position_id ? POSITION_MAP[lineup.position_id] : undefined,
    role: lineup.type_id === 11 ? "STARTER" : "BENCH",
    formationPosition: lineup.formation_position,
    formationField: lineup.formation_field,
    photoUrl: lineup.player?.image_path,
  });

  const homeLineups = fixture.lineups.filter((l) => l.team_id === homeTeam.id);
  const awayLineups = fixture.lineups.filter((l) => l.team_id === awayTeam.id);

  const homeStarters = homeLineups.filter((l) => l.type_id === 11).map(mapLineupPlayer);
  const homeBench = homeLineups.filter((l) => l.type_id !== 11).map(mapLineupPlayer);
  const awayStarters = awayLineups.filter((l) => l.type_id === 11).map(mapLineupPlayer);
  const awayBench = awayLineups.filter((l) => l.type_id !== 11).map(mapLineupPlayer);

  return {
    matchId,
    home: {
      teamSide: "HOME",
      teamName: homeTeam.name,
      formation: homeFormation?.formation || undefined,
      manager: homeCoach?.common_name || homeCoach?.display_name || homeCoach?.name || undefined,
      startingXI: homeStarters,
      bench: homeBench,
    },
    away: {
      teamSide: "AWAY",
      teamName: awayTeam.name,
      formation: awayFormation?.formation || undefined,
      manager: awayCoach?.common_name || awayCoach?.display_name || awayCoach?.name || undefined,
      startingXI: awayStarters,
      bench: awayBench,
    },
    lastUpdatedAt: Date.now(),
  };
}

// Statistic developer_name to internal StatsKey mapping
// Maps SportMonks API developer_name values to our internal stat keys
// Reference: https://docs.sportmonks.com/football/api-references/statistic-type-ids
const STAT_NAME_MAP: Record<string, string> = {
  // Possession
  "BALL_POSSESSION": "possession",
  
  // Shots
  "SHOTS_TOTAL": "shots_total",
  "TOTAL_SHOTS": "shots_total",
  "SHOTS_ON_TARGET": "shots_on_target",
  "SHOTS_ONGOAL": "shots_on_target",
  "SHOTS_OFF_TARGET": "shots_off_target",
  "SHOTS_OFFGOAL": "shots_off_target",
  "SHOTS_BLOCKED": "shots_blocked",
  
  // Set pieces
  "CORNERS": "corners",
  "OFFSIDES": "offsides",
  "FREE_KICKS": "free_kicks",
  
  // Discipline
  "FOULS": "fouls",
  "YELLOWCARDS": "yellowcards",
  "YELLOW_CARDS": "yellowcards",
  "REDCARDS": "redcards",
  "RED_CARDS": "redcards",
  
  // Goalkeeper
  "SAVES": "saves",
  "GOALKEEPER_SAVES": "saves",
  
  // Expected goals
  "EXPECTED_GOALS": "xg",
  "XG": "xg",
  
  // Passing
  "PASSES": "passes",
  "TOTAL_PASSES": "passes",
  "PASS_ACCURACY": "passes_accuracy",
  "PASSES_ACCURATE": "passes_accuracy",
  "SUCCESSFUL_PASSES_PERCENTAGE": "passes_accuracy",
};

/**
 * Map stats from fixture - supports both trends (live) and statistics (finished)
 * 
 * Priority:
 * 1. TRENDS - for live matches, have per-minute data. Groups by type + participant, keeps latest.
 * 2. STATISTICS - for finished matches, have location field directly.
 * 
 * Based on fixtureStats.dto.js reference implementation.
 */
export function mapStats(fixture: SMFixture): MatchStats | null {
  const matchId = String(fixture.id);
  const home: Partial<Record<StatsKey, number>> = {};
  const away: Partial<Record<StatsKey, number>> = {};
  
  // Get participant IDs for trend processing
  const participants = fixture.participants || [];
  const homeParticipant = participants.find(p => p.meta?.location === "home");
  const awayParticipant = participants.find(p => p.meta?.location === "away");
  const homeId = homeParticipant?.id;
  const awayId = awayParticipant?.id;
  
  // PRIORITY 1: Try trends first (for live matches)
  const trends = fixture.trends;
  if (trends && trends.length > 0 && homeId && awayId) {
    // Group trends by type + participant, keep only latest (highest minute)
    const latestTrends: Record<string, SMTrend> = {};
    
    for (const trend of trends) {
      const typeName = trend.type?.developer_name;
      if (!typeName) continue;
      
      const key = `${typeName}_${trend.participant_id}`;
      const existingMinute = latestTrends[key]?.minute ?? -1;
      const currentMinute = trend.minute ?? 0;
      
      if (!latestTrends[key] || currentMinute > existingMinute) {
        latestTrends[key] = trend;
      }
    }
    
    // Convert to home/away stats
    for (const trend of Object.values(latestTrends)) {
      const typeName = trend.type?.developer_name || "";
      const key = STAT_NAME_MAP[typeName] as StatsKey | undefined;
      if (!key) continue;
      
      const value = typeof trend.value === "number" 
        ? trend.value 
        : parseFloat(String(trend.value)) || 0;
      
      if (trend.participant_id === homeId) {
        home[key] = value;
      } else if (trend.participant_id === awayId) {
        away[key] = value;
      }
    }
    
    if (Object.keys(home).length > 0 || Object.keys(away).length > 0) {
      return { matchId, home, away, lastUpdatedAt: Date.now() };
    }
  }
  
  // PRIORITY 2: Fall back to statistics (for finished matches)
  const statistics = fixture.statistics;
  if (!statistics || statistics.length === 0) {
    return null;
  }
  
  for (const stat of statistics) {
    const typeName = stat.type?.developer_name || "";
    const key = STAT_NAME_MAP[typeName] as StatsKey | undefined;
    
    if (!key) continue;

    const value = typeof stat.data.value === "number"
      ? stat.data.value
      : parseFloat(String(stat.data.value)) || 0;

    // Use location field to determine home/away
    if (stat.location === "home") {
      home[key] = value;
    } else if (stat.location === "away") {
      away[key] = value;
    }
  }

  if (Object.keys(home).length === 0 && Object.keys(away).length === 0) {
    return null;
  }

  return {
    matchId,
    home,
    away,
    lastUpdatedAt: Date.now(),
  };
}

// ==================== STANDINGS MAPPER ====================

/**
 * Extract detail value by type ID from standings details array
 */
function getDetailValue(details: SMStandingDetail[] | undefined, typeId: number): number {
  if (!details) return 0;
  const detail = details.find((d) => d.type_id === typeId);
  return detail?.value ?? 0;
}

/**
 * Map a single standing entry from SportMonks format to internal format
 */
function mapStandingEntry(entry: SMStandingEntry): StandingEntry | null {
  const participant = entry.participant;
  if (!participant) return null;

  const details = entry.details;
  
  // Map form to array of W/D/L strings
  const formArray: string[] = [];
  if (entry.form && Array.isArray(entry.form)) {
    // Entry.form is array of { form: "W"|"D"|"L" } objects
    for (const f of entry.form.slice(0, 5)) {
      if (f.form) formArray.push(f.form);
    }
  }

  // Extract qualification zone from standing rule
  const { zone, label } = mapStandingRule(entry.standing_rule || entry.rule);

  // Map position change from 'result' field
  let positionChange = 0;
  if (entry.result === "up") positionChange = 1;
  else if (entry.result === "down") positionChange = -1;

  return {
    position: entry.position,
    team: {
      id: String(participant.id),
      name: participant.name,
      shortName: participant.short_code || participant.name.slice(0, 3).toUpperCase(),
      crestUrl: participant.image_path,
    },
    played: getDetailValue(details, SM_STANDING_TYPE_IDS.PLAYED),
    won: getDetailValue(details, SM_STANDING_TYPE_IDS.WON),
    drawn: getDetailValue(details, SM_STANDING_TYPE_IDS.DRAWN),
    lost: getDetailValue(details, SM_STANDING_TYPE_IDS.LOST),
    goalsFor: getDetailValue(details, SM_STANDING_TYPE_IDS.GOALS_FOR),
    goalsAgainst: getDetailValue(details, SM_STANDING_TYPE_IDS.GOALS_AGAINST),
    goalDifference: getDetailValue(details, SM_STANDING_TYPE_IDS.GOAL_DIFFERENCE),
    points: entry.points,
    form: formArray.length > 0 ? formArray : undefined,
    positionChange,
    qualificationZone: zone,
    qualificationLabel: label,
  };
}

/**
 * Map standing rule to qualification zone and label
 */
function mapStandingRule(rule: SMStandingEntry["standing_rule"]): { zone: QualificationZone; label?: string } {
  if (!rule) {
    return { zone: "none" };
  }

  const modelType = rule.model_type?.toLowerCase() || "";
  const typeName = rule.type?.name || rule.type?.developer_name || "";
  
  // Determine zone based on model_type
  let zone: QualificationZone = "none";
  
  if (modelType.includes("champion") || modelType === "title") {
    zone = "champion";
  } else if (modelType.includes("promotion") && modelType.includes("playoff")) {
    zone = "promotion_playoff";
  } else if (modelType.includes("promotion") || modelType.includes("qualification")) {
    zone = "promotion";
  } else if (modelType.includes("relegation") && modelType.includes("playoff")) {
    zone = "relegation_playoff";
  } else if (modelType.includes("relegation")) {
    zone = "relegation";
  } else if (modelType.includes("playoff")) {
    zone = "playoff";
  }
  
  // If model_type didn't give us a zone, try the type name
  if (zone === "none" && typeName) {
    const lowerName = typeName.toLowerCase();
    if (lowerName.includes("champions league") || lowerName.includes("ucl")) {
      zone = "promotion";
    } else if (lowerName.includes("europa") || lowerName.includes("uel") || lowerName.includes("conference")) {
      zone = "promotion_playoff";
    } else if (lowerName.includes("playoff")) {
      zone = "playoff";
    } else if (lowerName.includes("relegation")) {
      zone = "relegation";
    }
  }

  return { zone, label: typeName || undefined };
}

/**
 * Map standings response to internal Standings format
 * Works for both static (/standings/seasons) and live (/standings/live/leagues) endpoints
 * 
 * @param standingsData - Array of standing entries from SportMonks
 * @param competitionId - Competition/League ID
 * @param competitionName - Competition/League name
 * @param seasonId - Season ID
 * @param isLive - Whether this is live standings data
 */
export function mapStandings(
  standingsData: SMStandingEntry[] | undefined,
  competitionId: string,
  competitionName: string,
  seasonId: string,
  isLive: boolean = false
): Standings | null {
  if (!standingsData || standingsData.length === 0) {
    return null;
  }

  const entries: StandingEntry[] = [];
  
  for (const entry of standingsData) {
    const mapped = mapStandingEntry(entry);
    if (mapped) {
      // Mark as live if this is live standings
      mapped.isLive = isLive;
      entries.push(mapped);
    }
  }

  // Sort by position
  entries.sort((a, b) => a.position - b.position);

  return {
    competitionId,
    competitionName,
    seasonId,
    entries,
    lastUpdatedAt: Date.now(),
  };
}
