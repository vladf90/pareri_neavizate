import { config } from "../../config.js";
import { apiLogger } from "../../utils/logger.js";

export interface SportMonksClientConfig {
  baseUrl: string;
  token: string;
  maxRetries?: number;
  initialBackoffMs?: number;
  maxBackoffMs?: number;
}

export interface RequestOptions {
  includes?: string[];
  filters?: Record<string, string | number>;
}

export class SportMonksClient {
  private baseUrl: string;
  private token: string;
  private maxRetries: number;
  private initialBackoffMs: number;
  private maxBackoffMs: number;

  private currentBackoff: number;
  private consecutiveErrors: number = 0;

  constructor(clientConfig?: Partial<SportMonksClientConfig>) {
    this.baseUrl = clientConfig?.baseUrl || config.sportmonks.baseUrl;
    this.token = clientConfig?.token || config.sportmonks.token;
    this.maxRetries = clientConfig?.maxRetries ?? 3;
    this.initialBackoffMs = clientConfig?.initialBackoffMs ?? 2000;
    this.maxBackoffMs = clientConfig?.maxBackoffMs ?? 30000;
    this.currentBackoff = this.initialBackoffMs;
  }

  private buildUrl(endpoint: string, options?: RequestOptions): string {
    const url = new URL(endpoint, this.baseUrl);

    // Add includes
    if (options?.includes?.length) {
      url.searchParams.set("include", options.includes.join(";"));
    }

    // Add filters
    if (options?.filters) {
      for (const [key, value] of Object.entries(options.filters)) {
        url.searchParams.set(key, String(value));
      }
    }

    return url.toString();
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private calculateBackoff(): number {
    // Exponential backoff with jitter
    const backoff = Math.min(this.currentBackoff * (1 + Math.random() * 0.3), this.maxBackoffMs);
    this.currentBackoff = Math.min(this.currentBackoff * 2, this.maxBackoffMs);
    return backoff;
  }

  private resetBackoff(): void {
    this.currentBackoff = this.initialBackoffMs;
    this.consecutiveErrors = 0;
  }

  async fetch<T>(endpoint: string, options?: RequestOptions): Promise<T | null> {
    const url = this.buildUrl(endpoint, options);
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        apiLogger.debug({ endpoint, attempt: attempt + 1 }, "Fetching SportMonks API");

        const response = await fetch(url, {
          method: "GET",
          headers: {
            Authorization: this.token,
            Accept: "application/json",
          },
        });

        // Handle rate limiting
        if (response.status === 429) {
          const backoff = this.calculateBackoff();
          apiLogger.warn({ backoff }, "SportMonks rate limited, backing off");
          this.consecutiveErrors++;
          await this.sleep(backoff);
          continue;
        }

        // Handle server errors
        if (response.status >= 500) {
          const backoff = this.calculateBackoff();
          apiLogger.warn({ status: response.status, backoff }, "SportMonks server error, backing off");
          this.consecutiveErrors++;
          await this.sleep(backoff);
          continue;
        }

        // Handle client errors (don't retry)
        if (response.status >= 400) {
          apiLogger.error({ status: response.status, endpoint }, "SportMonks client error");
          return null;
        }

        // Success
        const data = await response.json();
        this.resetBackoff();
        return data as T;
      } catch (err) {
        lastError = err as Error;
        apiLogger.error({ err, endpoint }, "SportMonks request failed");

        if (attempt < this.maxRetries) {
          const backoff = this.calculateBackoff();
          this.consecutiveErrors++;
          await this.sleep(backoff);
        }
      }
    }

