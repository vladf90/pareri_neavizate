/**
 * WidgetDataCache - Intelligent caching for widget data
 *
 * STRATEGY FOR MINIMAL API REQUESTS:
 *
 * For 1 main match + 5-8 ticker matches per hour:
 *
 * 1. LIVE DATA (every 2s from FixtureOrchestrator):
 *    - Match scores, events, stats, lineups via /fixtures/multi
 *    - Single API call for all selected matches
 *
 * 2. STANDINGS (cache 5 minutes):
 *    - Only fetch when season changes or cache expires
 *    - ~12 requests/hour max (via StandingsPoller)
 *
 * 3. H2H (cache 24 hours):
 *    - Fetch once per match pair, cache for the day
 *    - ~1-2 requests/hour
 *
 * 4. TEAM FORM (cache 1 hour):
 *    - Latest results don't change mid-match
 *    - ~2 requests/hour (home + away)
 *
 * 5. TOP SCORERS (cache 10 minutes):
 *    - Updates after goals but not critical
 *    - ~6 requests/hour
 *
 * TOTAL: Much less than legacy system!
 * Well under 3000/hour limit per entity!
 */
import { SportMonksClient } from "../providers/sportmonks/client.js";
import { cacheLogger } from "../utils/logger.js";
import { LRUCache } from "lru-cache";
import type {
  Standings,
  StandingEntry,
  H2HStats,
  H2HMatch,
  TeamForm,
  FormMatch,
  TopScorers,
  TopScorer,
  Team,
  MatchLineups,
  TeamLineup,
  LineupPlayer,
  QualificationZone,
} from "@parerineavizate/shared/models";
import type {
  SMStandingEntry,
  SMStandingDetail,
  SMStandingForm,
  SMH2HMatch,
  SMTeamWithLatest,
  SMTopScorer,
  SMLineupPlayer,
  SMFormation,
  SMParticipant,
  SMScore,
  SMFixture,
  SMFixtureWithLineups,
} from "../providers/sportmonks/types.js";
import {
  SM_STANDING_TYPE_IDS,
  SM_TOPSCORER_TYPE_IDS,
  SM_LINEUP_TYPE_IDS,
  SM_POSITION_IDS,
} from "../providers/sportmonks/types.js";

interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
  expiresAt: number;
  isStale?: boolean;
}

// Cache durations in milliseconds
const CACHE_DURATIONS = {
  standings: 5 * 60 * 1000, // 5 minutes
  liveStandings: 2 * 1000, // 2 seconds (when live) - fast updates for position changes
  h2h: 24 * 60 * 60 * 1000, // 24 hours
  teamForm: 60 * 60 * 1000, // 1 hour
  topScorers: 10 * 60 * 1000, // 10 minutes
  lineups: 5 * 60 * 1000, // 5 minutes (before match starts)
};

// LRU cache limits
const CACHE_LIMITS = {
  standings: 50, // Max 50 seasons
  h2h: 200, // Max 200 team pairs
  teamForm: 100, // Max 100 teams
  topScorers: 50, // Max 50 seasons
  lineups: 100, // Max 100 fixtures
};

export class WidgetDataCache {
  private client: SportMonksClient;

  // LRU Caches with automatic eviction
  private standingsCache: LRUCache<string, CacheEntry<Standings>>;
  private h2hCache: LRUCache<string, CacheEntry<H2HStats>>;
  private teamFormCache: LRUCache<string, CacheEntry<TeamForm>>;
  private topScorersCache: LRUCache<string, CacheEntry<TopScorers>>;
  private lineupsCache: LRUCache<string, CacheEntry<MatchLineups>>;

  // Pre-match standings snapshot - saved once before matches start, used for position change comparison
  // Key: seasonId, Value: standings snapshot with timestamp
  private preMatchStandingsSnapshot: Map<string, { standings: Standings; savedAt: number }> = new Map();
  
  // Duration after which pre-match snapshot expires (4 hours - covers most matchdays)
  private readonly PRE_MATCH_SNAPSHOT_DURATION = 4 * 60 * 60 * 1000;

  // Revalidation tracking to prevent duplicate requests
  private revalidating: Set<string> = new Set();

  constructor(client: SportMonksClient) {
    this.client = client;

    // Initialize LRU caches with TTL and max size
    this.standingsCache = new LRUCache({
      max: CACHE_LIMITS.standings,
      ttl: CACHE_DURATIONS.standings * 2, // Keep stale data longer for fallback
      updateAgeOnGet: true,
    });

    this.h2hCache = new LRUCache({
      max: CACHE_LIMITS.h2h,
      ttl: CACHE_DURATIONS.h2h * 1.5,
      updateAgeOnGet: true,
    });

    this.teamFormCache = new LRUCache({
      max: CACHE_LIMITS.teamForm,
      ttl: CACHE_DURATIONS.teamForm * 2,
      updateAgeOnGet: true,
    });

    this.topScorersCache = new LRUCache({
      max: CACHE_LIMITS.topScorers,
      ttl: CACHE_DURATIONS.topScorers * 2,
      updateAgeOnGet: true,
    });

    this.lineupsCache = new LRUCache({
      max: CACHE_LIMITS.lineups,
      ttl: CACHE_DURATIONS.lineups * 2,
      updateAgeOnGet: true,
    });
  }

