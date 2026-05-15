import type {
  Match,
  MatchEvent,
  MatchLineups,
  MatchStats,
  MatchId,
  ProviderName,
  Standings,
} from "@parerineavizate/shared/models";
import type { Provider, BatchMatchData } from "../Provider.js";
import { SportMonksClient } from "./client.js";
import { mapMatch, mapEvents, mapLineups, mapStats, mapStandings } from "./mapper.js";
import type { SMFixture, SMResponse, SMStandingEntry } from "./types.js";
import { config } from "../../config.js";
import { providerLogger } from "../../utils/logger.js";

export class SportMonksProvider implements Provider {
  readonly name: ProviderName = "sportmonks";
  private client: SportMonksClient;
  private ready = false;

  // Cache for live matches - populated by getAllLiveMatches()
  private liveMatchesCache: Map<string, Match> = new Map();
  private lastLiveFetchAt = 0;

  // Cache for de-duplication
  private eventsCache: Map<string, { data: MatchEvent[]; hash: string }> = new Map();

  // Cache for fixtures/date requests - prevents duplicate API calls within 30 seconds
  private fixturesByDateCache: Map<string, { data: Match[]; fetchedAt: number }> = new Map();
  private readonly FIXTURES_CACHE_TTL_MS = 30_000; // 30 seconds

  // Cache for individual fixture requests (non-live matches)
  // Key: matchId, Value: { match, fetchedAt }
  // TTL varies based on match status:
  // - Scheduled (NS): 60 seconds (data rarely changes)
  // - Finished (FT): 5 minutes (final, won't change)
  // - Other: 10 seconds
  private fixtureCache: Map<string, { match: Match; fetchedAt: number }> = new Map();
  private readonly FIXTURE_CACHE_TTL_SCHEDULED_MS = 60_000; // 60 seconds for scheduled
  private readonly FIXTURE_CACHE_TTL_FINISHED_MS = 300_000; // 5 minutes for finished
  private readonly FIXTURE_CACHE_TTL_DEFAULT_MS = 10_000; // 10 seconds default

  constructor() {
    this.client = new SportMonksClient();
  }

  async init(): Promise<void> {
    if (!config.sportmonks.token) {
      throw new Error("SportMonks token not configured");
    }

    // Verify API connection with a simple request
    try {
      const response = await this.client.getLivescores();
      if (response) {
        this.ready = true;
        providerLogger.info("SportMonksProvider initialized successfully");
      } else {
        throw new Error("Failed to verify SportMonks API connection");
      }
    } catch (err) {
      providerLogger.error({ err }, "SportMonksProvider failed to initialize");
      throw err;
    }
  }

  isReady(): boolean {
    return this.ready && this.client.isHealthy();
  }

  private simpleHash(obj: any): string {
    return JSON.stringify(obj).slice(0, 1000);
  }

  /**
   * Get ALL live matches in a single API call
   * This is the most efficient way to poll for updates
   */
  async getAllLiveMatches(): Promise<Match[]> {
    try {
      const response = (await this.client.getLivescores()) as SMResponse<SMFixture[]> | null;
      if (!response?.data) return [];

      const fixtures = Array.isArray(response.data) ? response.data : [response.data];
      const matches: Match[] = [];

      // Update cache and build result
      this.liveMatchesCache.clear();
      for (const fixture of fixtures) {
        const match = mapMatch(fixture);
        if (match) {
          this.liveMatchesCache.set(match.id, match);
          matches.push(match);
        }
      }

      this.lastLiveFetchAt = Date.now();
      return matches;
    } catch (err) {
      providerLogger.error({ err }, "getAllLiveMatches failed");
      return [];
    }
  }

