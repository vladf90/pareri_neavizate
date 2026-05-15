import type {
  Match,
  MatchEvent,
  MatchLineups,
  MatchStats,
  MatchId,
  ProviderName,
  Standings,
} from "@parerineavizate/shared/models";

/**
 * Batch result for multiple matches - includes all data in one API call
 */
export interface BatchMatchData {
  match: Match;
  events?: MatchEvent[];
  stats?: MatchStats | null;
  lineups?: MatchLineups | null;
}

/**
 * Provider interface - all data providers must implement this
 */
export interface Provider {
  readonly name: ProviderName;

  /**
   * Initialize the provider (connect, verify API key, etc.)
   */
  init(): Promise<void>;

  /**
   * Check if provider is ready to serve data
   */
  isReady(): boolean;

  /**
   * Get ALL live matches in one request (efficient for polling)
   * This is the main method for getting match updates
   */
  getAllLiveMatches(): Promise<Match[]>;

  /**
   * Get match snapshot (score, clock, teams, etc.)
   * Should use cache from getAllLiveMatches when possible
   */
  getMatchSnapshot(matchId: MatchId): Promise<Match | null>;

  /**
   * Get match events (goals, cards, subs, etc.)
   */
  getMatchEvents(matchId: MatchId): Promise<MatchEvent[]>;

  /**
   * Get match lineups
   */
  getMatchLineups(matchId: MatchId): Promise<MatchLineups | null>;

  /**
   * Get match statistics
   */
  getMatchStats(matchId: MatchId): Promise<MatchStats | null>;

  /**
   * Get ALL live matches with FULL data (events, stats, lineups) in ONE request!
   * This is the most efficient polling method - replaces multiple individual calls.
   * Returns match data + events + stats + lineups for all live matches.
   */
  getAllLiveMatchesWithDetails(): Promise<BatchMatchData[]>;

  /**
   * Get batch match data for multiple matches in a SINGLE API request (max 50)
   * Combines getMatchSnapshot + getMatchEvents + getMatchStats + getMatchLineups
   * into one efficient call.
   */
  getBatchMatchData(
    matchIds: MatchId[],
    options?: {
      events?: boolean;
      stats?: boolean;
      lineups?: boolean;
    }
  ): Promise<BatchMatchData[]>;

  /**
   * Search fixtures (for admin match picker)
   */
  searchFixtures(query: {
    date?: string; // YYYY-MM-DD
    competitionId?: string;
    status?: "live" | "upcoming" | "finished";
  }): Promise<Match[]>;

  /**
   * Get team's recent form (W/D/L results)
   * Returns array like ["W", "W", "D", "L", "W"] (most recent first)
   */
  getTeamForm?(teamId: string): Promise<string[] | null>;

  // ==================== STANDINGS METHODS (New Architecture) ====================
  
  /**
   * Get static standings for a season
   * @param seasonId - Season ID to fetch standings for
   * @param competitionId - Competition ID (for metadata)
   * @param competitionName - Competition name (for metadata)
   */
  getStandings?(
    seasonId: string,
    competitionId: string,
    competitionName: string
  ): Promise<Standings | null>;

  /**
   * Get live standings for a league (real-time during matches)
   * @param leagueId - League ID to fetch live standings for
   * @param competitionId - Competition ID (for metadata)
   * @param competitionName - Competition name (for metadata)
   * @param seasonId - Season ID (for metadata)
   */
  getLiveStandings?(
    leagueId: string,
    competitionId: string,
    competitionName: string,
    seasonId: string
  ): Promise<Standings | null>;

  /**
   * Get available mock matches (only for MockProvider)
   */
  getAvailableMatches?(): Match[];

  /**
   * Cleanup
   */
  dispose(): void;
}