  // ==================== STANDINGS ====================

  async getStandings(seasonId: string, forceRefresh = false): Promise<Standings | null> {
    const cacheKey = `standings_${seasonId}`;
    const cached = this.standingsCache.get(cacheKey);

    if (!forceRefresh && cached && Date.now() < cached.expiresAt) {
      cacheLogger.debug({ seasonId }, "Standings cache hit");
      return cached.data;
    }

    try {
      cacheLogger.debug({ seasonId }, "Fetching standings");
      const raw = await this.client.getStandings(seasonId);

      if (!raw?.data) return null;

      const standings = this.transformStandings(raw.data, seasonId);

      this.standingsCache.set(cacheKey, {
        data: standings,
        fetchedAt: Date.now(),
        expiresAt: Date.now() + CACHE_DURATIONS.standings,
      });

      return standings;
    } catch (err) {
      cacheLogger.error({ err, seasonId }, "Error fetching standings");
      // Return cached data if available (even if expired)
      if (cached) {
        cacheLogger.debug({ seasonId }, "Returning stale cached standings");
        return cached.data;
      }
      return null;
    }
  }

  /**
   * Get or create a pre-match standings snapshot for position change calculation.
   * This snapshot is saved once when first requested and remains unchanged for 4 hours.
   * This ensures we compare live standings against the state BEFORE matches started.
   */
  private async getOrCreatePreMatchSnapshot(seasonId: string): Promise<Standings | null> {
    const existing = this.preMatchStandingsSnapshot.get(seasonId);
    const now = Date.now();

    // Return existing snapshot if not expired
    if (existing && (now - existing.savedAt) < this.PRE_MATCH_SNAPSHOT_DURATION) {
      cacheLogger.debug(
        { 
          seasonId, 
          snapshotAgeMinutes: Math.round((now - existing.savedAt) / 60000) 
        }, 
        "Using existing pre-match standings snapshot"
      );
      return existing.standings;
    }

    // Fetch fresh standings and save as snapshot
    try {
      cacheLogger.info({ seasonId }, "Creating new pre-match standings snapshot");
      const raw = await this.client.getStandings(seasonId);

      if (!raw?.data) {
        cacheLogger.warn({ seasonId }, "Could not fetch standings for pre-match snapshot");
        return null;
      }

      const standings = this.transformStandings(raw.data, seasonId);
      
      // Save the snapshot
      this.preMatchStandingsSnapshot.set(seasonId, {
        standings,
        savedAt: now,
      });

      cacheLogger.info(
        { 
          seasonId, 
          entries: standings.entries.length,
          topTeams: standings.entries.slice(0, 5).map(e => ({ pos: e.position, team: e.team.shortName }))
        }, 
        "Pre-match standings snapshot created"
      );

      return standings;
    } catch (err) {
      cacheLogger.error({ err, seasonId }, "Error creating pre-match snapshot");
      // Return existing even if expired as fallback
      return existing?.standings || null;
    }
  }

  /**
   * Clear pre-match snapshot for a season (call this when matchday ends)
   */
  clearPreMatchSnapshot(seasonId: string): void {
    this.preMatchStandingsSnapshot.delete(seasonId);
    cacheLogger.info({ seasonId }, "Pre-match standings snapshot cleared");
  }

  /**
   * Clear all pre-match snapshots (call this on server restart or daily)
   */
  clearAllPreMatchSnapshots(): void {
    this.preMatchStandingsSnapshot.clear();
    cacheLogger.info("All pre-match standings snapshots cleared");
  }