  /**
   * Get match from cache first, then fetch if not found
   * Uses multi-level caching:
   * 1. Live matches cache (from getAllLiveMatchesWithDetails)
   * 2. Individual fixture cache (with TTL based on match status)
   */
  async getMatchSnapshot(matchId: MatchId): Promise<Match | null> {
    // First check live matches cache (from LivescoresPoller)
    const liveMatch = this.liveMatchesCache.get(matchId);
    if (liveMatch) {
      return liveMatch;
    }

    // Check individual fixture cache
    const now = Date.now();
    const cachedFixture = this.fixtureCache.get(matchId);
    if (cachedFixture) {
      // Determine TTL based on match status
      let ttl = this.FIXTURE_CACHE_TTL_DEFAULT_MS;
      const status = cachedFixture.match.status;
      
      if (status === "NS" || status === "POST" || status === "SUSP") {
        // Scheduled/postponed/suspended - data rarely changes
        ttl = this.FIXTURE_CACHE_TTL_SCHEDULED_MS;
      } else if (status === "FT" || status === "AET" || status === "PEN" || status === "CANC" || status === "ABD") {
        // Finished/cancelled/abandoned - final result
        ttl = this.FIXTURE_CACHE_TTL_FINISHED_MS;
      }
      
      if (now - cachedFixture.fetchedAt < ttl) {
        providerLogger.debug(
          { matchId, status, cacheAge: now - cachedFixture.fetchedAt, ttl },
          "getMatchSnapshot using cached fixture (avoiding API call)"
        );
        return cachedFixture.match;
      }
    }

    // Not in any cache or cache expired - fetch from API
    try {
      providerLogger.debug({ matchId }, "getMatchSnapshot fetching from API");
      const response = (await this.client.getFixture(matchId)) as SMResponse<SMFixture> | null;
      if (!response?.data) return null;

      const match = mapMatch(response.data);
      
      // Store in cache
      if (match) {
        this.fixtureCache.set(matchId, { match, fetchedAt: now });
      }
      
      return match;
    } catch (err) {
      providerLogger.error({ err, matchId }, "getMatchSnapshot failed");
      // Return stale cached data if available
      if (cachedFixture) {
        providerLogger.debug({ matchId }, "Returning stale cached fixture after API error");
        return cachedFixture.match;
      }
      return null;
    }
  }

  async getMatchEvents(matchId: MatchId): Promise<MatchEvent[]> {
    try {
      const response = (await this.client.getFixtureEvents(
        matchId
      )) as SMResponse<SMFixture> | null;
      if (!response?.data) return [];

      const events = mapEvents(response.data);

      // Check cache
      const hash = this.simpleHash(events);
      const cached = this.eventsCache.get(matchId);
      if (cached && cached.hash === hash) {
        return cached.data;
      }

      // Update cache
      this.eventsCache.set(matchId, { data: events, hash });
      return events;
    } catch (err) {
      providerLogger.error({ err, matchId }, "getMatchEvents failed");
      return [];
    }
  }

  async getMatchLineups(matchId: MatchId): Promise<MatchLineups | null> {
    try {
      const response = (await this.client.getFixtureLineups(
        matchId
      )) as SMResponse<SMFixture> | null;
      if (!response?.data) return null;

      return mapLineups(response.data);
    } catch (err) {
      providerLogger.error({ err, matchId }, "getMatchLineups failed");
      return null;
    }
  }

  async getMatchStats(matchId: MatchId): Promise<MatchStats | null> {
    try {
      const response = (await this.client.getFixtureStatistics(
        matchId
      )) as SMResponse<SMFixture> | null;
      if (!response?.data) return null;

      return mapStats(response.data);
    } catch (err) {
      providerLogger.error({ err, matchId }, "getMatchStats failed");
      return null;
    }
  }

  /**
   * Get ALL live matches with FULL data (events, stats, lineups) in ONE API request!
   * This is the most efficient polling method - 1 request instead of N*4 requests.
   */
  async getAllLiveMatchesWithDetails(): Promise<BatchMatchData[]> {
    try {
      const response = (await this.client.getLivescoresWithDetails()) as SMResponse<
        SMFixture[]
      > | null;
      if (!response?.data) return [];

      const fixtures = Array.isArray(response.data) ? response.data : [response.data];
      const results: BatchMatchData[] = [];

      // Update cache and build results
      this.liveMatchesCache.clear();

      for (const fixture of fixtures) {
        const match = mapMatch(fixture);
        if (!match) continue;

        this.liveMatchesCache.set(match.id, match);

        const batchData: BatchMatchData = {
          match,
          events: mapEvents(fixture),
          stats: mapStats(fixture),
          lineups: mapLineups(fixture),
        };

        results.push(batchData);
      }

      this.lastLiveFetchAt = Date.now();
      providerLogger.info(
        { matchCount: results.length },
        "getAllLiveMatchesWithDetails completed"
      );
      return results;
    } catch (err) {
      providerLogger.error({ err }, "getAllLiveMatchesWithDetails failed");
      return [];
    }
  }

