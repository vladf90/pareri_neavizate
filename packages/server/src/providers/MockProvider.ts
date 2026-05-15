import type {
  Match,
  MatchEvent,
  MatchLineups,
  MatchStats,
  MatchId,
  ProviderName,
  MatchStatus,
  ClockPhase,
  EventKind,
  TeamSide,
} from "@parerineavizate/shared/models";
import type { Provider, BatchMatchData } from "./Provider.js";

// Mock match data for testing
const MOCK_MATCHES: Match[] = [
  {
    id: "mock_1",
    competition: {
      id: "ucl",
      name: "UEFA Champions League",
      shortName: "UCL",
      country: "Europe",
      season: { id: "2025-26", name: "2025/26" },
    },
    startTime: Date.now() - 45 * 60 * 1000, // Started 45 min ago
    status: "LIVE",
    venue: { name: "Santiago Bernabéu", city: "Madrid", country: "Spain" },
    homeTeam: {
      id: "rm",
      name: "Real Madrid",
      shortName: "RMA",
      crestUrl: "/crests/real-madrid.png",
      colors: { primary: "#FFFFFF", secondary: "#000000" },
    },
    awayTeam: {
      id: "mc",
      name: "Manchester City",
      shortName: "MCI",
      crestUrl: "/crests/man-city.png",
      colors: { primary: "#6CABDD", secondary: "#1C2C5B" },
    },
    score: { home: 2, away: 1 },
    clock: {
      phase: "1H",
      minute: 45,
      addedMinute: 2,
      display: "45+2",
      isLive: true,
      lastUpdatedAt: Date.now(),
    },
    lastChangedAt: Date.now(),
  },
  {
    id: "mock_2",
    competition: {
      id: "pl",
      name: "Premier League",
      shortName: "PL",
      country: "England",
      season: { id: "2025-26", name: "2025/26" },
    },
    startTime: Date.now() - 60 * 60 * 1000, // Started 60 min ago
    status: "LIVE",
    venue: { name: "Anfield", city: "Liverpool", country: "England" },
    homeTeam: {
      id: "liv",
      name: "Liverpool",
      shortName: "LIV",
      crestUrl: "/crests/liverpool.png",
      colors: { primary: "#C8102E", secondary: "#FFFFFF" },
    },
    awayTeam: {
      id: "ars",
      name: "Arsenal",
      shortName: "ARS",
      crestUrl: "/crests/arsenal.png",
      colors: { primary: "#EF0107", secondary: "#FFFFFF" },
    },
    score: { home: 1, away: 1 },
    clock: {
      phase: "2H",
      minute: 60,
      display: "60",
      isLive: true,
      lastUpdatedAt: Date.now(),
    },
    lastChangedAt: Date.now(),
  },
  {
    id: "mock_3",
    competition: {
      id: "laliga",
      name: "La Liga",
      shortName: "LaLiga",
      country: "Spain",
      season: { id: "2025-26", name: "2025/26" },
    },
    startTime: Date.now() + 30 * 60 * 1000, // Starts in 30 min
    status: "NS",
    venue: { name: "Camp Nou", city: "Barcelona", country: "Spain" },
    homeTeam: {
      id: "bar",
      name: "FC Barcelona",
      shortName: "BAR",
      crestUrl: "/crests/barcelona.png",
      colors: { primary: "#A50044", secondary: "#004D98" },
    },
    awayTeam: {
      id: "atm",
      name: "Atlético Madrid",
      shortName: "ATM",
      crestUrl: "/crests/atletico.png",
      colors: { primary: "#CB3524", secondary: "#FFFFFF" },
    },
    score: { home: 0, away: 0 },
    clock: {
      phase: "PRE",
      minute: 0,
      display: "-",
      isLive: false,
      lastUpdatedAt: Date.now(),
    },
    lastChangedAt: Date.now(),
  },
];

// Mock events
const MOCK_EVENTS: Record<string, MatchEvent[]> = {
  mock_1: [
    {
      id: "evt_1",
      matchId: "mock_1",
      kind: "GOAL",
      teamSide: "HOME",
      minute: 12,
      displayMinute: "12",
      player: { id: "p1", name: "Vinícius Jr." },
      assist: { id: "p2", name: "Jude Bellingham" },
      scoreAfter: { home: 1, away: 0 },
    },
    {
      id: "evt_2",
      matchId: "mock_1",
      kind: "YELLOW",
      teamSide: "AWAY",
      minute: 23,
      displayMinute: "23",
      player: { id: "p3", name: "Rodri" },
      detail: "Foul",
    },
    {
      id: "evt_3",
      matchId: "mock_1",
      kind: "GOAL",
      teamSide: "AWAY",
      minute: 34,
      displayMinute: "34",
      player: { id: "p4", name: "Erling Haaland" },
      scoreAfter: { home: 1, away: 1 },
    },
    {
      id: "evt_4",
      matchId: "mock_1",
      kind: "GOAL",
      teamSide: "HOME",
      minute: 41,
      displayMinute: "41",
      player: { id: "p2", name: "Jude Bellingham" },
      assist: { id: "p5", name: "Federico Valverde" },
      scoreAfter: { home: 2, away: 1 },
    },
  ],
  mock_2: [
    {
      id: "evt_5",
      matchId: "mock_2",
      kind: "GOAL",
      teamSide: "HOME",
      minute: 15,
      displayMinute: "15",
      player: { id: "p6", name: "Mohamed Salah" },
      scoreAfter: { home: 1, away: 0 },
    },
    {
      id: "evt_6",
      matchId: "mock_2",
      kind: "GOAL",
      teamSide: "AWAY",
      minute: 52,
      displayMinute: "52",
      player: { id: "p7", name: "Bukayo Saka" },
      scoreAfter: { home: 1, away: 1 },
    },
  ],
};

