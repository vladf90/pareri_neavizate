/**
 * Unit tests for Zod validation schemas
 */
import { describe, it, expect } from "vitest";
import {
  adminSetMainMatchSchema,
  adminSetTickerMatchesSchema,
  adminSetTogglesSchema,
  adminTestEventSchema,
  validatePayload,
  validatePayloadWithError,
} from "../schemas";

describe("adminSetMainMatchSchema", () => {
  it("should accept valid matchId string", () => {
    const result = adminSetMainMatchSchema.safeParse({ matchId: "12345" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.matchId).toBe("12345");
    }
  });

  it("should accept null matchId (to clear selection)", () => {
    const result = adminSetMainMatchSchema.safeParse({ matchId: null });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.matchId).toBeNull();
    }
  });

  it("should reject empty string matchId", () => {
    const result = adminSetMainMatchSchema.safeParse({ matchId: "" });
    expect(result.success).toBe(false);
  });

  it("should reject missing matchId", () => {
    const result = adminSetMainMatchSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("should reject non-string matchId", () => {
    const result = adminSetMainMatchSchema.safeParse({ matchId: 12345 });
    expect(result.success).toBe(false);
  });
});

describe("adminSetTickerMatchesSchema", () => {
  it("should accept valid array of matchIds", () => {
    const result = adminSetTickerMatchesSchema.safeParse({
      matchIds: ["1", "2", "3"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.matchIds).toEqual(["1", "2", "3"]);
    }
  });

  it("should accept empty array", () => {
    const result = adminSetTickerMatchesSchema.safeParse({ matchIds: [] });
    expect(result.success).toBe(true);
  });

  it("should reject array with more than 20 items", () => {
    const result = adminSetTickerMatchesSchema.safeParse({
      matchIds: Array(21).fill("1"),
    });
    expect(result.success).toBe(false);
  });

  it("should reject array with empty strings", () => {
    const result = adminSetTickerMatchesSchema.safeParse({
      matchIds: ["1", "", "3"],
    });
    expect(result.success).toBe(false);
  });

  it("should reject non-array", () => {
    const result = adminSetTickerMatchesSchema.safeParse({
      matchIds: "1,2,3",
    });
    expect(result.success).toBe(false);
  });
});

describe("adminSetTogglesSchema", () => {
  it("should accept valid toggle object", () => {
    const result = adminSetTogglesSchema.safeParse({
      toggles: {
        customToggle1: true,
        customToggle2: false,
      },
    });
    expect(result.success).toBe(true);
  });

  it("should accept partial toggles", () => {
    const result = adminSetTogglesSchema.safeParse({
      toggles: {
        anyToggle: true,
      },
    });
    expect(result.success).toBe(true);
  });

  it("should accept empty toggles object", () => {
    const result = adminSetTogglesSchema.safeParse({
      toggles: {},
    });
    expect(result.success).toBe(true);
  });

  it("should reject non-boolean toggle values", () => {
    const result = adminSetTogglesSchema.safeParse({
      toggles: {
        badToggle: "true",
      },
    });
    expect(result.success).toBe(false);
  });

  it("should ignore unknown toggle keys (passthrough)", () => {
    const result = adminSetTogglesSchema.safeParse({
      toggles: {
        unknownToggle: true,
      },
    });
    // Not using strict(), so unknown keys are passed through
    expect(result.success).toBe(true);
  });
});

describe("adminTestEventSchema", () => {
  it("should accept valid test event", () => {
    const result = adminTestEventSchema.safeParse({
      matchId: "12345",
      event: {
        kind: "GOAL",
        team: "HOME",
        player: "John Striker",
        minute: 45,
      },
    });
    expect(result.success).toBe(true);
  });

  it("should accept event without optional fields", () => {
    const result = adminTestEventSchema.safeParse({
      event: {
        kind: "YELLOW",
        team: "AWAY",
      },
    });
    expect(result.success).toBe(true);
  });

  it("should reject invalid event kind", () => {
    const result = adminTestEventSchema.safeParse({
      event: {
        kind: "INVALID_KIND",
        team: "HOME",
      },
    });
    expect(result.success).toBe(false);
  });

  it("should reject invalid team", () => {
    const result = adminTestEventSchema.safeParse({
      event: {
        kind: "GOAL",
        team: "NEUTRAL",
      },
    });
    expect(result.success).toBe(false);
  });

  it("should reject minute out of range", () => {
    const result = adminTestEventSchema.safeParse({
      event: {
        kind: "GOAL",
        team: "HOME",
        minute: 200,
      },
    });
    expect(result.success).toBe(false);
  });

  it("should reject player name too long", () => {
    const result = adminTestEventSchema.safeParse({
      event: {
        kind: "GOAL",
        team: "HOME",
        player: "A".repeat(101),
      },
    });
    expect(result.success).toBe(false);
  });
});

describe("validatePayload", () => {
  it("should return data with valid payload", () => {
    const result = validatePayload("admin:setMainMatch", { matchId: "123" });
    expect(result).not.toBeNull();
    expect(result?.matchId).toBe("123");
  });

  it("should return null with invalid payload", () => {
    const result = validatePayload("admin:setMainMatch", { matchId: "" });
    expect(result).toBeNull();
  });

  it("should return null for unknown message type", () => {
    const result = validatePayload("unknown:type" as any, {});
    expect(result).toBeNull();
  });
});

describe("validatePayloadWithError", () => {
  it("should return success with valid payload", () => {
    const result = validatePayloadWithError("admin:setMainMatch", { matchId: "123" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.matchId).toBe("123");
    }
  });

  it("should return error with invalid payload", () => {
    const result = validatePayloadWithError("admin:setMainMatch", { matchId: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
    }
  });

  it("should return error for unknown message type", () => {
    const result = validatePayloadWithError("unknown:type" as any, {});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Unknown message type");
    }
  });
});
