/**
 * Unit tests for SportMonks mapper functions
 */
import { describe, it, expect } from "vitest";
import { mapScore, mapClock, mapMatch, mapEvents } from "../mapper";
import type { SMFixture, SMScore, SMState, SMParticipant, SMEvent } from "../types";

// Helper to create minimal SMState for testing
function createMockState(developerName: string): SMState {
  return {
    id: 1,
    state: developerName,
    name: developerName,
    short_name: developerName.substring(0, 3).toUpperCase(),
    developer_name: developerName,
  };
}

describe("mapScore", () => {
  it("should return 0-0 for empty scores", () => {
    expect(mapScore([])).toEqual({ home: 0, away: 0 });
  });

  it("should return 0-0 for undefined scores", () => {
    expect(mapScore(undefined)).toEqual({ home: 0, away: 0 });
  });

  it("should prioritize CURRENT score", () => {
    const scores: SMScore[] = [
      { description: "1ST_HALF", score: { participant: "home", goals: 1 } },
      { description: "1ST_HALF", score: { participant: "away", goals: 0 } },
      { description: "CURRENT", score: { participant: "home", goals: 2 } },
      { description: "CURRENT", score: { participant: "away", goals: 1 } },
    ];

    const result = mapScore(scores);
    expect(result).toEqual({ home: 2, away: 1 });
  });

  it("should fallback to 2ND_HALF if no CURRENT", () => {
    const scores: SMScore[] = [
      { description: "1ST_HALF", score: { participant: "home", goals: 1 } },
      { description: "1ST_HALF", score: { participant: "away", goals: 0 } },
      { description: "2ND_HALF", score: { participant: "home", goals: 3 } },
      { description: "2ND_HALF", score: { participant: "away", goals: 2 } },
    ];

    expect(mapScore(scores)).toEqual({ home: 3, away: 2 });
  });

  it("should fallback to 1ST_HALF if no CURRENT or 2ND_HALF", () => {
    const scores: SMScore[] = [
      { description: "1ST_HALF", score: { participant: "home", goals: 1 } },
      { description: "1ST_HALF", score: { participant: "away", goals: 0 } },
    ];

    expect(mapScore(scores)).toEqual({ home: 1, away: 0 });
  });

  it("should handle missing participant in score", () => {
    const scores: SMScore[] = [
      { description: "CURRENT", score: { participant: "home", goals: 2 } },
      // Away score missing
    ];

    expect(mapScore(scores)).toEqual({ home: 2, away: 0 });
  });
});

describe("mapClock", () => {
  it("should map NS state to PRE phase", () => {
    const result = mapClock(createMockState("NS"));
    expect(result.phase).toBe("PRE");
    expect(result.isLive).toBe(false);
  });

  it("should map INPLAY_1ST_HALF to 1H phase with isLive=true", () => {
    const result = mapClock(createMockState("INPLAY_1ST_HALF"));
    expect(result.phase).toBe("1H");
    expect(result.isLive).toBe(true);
  });

  it("should map HT state correctly", () => {
    const result = mapClock(createMockState("HT"));
    expect(result.phase).toBe("HT");
    expect(result.display).toBe("HT");
    expect(result.minute).toBe(45);
    expect(result.isLive).toBe(false);
  });

  it("should map INPLAY_2ND_HALF to 2H phase", () => {
    const result = mapClock(createMockState("INPLAY_2ND_HALF"));
    expect(result.phase).toBe("2H");
    expect(result.isLive).toBe(true);
  });

  it("should map FT to FT phase", () => {
    const result = mapClock(createMockState("FT"));
    expect(result.phase).toBe("FT");
    expect(result.isLive).toBe(false);
  });

  it("should calculate minute from periods when available", () => {
    const fixture: SMFixture = {
      id: 1,
      sport_id: 1,
      league_id: 1,
      season_id: 1,
      starting_at: "2026-01-24T15:00:00Z",
      starting_at_timestamp: 1737730800,
      state: createMockState("INPLAY_1ST_HALF"),
      periods: [
        {
          id: 1,
          fixture_id: 1,
          type_id: 1,
          started: Math.floor(Date.now() / 1000) - 1500,
          ended: null,
          counts_from: 0,
          ticking: true,
          sort_order: 1,
          description: "1st Half",
          time_added: null,
          period_length: 45,
          minutes: 25,
          seconds: 0,
          has_timer: true,
        },
      ],
    };

    const result = mapClock(fixture.state, fixture);
    expect(result.minute).toBe(25);
  });
});