// Mock lineups
const MOCK_LINEUPS: Record<string, MatchLineups> = {
  mock_1: {
    matchId: "mock_1",
    home: {
      teamSide: "HOME",
      formation: "4-3-3",
      startingXI: [
        { id: "gk1", name: "Thibaut Courtois", number: 1, position: "GK", role: "STARTER" },
        { id: "df1", name: "Dani Carvajal", number: 2, position: "DF", role: "STARTER" },
        { id: "df2", name: "Éder Militão", number: 3, position: "DF", role: "STARTER" },
        { id: "df3", name: "Antonio Rüdiger", number: 22, position: "DF", role: "STARTER" },
        { id: "df4", name: "Ferland Mendy", number: 23, position: "DF", role: "STARTER" },
        { id: "mf1", name: "Aurélien Tchouaméni", number: 18, position: "MF", role: "STARTER" },
        { id: "mf2", name: "Federico Valverde", number: 15, position: "MF", role: "STARTER" },
        { id: "mf3", name: "Jude Bellingham", number: 5, position: "MF", role: "STARTER" },
        { id: "fw1", name: "Rodrygo", number: 11, position: "FW", role: "STARTER" },
        { id: "fw2", name: "Kylian Mbappé", number: 9, position: "FW", role: "STARTER" },
        { id: "fw3", name: "Vinícius Jr.", number: 7, position: "FW", role: "STARTER" },
      ],
      bench: [{ id: "gk2", name: "Andriy Lunin", number: 13, position: "GK", role: "BENCH" }],
    },
    away: {
      teamSide: "AWAY",
      formation: "4-3-3",
      startingXI: [
        { id: "agk1", name: "Ederson", number: 31, position: "GK", role: "STARTER" },
        { id: "adf1", name: "Kyle Walker", number: 2, position: "DF", role: "STARTER" },
        { id: "adf2", name: "Rúben Dias", number: 3, position: "DF", role: "STARTER" },
        { id: "adf3", name: "John Stones", number: 5, position: "DF", role: "STARTER" },
        { id: "adf4", name: "Joško Gvardiol", number: 24, position: "DF", role: "STARTER" },
        { id: "amf1", name: "Rodri", number: 16, position: "MF", role: "STARTER" },
        { id: "amf2", name: "Kevin De Bruyne", number: 17, position: "MF", role: "STARTER" },
        { id: "amf3", name: "Bernardo Silva", number: 20, position: "MF", role: "STARTER" },
        { id: "afw1", name: "Phil Foden", number: 47, position: "FW", role: "STARTER" },
        { id: "afw2", name: "Erling Haaland", number: 9, position: "FW", role: "STARTER" },
        { id: "afw3", name: "Jeremy Doku", number: 11, position: "FW", role: "STARTER" },
      ],
      bench: [],
    },
    lastUpdatedAt: Date.now(),
  },
};

// Mock stats
const MOCK_STATS: Record<string, MatchStats> = {
  mock_1: {
    matchId: "mock_1",
    home: {
      possession: 52,
      shots_total: 8,
      shots_on_target: 4,
      corners: 3,
      fouls: 7,
    },
    away: {
      possession: 48,
      shots_total: 6,
      shots_on_target: 2,
      corners: 2,
      fouls: 9,
    },
    lastUpdatedAt: Date.now(),
  },
  mock_2: {
    matchId: "mock_2",
    home: {
      possession: 45,
      shots_total: 10,
      shots_on_target: 3,
      corners: 5,
      fouls: 11,
    },
    away: {
      possession: 55,
      shots_total: 7,
      shots_on_target: 4,
      corners: 4,
      fouls: 8,
    },
    lastUpdatedAt: Date.now(),
  },
};

export class MockProvider implements Provider {
  readonly name: ProviderName = "mock";
  private matches: Map<string, Match> = new Map();
  private simulationInterval: ReturnType<typeof setInterval> | null = null;
  private ready = false;