  /**
   * Map standing rule to qualification zone and label
   */
  private mapStandingRuleToZone(rule: SMStandingEntry["standing_rule"]): { zone: QualificationZone; label?: string } {
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
      } else if (lowerName.includes("championship round") || lowerName.includes("championship_round")) {
        // Romanian Superliga: Championship Round = top 6 playoff
        zone = "promotion";
      } else if (lowerName.includes("relegation round") || lowerName.includes("relegation_round")) {
        // Romanian Superliga: Relegation Round = bottom 10 (not actual relegation, but play-out)
        zone = "relegation_playoff";
      } else if (lowerName.includes("playoff")) {
        zone = "playoff";
      } else if (lowerName.includes("relegation")) {
        zone = "relegation";
      }
    }

    return { zone, label: typeName || undefined };
  }

  private transformStandings(rawData: SMStandingEntry[], seasonId: string): Standings {
    // Find the overall standings (not home/away specific)
    const overallStandings = rawData.filter(
      (entry) => entry.standing_rule?.model_type === "standing" || !entry.standing_rule
    );

    const entries: StandingEntry[] = overallStandings.map((entry) => {
      const getDetailValue = (typeId: number): number => {
        const detail = entry.details?.find((d) => d.type_id === typeId);
        return detail?.value ?? 0;
      };
      
      // Extract qualification zone from standing_rule or rule
      const rule = entry.standing_rule || entry.rule;
      const { zone, label } = this.mapStandingRuleToZone(rule);

      return {
        position: entry.position || 0,
        team: {
          id: String(entry.participant?.id || entry.participant_id),
          name: entry.participant?.name || "Unknown",
          shortName:
            entry.participant?.short_code ||
            entry.participant?.name?.substring(0, 3).toUpperCase() ||
            "UNK",
          crestUrl: entry.participant?.image_path,
        },
        played: getDetailValue(SM_STANDING_TYPE_IDS.PLAYED),
        won: getDetailValue(SM_STANDING_TYPE_IDS.WON),
        drawn: getDetailValue(SM_STANDING_TYPE_IDS.DRAWN),
        lost: getDetailValue(SM_STANDING_TYPE_IDS.LOST),
        goalsFor: getDetailValue(SM_STANDING_TYPE_IDS.GOALS_FOR),
        goalsAgainst: getDetailValue(SM_STANDING_TYPE_IDS.GOALS_AGAINST),
        goalDifference: getDetailValue(SM_STANDING_TYPE_IDS.GOAL_DIFFERENCE),
        points: entry.points || 0,
        form: entry.form?.slice(-5).map((f) => f.form) || undefined,
        qualificationZone: zone,
        qualificationLabel: label,
      };
    });

    // Sort by position
    entries.sort((a, b) => a.position - b.position);

    return {
      competitionId: seasonId, // Use seasonId as competitionId since standings don't have league_id
      competitionName: "League", // Will be set from match data
      seasonId,
      entries,
      lastUpdatedAt: Date.now(),
    };
  }

  // ==================== LIVE STANDINGS ====================

  /**
   * Get LIVE standings for a league (updated based on current live match scores)
   * This is different from regular standings - it recalculates positions based on ongoing matches
   * Includes positionChange: how many places each team moved compared to pre-match standings snapshot
   */
  async getLiveStandings(leagueId: string, seasonId?: string, forceRefresh = false): Promise<Standings | null> {
    const cacheKey = `livestandings_${leagueId}`;
    const cached = this.standingsCache.get(cacheKey);

    // Live standings have shorter cache duration (30 seconds)
    if (!forceRefresh && cached && Date.now() < cached.expiresAt) {
      cacheLogger.debug({ leagueId }, "Live standings cache hit");
      return cached.data;
    }

    try {
      cacheLogger.debug({ leagueId }, "Fetching live standings from SportMonks");
      const raw = await this.client.getLiveStandings(leagueId);

      if (!raw?.data || raw.data.length === 0) {
        cacheLogger.debug({ leagueId }, "No live standings data - falling back to regular standings");
        // No live data available - this is normal when no matches are live
        return null;
      }

      const liveStandings = this.transformStandings(raw.data, leagueId);

      // Calculate position changes by comparing with PRE-MATCH SNAPSHOT (not regular standings which updates live)
      if (seasonId) {
        const preMatchSnapshot = await this.getOrCreatePreMatchSnapshot(seasonId);
        if (preMatchSnapshot) {
          // Create a map of teamId -> original position from pre-match snapshot
          const originalPositions = new Map<string, number>();
          for (const entry of preMatchSnapshot.entries) {
            originalPositions.set(entry.team.id, entry.position);
          }

          // Calculate positionChange for each team in live standings
          for (const entry of liveStandings.entries) {
            const originalPos = originalPositions.get(entry.team.id);
            if (originalPos !== undefined) {
              // Positive = moved UP (e.g., from 5th to 3rd = +2)
              // Negative = moved DOWN (e.g., from 3rd to 5th = -2)
              entry.positionChange = originalPos - entry.position;
            } else {
              entry.positionChange = 0;
            }
          }

          cacheLogger.info(
            { 
              leagueId,
              seasonId,
              snapshotAge: Math.round((Date.now() - preMatchSnapshot.lastUpdatedAt) / 60000),
              changedTeams: liveStandings.entries.filter(e => e.positionChange !== 0).length,
              changes: liveStandings.entries
                .filter(e => e.positionChange !== 0)
                .map(e => ({ team: e.team.shortName, change: e.positionChange }))
            },
            "Calculated live position changes from pre-match snapshot"
          );
        }
      }

      this.standingsCache.set(cacheKey, {
        data: liveStandings,
        fetchedAt: Date.now(),
        expiresAt: Date.now() + CACHE_DURATIONS.liveStandings, // 30 seconds
      });

      cacheLogger.info({ leagueId, entries: liveStandings.entries.length }, "Live standings fetched successfully");
      return liveStandings;
    } catch (err) {
      cacheLogger.error({ err, leagueId }, "Error fetching live standings");
      // Return cached data if available (even if expired)
      if (cached) {
        cacheLogger.debug({ leagueId }, "Returning stale cached live standings");
        return cached.data;
      }
      return null;
    }
  }

  // ==================== H2H ====================

  async getH2H(team1Id: string, team2Id: string, forceRefresh = false): Promise<H2HStats | null> {
    // Normalize key (same pair regardless of order)
    const cacheKey = [team1Id, team2Id].sort().join("_");
    const cached = this.h2hCache.get(cacheKey);

    if (!forceRefresh && cached && Date.now() < cached.expiresAt) {
      cacheLogger.debug({ team1Id, team2Id }, "H2H cache hit");
      return cached.data;
    }

    try {
      cacheLogger.debug({ team1Id, team2Id }, "Fetching H2H");
      const raw = await this.client.getH2H(team1Id, team2Id);

      cacheLogger.debug({ team1Id, team2Id, matchCount: raw?.data?.length ?? 0 }, "H2H raw response");

      if (!raw?.data || raw.data.length === 0) {
        cacheLogger.debug({ team1Id, team2Id }, "No H2H matches found");
        return null;
      }

      const h2h = this.transformH2H(raw.data, team1Id, team2Id);

      this.h2hCache.set(cacheKey, {
        data: h2h,
        fetchedAt: Date.now(),
        expiresAt: Date.now() + CACHE_DURATIONS.h2h,
      });

      return h2h;
    } catch (err) {
      cacheLogger.error({ err, team1Id, team2Id }, "Error fetching H2H");
      if (cached) {
        cacheLogger.debug({ team1Id, team2Id }, "Returning stale cached H2H");
        return cached.data;
      }
      return null;
    }
  }

  private transformH2H(rawMatches: SMH2HMatch[], team1Id: string, team2Id: string): H2HStats {
    let team1: Team | null = null;
    let team2: Team | null = null;
    let team1Wins = 0;
    let team2Wins = 0;
    let draws = 0;
    let team1Goals = 0;
    let team2Goals = 0;

    const getScore = (scores: SMScore[] | undefined, participant: "home" | "away"): number => {
      const score = scores?.find(
        (s) => s.description === "CURRENT" && s.score?.participant === participant
      );
      return score?.score?.goals ?? 0;
    };

    const matches: H2HMatch[] = rawMatches.slice(0, 10).map((m) => {
      const homeTeam = m.participants?.find((p) => p.meta?.location === "home");
      const awayTeam = m.participants?.find((p) => p.meta?.location === "away");

      const homeScore = getScore(m.scores, "home");
      const awayScore = getScore(m.scores, "away");

      // Identify team1 and team2
      const isTeam1Home = String(homeTeam?.id) === team1Id;

      if (!team1) {
        const t1Data = isTeam1Home ? homeTeam : awayTeam;
        const t2Data = isTeam1Home ? awayTeam : homeTeam;
        team1 = {
          id: team1Id,
          name: t1Data?.name || "Unknown",
          shortName: t1Data?.short_code || t1Data?.name?.substring(0, 3) || "UNK",
          crestUrl: t1Data?.image_path,
        };
        team2 = {
          id: team2Id,
          name: t2Data?.name || "Unknown",
          shortName: t2Data?.short_code || t2Data?.name?.substring(0, 3) || "UNK",
          crestUrl: t2Data?.image_path,
        };
      }

      // Calculate winner
      let winner: "home" | "away" | "draw" = "draw";
      if (homeScore > awayScore) winner = "home";
      else if (awayScore > homeScore) winner = "away";

      // Track stats based on team1's perspective
      const team1Score = isTeam1Home ? homeScore : awayScore;
      const team2Score = isTeam1Home ? awayScore : homeScore;

      team1Goals += team1Score;
      team2Goals += team2Score;

      if (team1Score > team2Score) team1Wins++;
      else if (team2Score > team1Score) team2Wins++;
      else draws++;

      return {
        id: String(m.id),
        date: new Date(m.starting_at).getTime(),
        homeTeam: {
          id: String(homeTeam?.id || ""),
          name: homeTeam?.name || "Unknown",
          shortName: homeTeam?.short_code || homeTeam?.name?.substring(0, 3) || "UNK",
          crestUrl: homeTeam?.image_path,
        },
        awayTeam: {
          id: String(awayTeam?.id || ""),
          name: awayTeam?.name || "Unknown",
          shortName: awayTeam?.short_code || awayTeam?.name?.substring(0, 3) || "UNK",
          crestUrl: awayTeam?.image_path,
        },
        homeScore,
        awayScore,
        venue: m.venue?.name,
        competition: m.league?.name,
        winner,
      };
    });

    return {
      team1: team1!,
      team2: team2!,
      totalMatches: rawMatches.length,
      team1Wins,
      team2Wins,
      draws,
      team1Goals,
      team2Goals,
      lastMatches: matches,
      lastUpdatedAt: Date.now(),
    };
  }

  // ==================== TEAM FORM ====================

  async getTeamForm(teamId: string, forceRefresh = false): Promise<TeamForm | null> {
    const cacheKey = `form_${teamId}`;
    const cached = this.teamFormCache.get(cacheKey);

    if (!forceRefresh && cached && Date.now() < cached.expiresAt) {
      cacheLogger.debug({ teamId }, "Team form cache hit");
      return cached.data;
    }

    try {
      cacheLogger.debug({ teamId }, "Fetching team form");
      const raw = await this.client.getTeamWithForm(teamId);

      if (!raw?.data) return null;

      const form = this.transformTeamForm(raw.data, teamId);

      this.teamFormCache.set(cacheKey, {
        data: form,
        fetchedAt: Date.now(),
        expiresAt: Date.now() + CACHE_DURATIONS.teamForm,
      });

      return form;
    } catch (err) {
      cacheLogger.error({ err, teamId }, "Error fetching team form");
      if (cached) {
        cacheLogger.debug({ teamId }, "Returning stale cached team form");
        return cached.data;
      }
      return null;
    }
  }

  private transformTeamForm(rawTeam: SMTeamWithLatest, teamId: string): TeamForm {
    const team: Team = {
      id: String(rawTeam.id),
      name: rawTeam.name || "Unknown",
      shortName: rawTeam.short_code || rawTeam.name?.substring(0, 3) || "UNK",
      crestUrl: rawTeam.image_path,
    };

    const latestMatches: SMFixture[] = (rawTeam.latest || []).slice(0, 5);
    let wins = 0,
      draws = 0,
      losses = 0,
      goalsFor = 0,
      goalsAgainst = 0;
    const formString: string[] = [];

    const getScore = (scores: SMScore[] | undefined, participant: "home" | "away"): number => {
      const score = scores?.find(
        (s) => s.description === "CURRENT" && s.score?.participant === participant
      );
      return score?.score?.goals ?? 0;
    };

    const matches: FormMatch[] = latestMatches.map((m) => {
      const participants: SMParticipant[] = m.participants || [];
      const isHome =
        participants.find((p) => p.meta?.location === "home")?.id === parseInt(teamId);
      const opponent = participants.find((p) => String(p.id) !== teamId);

      // Get scores
      const homeScore = getScore(m.scores, "home");
      const awayScore = getScore(m.scores, "away");

      const teamGoals = isHome ? homeScore : awayScore;
      const oppGoals = isHome ? awayScore : homeScore;

      goalsFor += teamGoals;
      goalsAgainst += oppGoals;

      let result: "W" | "D" | "L";
      if (teamGoals > oppGoals) {
        result = "W";
        wins++;
      } else if (teamGoals < oppGoals) {
        result = "L";
        losses++;
      } else {
        result = "D";
        draws++;
      }
      formString.push(result);

      return {
        id: String(m.id),
        date: new Date(m.starting_at).getTime(),
        opponent: {
          id: String(opponent?.id || ""),
          name: opponent?.name || "Unknown",
          shortName: opponent?.short_code || opponent?.name?.substring(0, 3) || "UNK",
          crestUrl: opponent?.image_path,
        },
        isHome,
        goalsFor: teamGoals,
        goalsAgainst: oppGoals,
        result,
        competition: m.league?.name,
      };
    });

    return {
      team,
      matches,
      summary: {
        wins,
        draws,
        losses,
        goalsFor,
        goalsAgainst,
        form: formString.join(""),
      },
      lastUpdatedAt: Date.now(),
    };
  }

  // ==================== TOP SCORERS ====================

  async getTopScorers(
    seasonId: string,
    limit = 10,
    forceRefresh = false
  ): Promise<TopScorers | null> {
    const cacheKey = `topscorers_${seasonId}`;
    const cached = this.topScorersCache.get(cacheKey);

    if (!forceRefresh && cached && Date.now() < cached.expiresAt) {
      cacheLogger.debug({ seasonId }, "Top scorers cache hit");
      return cached.data;
    }

    try {
      cacheLogger.debug({ seasonId }, "Fetching top scorers");
      const raw = await this.client.getTopScorers(seasonId);

      cacheLogger.debug(
        { seasonId, sampleCount: raw?.data?.length ?? 0 },
        "Top scorers raw response received"
      );

      if (!raw?.data) {
        cacheLogger.debug({ seasonId }, "No data in top scorers response");
        return null;
      }

      const scorers = this.transformTopScorers(raw.data, seasonId, limit);

      this.topScorersCache.set(cacheKey, {
        data: scorers,
        fetchedAt: Date.now(),
        expiresAt: Date.now() + CACHE_DURATIONS.topScorers,
      });

      return scorers;
    } catch (err) {
      cacheLogger.error({ err, seasonId }, "Error fetching top scorers");
      if (cached) {
        cacheLogger.debug({ seasonId }, "Returning stale cached top scorers");
        return cached.data;
      }
      return null;
    }
  }

  private transformTopScorers(rawData: SMTopScorer[], seasonId: string, limit: number): TopScorers {
    // Log all unique type names to debug
    const types = [
      ...new Set(rawData.map((e) => `${e.type_id}`)),
    ];
    cacheLogger.debug({ types }, "Top scorers available type IDs");

    // Filter only goal scorers and sort by goals
    const goalScorers = rawData
      .filter((entry) => entry.type_id === SM_TOPSCORER_TYPE_IDS.GOALS)
      .sort((a, b) => (b.total || 0) - (a.total || 0))
      .slice(0, limit);

    cacheLogger.debug(
      { goalScorers: goalScorers.length, totalEntries: rawData.length },
      "Filtered goal scorers"
    );

    const scorers: TopScorer[] = goalScorers.map((entry, index: number) => ({
      rank: index + 1,
      player: {
        id: String(entry.player?.id || entry.player_id),
        name: entry.player?.name || "Unknown",
        displayName:
          entry.player?.display_name ||
          entry.player?.common_name ||
          entry.player?.name ||
          "Unknown",
        photoUrl: entry.player?.image_path,
      },
      team: {
        id: String(entry.participant?.id || ""),
        name: entry.participant?.name || "Unknown",
        shortName:
          entry.participant?.short_code || entry.participant?.name?.substring(0, 3) || "UNK",
        crestUrl: entry.participant?.image_path,
      },
      goals: entry.total || 0,
    }));

    return {
      competitionId: "",
      competitionName: "League",
      seasonId,
      scorers,
      lastUpdatedAt: Date.now(),
    };
  }

  // ==================== LINEUPS ====================

  async getLineups(fixtureId: string, forceRefresh = false): Promise<MatchLineups | null> {
    const cacheKey = `lineups_${fixtureId}`;
    const cached = this.lineupsCache.get(cacheKey);

    if (!forceRefresh && cached && Date.now() < cached.expiresAt) {
      cacheLogger.debug({ fixtureId }, "Lineups cache hit");
      return cached.data;
    }

    try {
      cacheLogger.debug({ fixtureId }, "Fetching lineups");
      const raw = await this.client.getFixtureWithLineups(fixtureId);

      // Debug: Log raw data structure
      cacheLogger.debug(
        { fixtureId, hasData: !!raw?.data, keys: raw?.data ? Object.keys(raw.data) : [] },
        "Raw lineups data received"
      );

      if (!raw?.data?.lineups) return null;

      const lineups = this.transformLineups(raw.data, fixtureId);

      this.lineupsCache.set(cacheKey, {
        data: lineups,
        fetchedAt: Date.now(),
        expiresAt: Date.now() + CACHE_DURATIONS.lineups,
      });

      return lineups;
    } catch (err) {
      cacheLogger.error({ err, fixtureId }, "Error fetching lineups");
      if (cached) {
        cacheLogger.debug({ fixtureId }, "Returning stale cached lineups");
        return cached.data;
      }
      return null;
    }
  }

  private transformLineups(rawData: SMFixtureWithLineups, matchId: string): MatchLineups {
    const homeParticipant = rawData.participants?.find((p) => p.meta?.location === "home");
    const awayParticipant = rawData.participants?.find((p) => p.meta?.location === "away");

    const homeTeamId = homeParticipant?.id;
    const awayTeamId = awayParticipant?.id;

    // Debug log incoming data
    cacheLogger.debug(
      {
        matchId,
        homeTeamId,
        awayTeamId,
        formationsCount: rawData.formations?.length || 0,
        formations: rawData.formations?.map(f => ({ id: f.id, participant_id: f.participant_id, formation: f.formation, location: f.location })),
        coachesCount: rawData.coaches?.length || 0,
        coaches: rawData.coaches?.map(c => ({ id: c.id, name: c.display_name || c.common_name || c.name, participant_id: c.meta?.participant_id })),
        lineupsCount: rawData.lineups?.length || 0,
      },
      "transformLineups raw data"
    );

    const homeLineup: SMLineupPlayer[] = rawData.lineups?.filter((l) => l.team_id === homeTeamId) || [];
    const awayLineup: SMLineupPlayer[] = rawData.lineups?.filter((l) => l.team_id === awayTeamId) || [];

    // Formation lookup: try by participant_id first, then by location
    let homeFormation: SMFormation | undefined = rawData.formations?.find((f) => f.participant_id === homeTeamId);
    let awayFormation: SMFormation | undefined = rawData.formations?.find((f) => f.participant_id === awayTeamId);
    
    // Fallback: lookup by location if participant_id match failed
    if (!homeFormation) {
      homeFormation = rawData.formations?.find((f) => f.location === "home");
    }
    if (!awayFormation) {
      awayFormation = rawData.formations?.find((f) => f.location === "away");
    }

    // Extract managers/coaches
    const homeCoach = rawData.coaches?.find((c) => c.meta?.participant_id === homeTeamId);
    const awayCoach = rawData.coaches?.find((c) => c.meta?.participant_id === awayTeamId);
    const homeManager = homeCoach?.display_name || homeCoach?.common_name || homeCoach?.name;
    const awayManager = awayCoach?.display_name || awayCoach?.common_name || awayCoach?.name;

    cacheLogger.debug(
      {
        matchId,
        homeFormation: homeFormation?.formation,
        awayFormation: awayFormation?.formation,
        homeManager,
        awayManager,
        homeStartersCount: homeLineup.filter(p => p.type_id === SM_LINEUP_TYPE_IDS.STARTER).length,
        awayStartersCount: awayLineup.filter(p => p.type_id === SM_LINEUP_TYPE_IDS.STARTER).length,
      },
      "transformLineups extracted data"
    );

    const transformPlayer = (p: SMLineupPlayer): LineupPlayer => {
      // Log formation field data for debugging
      if (p.type_id === SM_LINEUP_TYPE_IDS.STARTER) {
        cacheLogger.debug(
          {
            playerName: p.player?.display_name || p.player_name,
            formationField: p.formation_field,
            formationPosition: p.formation_position,
            positionId: p.position_id,
            typeId: p.type_id,
          },
          "Player formation data"
        );
      }
      return {
        id: String(p.player?.id || p.player_id),
        name: p.player?.display_name || p.player?.name || p.player_name || "Unknown",
        number: p.jersey_number,
        position: this.mapPosition(p.position_id || p.type_id),
        role: p.type_id === SM_LINEUP_TYPE_IDS.STARTER ? "STARTER" : "SUB",
        photoUrl: p.player?.image_path,
        formationPosition: p.formation_position,
        formationField: p.formation_field,
      };
    };

    const homeStarters = homeLineup.filter((p) => p.type_id === SM_LINEUP_TYPE_IDS.STARTER).map(transformPlayer);
    const homeBench = homeLineup.filter((p) => p.type_id !== SM_LINEUP_TYPE_IDS.STARTER).map(transformPlayer);
    const awayStarters = awayLineup.filter((p) => p.type_id === SM_LINEUP_TYPE_IDS.STARTER).map(transformPlayer);
    const awayBench = awayLineup.filter((p) => p.type_id !== SM_LINEUP_TYPE_IDS.STARTER).map(transformPlayer);

    return {
      matchId,
      home: {
        teamSide: "HOME",
        teamName: homeParticipant?.name || "Home Team",
        formation: homeFormation?.formation || undefined,
        manager: homeManager,
        startingXI: homeStarters,
        bench: homeBench,
      },
      away: {
        teamSide: "AWAY",
        teamName: awayParticipant?.name || "Away Team",
        formation: awayFormation?.formation || undefined,
        manager: awayManager,
        startingXI: awayStarters,
        bench: awayBench,
      },
      lastUpdatedAt: Date.now(),
    };
  }

  private mapPosition(positionId: number): "GK" | "DF" | "MF" | "FW" {
    // Use SportMonks position constants
    if (positionId === SM_POSITION_IDS.GOALKEEPER || positionId === 1) return "GK";
    if (positionId === SM_POSITION_IDS.DEFENDER || positionId === 2) return "DF";
    if (positionId === SM_POSITION_IDS.MIDFIELDER || positionId === 3) return "MF";
    if (positionId === SM_POSITION_IDS.FORWARD || positionId === 4) return "FW";
    return "MF"; // default
  }

  // ==================== CACHE MANAGEMENT ====================

  clearCache(): void {
    this.standingsCache.clear();
    this.h2hCache.clear();
    this.teamFormCache.clear();
    this.topScorersCache.clear();
    this.lineupsCache.clear();
    this.revalidating.clear();
    cacheLogger.info("All caches cleared");
  }

  getCacheStats(): Record<string, number> {
    return {
      standings: this.standingsCache.size,
      h2h: this.h2hCache.size,
      teamForm: this.teamFormCache.size,
      topScorers: this.topScorersCache.size,
      lineups: this.lineupsCache.size,
    };
  }

  /**
   * Get detailed cache statistics including LRU metrics
   */
  getDetailedCacheStats(): {
    caches: Record<string, { size: number; maxSize: number; utilization: number }>;
    revalidating: number;
    totalEntries: number;
  } {
    const caches = {
      standings: {
        size: this.standingsCache.size,
        maxSize: CACHE_LIMITS.standings,
        utilization: Math.round((this.standingsCache.size / CACHE_LIMITS.standings) * 100),
      },
      h2h: {
        size: this.h2hCache.size,
        maxSize: CACHE_LIMITS.h2h,
        utilization: Math.round((this.h2hCache.size / CACHE_LIMITS.h2h) * 100),
      },
      teamForm: {
        size: this.teamFormCache.size,
        maxSize: CACHE_LIMITS.teamForm,
        utilization: Math.round((this.teamFormCache.size / CACHE_LIMITS.teamForm) * 100),
      },
      topScorers: {
        size: this.topScorersCache.size,
        maxSize: CACHE_LIMITS.topScorers,
        utilization: Math.round((this.topScorersCache.size / CACHE_LIMITS.topScorers) * 100),
      },
      lineups: {
        size: this.lineupsCache.size,
        maxSize: CACHE_LIMITS.lineups,
        utilization: Math.round((this.lineupsCache.size / CACHE_LIMITS.lineups) * 100),
      },
    };

    const totalEntries =
      this.standingsCache.size +
      this.h2hCache.size +
      this.teamFormCache.size +
      this.topScorersCache.size +
      this.lineupsCache.size;

    return {
      caches,
      revalidating: this.revalidating.size,
      totalEntries,
    };
  }

  // ==================== PREFETCH FOR MATCHES ====================

  /**
   * Prefetch all static data for a list of matches.
   * This is called when Admin loads fixtures to ensure all data is cached
   * before matches go live.
   * 
   * Prefetches: standings (per season), team form (per team), H2H (per match pair)
   * 
   * @param matches Array of match objects with team IDs and season IDs
   * @returns Summary of prefetched data
   */
  async prefetchMatchesData(
    matches: Array<{
      id: string;
      homeTeamId: string;
      awayTeamId: string;
      seasonId?: string;
    }>
  ): Promise<{
    standingsFetched: number;
    teamFormsFetched: number;
    h2hFetched: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let standingsFetched = 0;
    let teamFormsFetched = 0;
    let h2hFetched = 0;

    // Collect unique season IDs and team IDs
    const seasonIds = new Set<string>();
    const teamIds = new Set<string>();
    const h2hPairs: Array<{ team1: string; team2: string }> = [];

    for (const match of matches) {
      if (match.seasonId) {
        seasonIds.add(match.seasonId);
      }
      teamIds.add(match.homeTeamId);
      teamIds.add(match.awayTeamId);
      h2hPairs.push({ team1: match.homeTeamId, team2: match.awayTeamId });
    }

    cacheLogger.info(
      { 
        matchCount: matches.length, 
        uniqueSeasons: seasonIds.size, 
        uniqueTeams: teamIds.size,
        h2hPairs: h2hPairs.length 
      },
      "Starting prefetch for matches"
    );

    // Prefetch standings (one per season)
    for (const seasonId of seasonIds) {
      try {
        await this.getStandings(seasonId);
        standingsFetched++;
      } catch (err) {
        errors.push(`standings_${seasonId}: ${(err as Error).message}`);
      }
    }

    // Prefetch team form (one per team) - with concurrency limit
    const teamFormPromises = Array.from(teamIds).map(async (teamId) => {
      try {
        await this.getTeamForm(teamId);
        teamFormsFetched++;
      } catch (err) {
        errors.push(`form_${teamId}: ${(err as Error).message}`);
      }
    });

    // Process in batches of 5 to avoid overwhelming the API
    const BATCH_SIZE = 5;
    for (let i = 0; i < teamFormPromises.length; i += BATCH_SIZE) {
      const batch = teamFormPromises.slice(i, i + BATCH_SIZE);
      await Promise.all(batch);
    }

    // Prefetch H2H (one per match pair) - with concurrency limit
    const h2hPromises = h2hPairs.map(async ({ team1, team2 }) => {
      try {
        await this.getH2H(team1, team2);
        h2hFetched++;
      } catch (err) {
        errors.push(`h2h_${team1}_${team2}: ${(err as Error).message}`);
      }
    });

    for (let i = 0; i < h2hPromises.length; i += BATCH_SIZE) {
      const batch = h2hPromises.slice(i, i + BATCH_SIZE);
      await Promise.all(batch);
    }

    cacheLogger.info(
      { standingsFetched, teamFormsFetched, h2hFetched, errorCount: errors.length },
      "Prefetch completed"
    );

    return { standingsFetched, teamFormsFetched, h2hFetched, errors };
  }
}