  /**
   * Get batch data for multiple matches in ONE API request (max 50 IDs)
   * Combines match + events + stats + lineups into single call.
   */
  async getBatchMatchData(
    matchIds: MatchId[],
    options: { events?: boolean; stats?: boolean; lineups?: boolean } = {}
  ): Promise<BatchMatchData[]> {
    if (matchIds.length === 0) return [];

    try {
      // Build includes based on options
      const includes = ["participants", "scores", "state", "league", "periods"];
      if (options.events !== false) includes.push("events.type", "events.player");
      if (options.stats !== false) {
        includes.push("statistics.type"); // Include type for developer_name mapping
        includes.push("trends.type"); // Trends have structured home/away values with type info
      }
      if (options.lineups !== false) {
        includes.push("lineups.player", "lineups.type");
        includes.push("formations"); // Required for formation string (4-3-3, 4-4-2, etc.)
        includes.push("coaches");    // Required for manager name
      }

      const response = (await this.client.getFixturesMulti(matchIds, includes)) as SMResponse<
        SMFixture[]
      > | null;
      if (!response?.data) return [];

      const fixtures = Array.isArray(response.data) ? response.data : [response.data];
      const results: BatchMatchData[] = [];

      for (const fixture of fixtures) {
        const match = mapMatch(fixture);
        if (!match) continue;

        const batchData: BatchMatchData = {
          match,
          events: options.events !== false ? mapEvents(fixture) : undefined,
          stats: options.stats !== false ? mapStats(fixture) : undefined,
          lineups: options.lineups !== false ? mapLineups(fixture) : undefined,
        };

        results.push(batchData);
      }

      providerLogger.info(
        { fetched: results.length, requested: matchIds.length },
        "getBatchMatchData completed"
      );
      return results;
    } catch (err) {
      providerLogger.error({ err, matchIds }, "getBatchMatchData failed");
      return [];
    }
  }

  async searchFixtures(query: {
    date?: string;
    competitionId?: string;
    status?: "live" | "upcoming" | "finished";
  }): Promise<Match[]> {
    try {
      let allMatches: Match[] = [];

      if (query.status === "live") {
        // Live matches - use existing live cache or fetch
        const response = (await this.client.getLivescores()) as SMResponse<SMFixture[]> | null;
        if (response?.data) {
          const fixtures = Array.isArray(response.data) ? response.data : [response.data];
          for (const fixture of fixtures) {
            const match = mapMatch(fixture);
            if (match) allMatches.push(match);
          }
        }
      } else {
        // Date-based query - check cache first!
        const searchDate = query.date || new Date().toISOString().split("T")[0];
        const cacheKey = `fixtures:${searchDate}`;
        const cached = this.fixturesByDateCache.get(cacheKey);
        
        if (cached && Date.now() - cached.fetchedAt < this.FIXTURES_CACHE_TTL_MS) {
          // Cache hit - use cached data
          providerLogger.info(
            { date: searchDate, cacheAge: Date.now() - cached.fetchedAt },
            "searchFixtures using cached data (avoiding duplicate API call)"
          );
          allMatches = cached.data;
        } else {
          // Cache miss or expired - fetch from API
          providerLogger.info({ date: searchDate }, "searchFixtures fetching from API");
          const response = (await this.client.getFixturesByDate(searchDate)) as SMResponse<
            SMFixture[]
          > | null;

          if (response?.data) {
            const fixtures = Array.isArray(response.data) ? response.data : [response.data];
            for (const fixture of fixtures) {
              const match = mapMatch(fixture);
              if (match) allMatches.push(match);
            }
          }

          // Store in cache
          this.fixturesByDateCache.set(cacheKey, {
            data: allMatches,
            fetchedAt: Date.now(),
          });
        }
      }

      // Apply filters (competitionId, status)
      let filteredMatches = allMatches;

      if (query.competitionId) {
        filteredMatches = filteredMatches.filter(
          (match) => match.competition.id === query.competitionId
        );
      }

      if (query.status) {
        filteredMatches = filteredMatches.filter((match) => {
          const isLive = match.status === "LIVE" || match.status === "HT";
          const isFinished =
            match.status === "FT" || match.status === "AET" || match.status === "PEN";
          const isUpcoming = match.status === "NS";

          if (query.status === "live") return isLive;
          if (query.status === "finished") return isFinished;
          if (query.status === "upcoming") return isUpcoming;
          return true;
        });
      }

      return filteredMatches;
    } catch (err) {
      providerLogger.error({ err, query }, "searchFixtures failed");
      return [];
    }
  }

