/**
 * Unit tests for client appStore
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

// Mock the WS client
vi.mock("@/ws", () => ({
  getWsClient: vi.fn().mockReturnValue({
    send: vi.fn(),
  }),
}));

// Mock the config
vi.mock("@/config", () => ({
  API_BASE_URL: "http://localhost:3001",
}));

// Import after mocks
import { useAppStore } from "../appStore";
import type { AppState } from "@parerineavizate/shared/models";

const createMockState = (): AppState => ({
  schemaVersion: 1,
  updatedAt: Date.now(),
  provider: {
    name: "sportmonks",
    status: "ok",
  },
  selection: {
    mainMatchId: null,
    tickerMatchIds: [],
    themeId: "UCL",
    toggles: {},
  },
  data: {
    mainMatch: undefined,
    tickerMatches: [],
    events: [],
    lineups: undefined,
    stats: undefined,
  },
  ui: {
    operatorNotes: undefined,
  },
});

describe("useAppStore", () => {
  beforeEach(() => {
    // Reset store between tests
    const { result } = renderHook(() => useAppStore());
    act(() => {
      result.current.setAppState(null as unknown as AppState);
      result.current.setConnectionStatus("disconnected");
    });
  });

  describe("initial state", () => {
    it("should have null appState initially", () => {
      const { result } = renderHook(() => useAppStore());
      expect(result.current.appState).toBeNull();
    });

    it("should be disconnected initially", () => {
      const { result } = renderHook(() => useAppStore());
      expect(result.current.connectionStatus).toBe("disconnected");
    });

    it("should have empty availableMatches", () => {
      const { result } = renderHook(() => useAppStore());
      expect(result.current.availableMatches).toEqual([]);
    });

    it("should have today's date as selectedDate", () => {
      const { result } = renderHook(() => useAppStore());
      const today = new Date().toISOString().split("T")[0];
      expect(result.current.selectedDate).toBe(today);
    });
  });

  describe("setAppState", () => {
    it("should update appState", () => {
      const { result } = renderHook(() => useAppStore());
      const mockState = createMockState();

      act(() => {
        result.current.setAppState(mockState);
      });

      expect(result.current.appState).toEqual(mockState);
    });
  });

  describe("setConnectionStatus", () => {
    it("should update connectionStatus", () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setConnectionStatus("connected");
      });

      expect(result.current.connectionStatus).toBe("connected");
    });

    it("should handle all status values", () => {
      const { result } = renderHook(() => useAppStore());
      const statuses: Array<"connected" | "disconnected" | "reconnecting"> = [
        "connected",
        "disconnected",
        "reconnecting",
      ];

      statuses.forEach((status) => {
        act(() => {
          result.current.setConnectionStatus(status);
        });
        expect(result.current.connectionStatus).toBe(status);
      });
    });
  });

  describe("handleServerMessage", () => {
    it("should update state on server:hello message", () => {
      const { result } = renderHook(() => useAppStore());
      const mockState = createMockState();

      act(() => {
        result.current.handleServerMessage({
          type: "server:hello",
          schemaVersion: 1,
          ts: Date.now(),
          payload: { serverTime: Date.now(), state: mockState },
        });
      });

      expect(result.current.appState).toEqual(mockState);
    });

    it("should update state on state:update message", () => {
      const { result } = renderHook(() => useAppStore());
      const mockState = createMockState();

      act(() => {
        result.current.handleServerMessage({
          type: "state:update",
          schemaVersion: 1,
          ts: Date.now(),
          payload: { state: mockState },
        });
      });

      expect(result.current.appState).toEqual(mockState);
    });
  });

  describe("setSelectedDate", () => {
    it("should update selectedDate", () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setSelectedDate("2026-01-25");
      });

      expect(result.current.selectedDate).toBe("2026-01-25");
    });
  });

  describe("setSelectedLeagueId", () => {
    it("should update selectedLeagueId", () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setSelectedLeagueId("123");
      });

      expect(result.current.selectedLeagueId).toBe("123");
    });

    it("should allow clearing with null", () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setSelectedLeagueId("123");
        result.current.setSelectedLeagueId(null);
      });

      expect(result.current.selectedLeagueId).toBeNull();
    });
  });
});