describe("mapMatch", () => {
  const createMinimalFixture = (overrides: Partial<SMFixture> = {}): SMFixture => ({
    id: 12345,
    sport_id: 1,
    league_id: 100,
    season_id: 200,
    starting_at: "2026-01-24T20:00:00Z",
    starting_at_timestamp: 1737748800,
    participants: [
      {
        id: 1,
        name: "Home Team FC",
        short_code: "HTF",
        image_path: "https://example.com/home.png",
        meta: { location: "home" },
      },
      {
        id: 2,
        name: "Away Team United",
        short_code: "ATU",
        image_path: "https://example.com/away.png",
        meta: { location: "away" },
      },
    ] as SMParticipant[],
    scores: [
      { description: "CURRENT", score: { participant: "home", goals: 2 } },
      { description: "CURRENT", score: { participant: "away", goals: 1 } },
    ],
    state: createMockState("INPLAY_2ND_HALF"),
    league: {
      id: 100,
      name: "Premier League",
      short_code: "PL",
      country_id: 1,
      image_path: "https://example.com/pl.png",
    },
    ...overrides,
  });

  it("should map a complete fixture to Match", () => {
    const fixture = createMinimalFixture();
    const match = mapMatch(fixture);

    expect(match).not.toBeNull();
    expect(match?.id).toBe("12345");
    expect(match?.homeTeam.name).toBe("Home Team FC");
    expect(match?.awayTeam.name).toBe("Away Team United");
    expect(match?.score).toEqual({ home: 2, away: 1 });
    expect(match?.status).toBe("LIVE");
  });

  it("should return null for fixture without participants", () => {
    const fixture = createMinimalFixture({ participants: [] });
    expect(mapMatch(fixture)).toBeNull();
  });

  it("should return null for fixture without home team", () => {
    const fixture = createMinimalFixture({
      participants: [
        {
          id: 2,
          name: "Away Team",
          short_code: "AT",
          meta: { location: "away" },
        },
      ] as SMParticipant[],
    });
    expect(mapMatch(fixture)).toBeNull();
  });

  it("should map competition info correctly", () => {
    const fixture = createMinimalFixture();
    const match = mapMatch(fixture);

    expect(match?.competition.id).toBe("100");
    expect(match?.competition.name).toBe("Premier League");
  });

  it("should handle missing league gracefully", () => {
    const fixture = createMinimalFixture({ league: undefined });
    const match = mapMatch(fixture);

    expect(match).not.toBeNull();
    expect(match?.competition.id).toBe("100"); // Falls back to league_id
    expect(match?.competition.name).toBe("Unknown League");
  });
});

describe("mapEvents", () => {
  const createFixtureWithEvents = (events: SMEvent[]): SMFixture => ({
    id: 12345,
    sport_id: 1,
    league_id: 100,
    season_id: 200,
    starting_at: "2026-01-24T20:00:00Z",
    starting_at_timestamp: 1737748800,
    participants: [
      {
        id: 1,
        name: "Home Team",
        short_code: "HT",
        meta: { location: "home" },
      },
      {
        id: 2,
        name: "Away Team",
        short_code: "AT",
        meta: { location: "away" },
      },
    ] as SMParticipant[],
    events,
  });

  it("should return empty array for fixture without events", () => {
    const fixture = createFixtureWithEvents([]);
    expect(mapEvents(fixture)).toEqual([]);
  });

  it("should map goal events correctly", () => {
    const fixture = createFixtureWithEvents([
      {
        id: 1,
        type_id: 14, // GOAL
        participant_id: 1,
        player_name: "John Striker",
        minute: 23,
      },
    ]);

    const events = mapEvents(fixture);
    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe("GOAL");
    expect(events[0].teamSide).toBe("HOME");
    expect(events[0].player?.name).toBe("John Striker");
    expect(events[0].minute).toBe(23);
  });

  it("should map yellow card events correctly", () => {
    const fixture = createFixtureWithEvents([
      {
        id: 2,
        type_id: 19, // YELLOW CARD
        participant_id: 2,
        player_name: "Bad Tackle",
        minute: 45,
      },
    ]);

    const events = mapEvents(fixture);
    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe("YELLOW");
    expect(events[0].teamSide).toBe("AWAY");
  });

  it("should map red card events correctly", () => {
    const fixture = createFixtureWithEvents([
      {
        id: 3,
        type_id: 20, // RED CARD
        participant_id: 1,
        player_name: "Sent Off",
        minute: 67,
      },
    ]);

    const events = mapEvents(fixture);
    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe("RED");
  });

  it("should filter out unknown event types", () => {
    const fixture = createFixtureWithEvents([
      {
        id: 1,
        type_id: 14, // GOAL - known
        participant_id: 1,
        minute: 10,
      },
      {
        id: 2,
        type_id: 9999, // Unknown type
        participant_id: 1,
        minute: 20,
      },
    ]);

    const events = mapEvents(fixture);
    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe("GOAL");
  });

  it("should sort events by minute", () => {
    const fixture = createFixtureWithEvents([
      { id: 1, type_id: 14, participant_id: 1, minute: 45 },
      { id: 2, type_id: 14, participant_id: 2, minute: 10 },
      { id: 3, type_id: 14, participant_id: 1, minute: 78 },
    ]);

    const events = mapEvents(fixture);
    expect(events.map((e) => e.minute)).toEqual([10, 45, 78]);
  });
});