  dispose(): void {
    this.ready = false;
    this.liveMatchesCache.clear();
    this.eventsCache.clear();
    this.fixturesByDateCache.clear();
    this.fixtureCache.clear();
    providerLogger.info("SportMonksProvider disposed");
  }

  // ==================== STANDINGS METHODS (New Architecture) ====================

  /**
   * Get static standings for a season
   */
  async getStandings(
    seasonId: string,
    competitionId: string,
    competitionName: string
  ): Promise<Standings | null> {
    try {
      const response = await this.client.getStandings(seasonId);
      if (!response?.data) return null;

      // Response can be array of standings (multiple groups) or single group
      let standingsData: SMStandingEntry[] = [];
      
      if (Array.isArray(response.data)) {
        // Multiple groups - flatten or take first group
        // Most leagues have a single group, but some have multiple (e.g., UCL groups)
        for (const group of response.data) {
          if (Array.isArray(group)) {
            standingsData.push(...group);
          } else if (group.standings && Array.isArray(group.standings)) {
            standingsData.push(...group.standings);
          } else {
            standingsData.push(group);
          }
        }
      } else if (response.data.standings) {
        standingsData = response.data.standings;
      }

      return mapStandings(standingsData, competitionId, competitionName, seasonId, false);
    } catch (err) {
      providerLogger.error({ err, seasonId }, "getStandings failed");
      return null;
    }
  }

  /**
   * Get live standings for a league (real-time during matches)
   */
  async getLiveStandings(
    leagueId: string,
    competitionId: string,
    competitionName: string,
    seasonId: string
  ): Promise<Standings | null> {
    try {
      const response = await this.client.getLiveStandings(leagueId);
      if (!response?.data) {
        // Live standings might be empty when no matches are live
        providerLogger.debug({ leagueId }, "getLiveStandings: no live data (no matches live?)");
        return null;
      }

      let standingsData: SMStandingEntry[] = [];
      
      if (Array.isArray(response.data)) {
        standingsData = response.data;
      } else if (response.data.standings) {
        standingsData = response.data.standings;
      }

      return mapStandings(standingsData, competitionId, competitionName, seasonId, true);
    } catch (err) {
      providerLogger.error({ err, leagueId }, "getLiveStandings failed");
      return null;
    }
  }

  /**
   * Get team form (recent results: W/D/L)
   * Returns array of results like ["W", "W", "D", "L", "W"] (most recent first)
   */
  async getTeamForm(teamId: string): Promise<string[] | null> {
    try {
      const response = await this.client.getTeamWithForm(teamId);
      if (!response?.data) return null;

      const team = response.data;
      const latest = team.latest || [];

      // Map recent matches to W/D/L
      const form: string[] = [];
      for (const match of latest.slice(0, 5)) {
        // Find which participant is our team and the opponent
        const participants = match.participants || [];
        const ourTeam = participants.find((p: any) => String(p.id) === String(teamId));
        const opponent = participants.find((p: any) => String(p.id) !== String(teamId));

        if (ourTeam?.meta?.winner === true) {
          // We won
          form.push("W");
        } else if (opponent?.meta?.winner === true) {
          // Opponent won, we lost
          form.push("L");
        } else {
          // Neither team has winner=true, it's a draw
          form.push("D");
        }
      }

      return form.length > 0 ? form : null;
    } catch (err) {
      providerLogger.error({ err, teamId }, "getTeamForm failed");
      return null;
    }
  }
}