  async init(): Promise<void> {
    // Initialize with mock matches
    for (const match of MOCK_MATCHES) {
      this.matches.set(match.id, { ...match });
    }

    // Start simulation (update clocks for live matches)
    this.startSimulation();

    this.ready = true;
    console.log(`[MockProvider] Initialized with ${this.matches.size} matches`);
  }

  isReady(): boolean {
    return this.ready;
  }

  private startSimulation(): void {
    // Update live match clocks every 60 seconds
    this.simulationInterval = setInterval(() => {
      for (const match of this.matches.values()) {
        if (match.status === "LIVE" && match.clock.isLive) {
          match.clock.minute = Math.min(match.clock.minute + 1, 90);
          match.clock.display = String(match.clock.minute);
          match.clock.lastUpdatedAt = Date.now();
          match.lastChangedAt = Date.now();

          // Phase transitions
          if (match.clock.minute === 45 && match.clock.phase === "1H") {
            match.clock.addedMinute = Math.floor(Math.random() * 4) + 1;
            match.clock.display = `45+${match.clock.addedMinute}`;
          }

          if (match.clock.minute >= 46 && match.clock.phase === "1H") {
            match.clock.phase = "HT";
            match.clock.display = "HT";
            match.clock.isLive = false;
            match.status = "HT";
          }
        }
      }
    }, 60000);
  }

  async getMatchSnapshot(matchId: MatchId): Promise<Match | null> {
    await this.simulateDelay();
    const match = this.matches.get(matchId);
    if (!match) return null;

    // Update lastUpdatedAt to simulate fresh data
    return {
      ...match,
      clock: {
        ...match.clock,
        lastUpdatedAt: Date.now(),
      },
      lastChangedAt: Date.now(),
    };
  }

  async getMatchEvents(matchId: MatchId): Promise<MatchEvent[]> {
    await this.simulateDelay();
    return MOCK_EVENTS[matchId] || [];
  }

  async getMatchLineups(matchId: MatchId): Promise<MatchLineups | null> {
    await this.simulateDelay();
    return MOCK_LINEUPS[matchId] || null;
  }

  async getMatchStats(matchId: MatchId): Promise<MatchStats | null> {
    await this.simulateDelay();
    return MOCK_STATS[matchId] || null;
  }

  async searchFixtures(query: {
    date?: string;
    competitionId?: string;
    status?: "live" | "upcoming" | "finished";
  }): Promise<Match[]> {
    await this.simulateDelay();

    let results = Array.from(this.matches.values());

    if (query.competitionId) {
      results = results.filter((m) => m.competition.id === query.competitionId);
    }

    if (query.status) {
      switch (query.status) {
        case "live":
          results = results.filter((m) => m.status === "LIVE" || m.status === "HT");
          break;
        case "upcoming":
          results = results.filter((m) => m.status === "NS");
          break;
        case "finished":
          results = results.filter((m) => m.status === "FT" || m.status === "AET");
          break;
      }
    }

    return results;
  }

  async getAllLiveMatches(): Promise<Match[]> {
    await this.simulateDelay();
    // Return all LIVE and HT matches from mock data
    return Array.from(this.matches.values()).filter(
      (m) => m.status === "LIVE" || m.status === "HT"
    );
  }

  getAvailableMatches(): Match[] {
    return Array.from(this.matches.values());
  }

  async getAllLiveMatchesWithDetails(): Promise<BatchMatchData[]> {
    await this.simulateDelay();
    const liveMatches = Array.from(this.matches.values()).filter(
      (m) => m.status === "LIVE" || m.status === "HT"
    );

    return liveMatches.map((match) => ({
      match,
      events: MOCK_EVENTS[match.id] || [],
      stats: MOCK_STATS[match.id] || null,
      lineups: MOCK_LINEUPS[match.id] || null,
    }));
  }

  async getBatchMatchData(
    matchIds: MatchId[],
    options?: {
      events?: boolean;
      stats?: boolean;
      lineups?: boolean;
    }
  ): Promise<BatchMatchData[]> {
    await this.simulateDelay();

    const results: BatchMatchData[] = [];
    for (const matchId of matchIds) {
      const match = this.matches.get(matchId);
      if (match) {
        results.push({
          match,
          events: options?.events !== false ? MOCK_EVENTS[matchId] || [] : undefined,
          stats: options?.stats !== false ? MOCK_STATS[matchId] || null : undefined,
          lineups: options?.lineups !== false ? MOCK_LINEUPS[matchId] || null : undefined,
        });
      }
    }
    return results;
  }

  private async simulateDelay(): Promise<void> {
    // Simulate network latency (50-150ms)
    const delay = 50 + Math.random() * 100;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  dispose(): void {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
    this.ready = false;
    console.log(`[MockProvider] Disposed`);
  }
}