    apiLogger.error({ endpoint, maxRetries: this.maxRetries }, "SportMonks all retries exhausted");
    throw lastError || new Error("Request failed after retries");
  }

  // Convenience methods for common endpoints

  async getFixture(fixtureId: string): Promise<any | null> {
    return this.fetch(`/v3/football/fixtures/${fixtureId}`, {
      includes: ["participants", "scores", "state", "venue", "league", "season", "round", "periods", "referees", "weatherreport"],
    });
  }

  async getLivescores(): Promise<any | null> {
    return this.fetch("/v3/football/livescores", {
      includes: ["participants", "scores", "state", "league", "round", "periods"],
    });
  }

  async getFixtureEvents(fixtureId: string): Promise<any | null> {
    return this.fetch(`/v3/football/fixtures/${fixtureId}`, {
      includes: ["events"],
    });
  }

  async getFixtureLineups(fixtureId: string): Promise<any | null> {
    return this.fetch(`/v3/football/fixtures/${fixtureId}`, {
      includes: ["participants", "formations", "coaches", "lineups.player"],
    });
  }

  async getFixtureStatistics(fixtureId: string): Promise<any | null> {
    return this.fetch(`/v3/football/fixtures/${fixtureId}`, {
      includes: ["statistics", "trends.type", "participants"],
    });
  }

  async getFixturesByDate(date: string): Promise<any | null> {
    return this.fetch("/v3/football/fixtures/date/" + date, {
      includes: ["participants", "scores", "state", "league", "season", "round", "periods"],
    });
  }

  /**
   * Get multiple fixtures in a single API request (max 50 IDs)
   * This is the most efficient way to fetch data for multiple matches!
   * Uses FULL include set for comprehensive data extraction.
   *
   * @param fixtureIds - Array of fixture IDs (max 50)
   * @param includes - Array of includes (optional, uses comprehensive default)
   */
  async getFixturesMulti(fixtureIds: string[], includes?: string[]): Promise<any | null> {
    if (fixtureIds.length === 0) return null;

    // API limit is 50 IDs per request
    if (fixtureIds.length > 50) {
      apiLogger.warn(
        { requestedCount: fixtureIds.length },
        "getFixturesMulti called with >50 IDs, truncating"
      );
      fixtureIds = fixtureIds.slice(0, 50);
    }

    const idsParam = fixtureIds.join(",");
    
    // COMPREHENSIVE includes per new architecture docs
    // Fetches ALL data in one request: scores, events, stats, trends, lineups
    const defaultIncludes = [
      "state",
      "participants",
      "scores",
      "periods",
      "events.player",
      "events.type",
      "statistics.type",
      "trends.type",
      "round",
      "lineups.player",
      "lineups.type",
      "formations",
      "coaches",
      "league",
      "season",
    ];

    return this.fetch(`/v3/football/fixtures/multi/${idsParam}`, {
      includes: includes || defaultIncludes,
    });
  }

  /**
   * Get fixtures between two dates (inclusive)
   * More flexible than getFixturesByDate for multi-day queries
   * 
   * @param startDate - Start date in YYYY-MM-DD format
   * @param endDate - End date in YYYY-MM-DD format (default: same as start)
   * @param leagueIds - Optional array of league IDs to filter
   */
  async getFixturesBetween(
    startDate: string,
    endDate?: string,
    leagueIds?: number[]
  ): Promise<any | null> {
    const end = endDate || startDate;
    
    const options: RequestOptions = {
      includes: [
        "state",
        "participants",
        "scores",
        "league",
        "periods",
        "round",
        "season",
      ],
    };
    
    // Add league filter if provided
    if (leagueIds && leagueIds.length > 0) {
      options.filters = {
        leagueIds: leagueIds.join(","),
      };
    }

    return this.fetch(`/v3/football/fixtures/between/${startDate}/${end}`, options);
  }

  /**
   * Get livescores with extended includes (events, statistics, trends, lineups, coaches, venue)
   * Single API request for ALL live match data!
   */
  async getLivescoresWithDetails(): Promise<any | null> {
    return this.fetch("/v3/football/livescores", {
      includes: [
        "participants",
        "scores",
        "state",
        "league",
        "season",
        "periods",
        "events",
        "statistics",
        "trends.type",
        "lineups.player",
        "formations",
        "coaches",
        "venue",
      ],
    });
  }

  // ==================== WIDGET DATA METHODS ====================

  /**
   * Get standings for a season (static standings)
   * With comprehensive includes for detailed standings data including qualification rules
   */
  async getStandings(seasonId: string): Promise<any | null> {
    return this.fetch(`/v3/football/standings/seasons/${seasonId}`, {
      includes: ["participant", "details.type", "form", "rule.type"],
    });
  }

  /**
   * Get live standings for a league (real-time during matches)
   * With participant, details, and rule includes for qualification zones
   */
  async getLiveStandings(leagueId: string): Promise<any | null> {
    return this.fetch(`/v3/football/standings/live/leagues/${leagueId}`, {
      includes: ["participant", "details.type", "rule.type"],
    });
  }

  /**
   * Get head-to-head matches between two teams
   */
  async getH2H(team1Id: string, team2Id: string): Promise<any | null> {
    return this.fetch(`/v3/football/fixtures/head-to-head/${team1Id}/${team2Id}`, {
      includes: ["participants", "scores", "state", "venue", "league"],
      filters: { per_page: "10" },
    });
  }

  /**
   * Get team details with recent form (latest matches)
   */
  async getTeamWithForm(teamId: string): Promise<any | null> {
    return this.fetch(`/v3/football/teams/${teamId}`, {
      includes: ["latest.participants", "latest.scores", "latest.league", "venue"],
    });
  }

  /**
   * Get top scorers for a season
   */
  async getTopScorers(seasonId: string): Promise<any | null> {
    return this.fetch(`/v3/football/topscorers/seasons/${seasonId}`, {
      includes: ["player", "participant", "type"],
    });
  }

  /**
   * Get team squad (players)
   */
  async getTeamSquad(teamId: string): Promise<any | null> {
    return this.fetch(`/v3/football/squads/teams/${teamId}`, {
      includes: ["player", "position", "detailedPosition"],
    });
  }

  /**
   * Get fixture with full lineups
   */
  async getFixtureWithLineups(fixtureId: string): Promise<any | null> {
    return this.fetch(`/v3/football/fixtures/${fixtureId}`, {
      includes: ["participants", "scores", "state", "lineups.player", "formations", "coaches"],
    });
  }

  getConsecutiveErrors(): number {
    return this.consecutiveErrors;
  }

  isHealthy(): boolean {
    return this.consecutiveErrors < 3;
  }
}
