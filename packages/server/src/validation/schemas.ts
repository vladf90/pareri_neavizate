/**
 * Validation Schemas for WebSocket Messages
 * Uses Zod for runtime type validation
 */

import { z } from "zod";

// ==================== BASE SCHEMAS ====================

/** Match ID validation (alphanumeric with underscores/hyphens) */
const matchIdSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9_-]+$/, "Invalid match ID format");

/** Theme ID validation */
const themeIdSchema = z.string().min(1).max(50);

// ==================== ADMIN ACTION SCHEMAS ====================

/** admin:setMainMatch payload */
export const adminSetMainMatchSchema = z.object({
  matchId: matchIdSchema.nullable(),
});

/** admin:setTickerMatches payload */
export const adminSetTickerMatchesSchema = z.object({
  matchIds: z.array(matchIdSchema).max(20, "Maximum 20 ticker matches allowed"),
});

/** admin:setTheme payload */
export const adminSetThemeSchema = z.object({
  themeId: themeIdSchema,
});

/** admin:setOverlayToggles payload */
export const adminSetTogglesSchema = z.object({
  toggles: z.record(z.string(), z.boolean()).optional(),
});

/** admin:testEvent payload */
export const adminTestEventSchema = z.object({
  matchId: matchIdSchema.optional(),
  event: z.object({
    kind: z.enum(["GOAL", "YELLOW", "RED", "SUB", "VAR", "INFO"]),
    team: z.enum(["HOME", "AWAY"]),
    label: z.string().max(100).optional(),
    player: z.string().max(100).optional(),
    minute: z.number().int().min(0).max(150).optional(),
  }),
});

/** admin:hello payload */
export const adminHelloSchema = z.object({
  role: z.literal("admin"),
  clientId: z.string().min(1).max(100),
  pin: z.string().max(50).optional(),
});

/** overlay:hello payload */
export const overlayHelloSchema = z.object({
  role: z.literal("overlay"),
  clientId: z.string().min(1).max(100),
  overlay: z.enum([
    "hud",
    "ticker",
    "lineup",
    "standings",
    "h2h",
    "form",
    "topscorers",
    "stats",
    "livestandings",
    "master",
    "resolume",
    "versus",
  ]),
  format: z.enum(["16x9", "9x16", "custom"]).optional(),
});

// ==================== WIDGET REQUEST SCHEMAS ====================

export const requestStandingsSchema = z.object({
  seasonId: z.string().min(1).max(50),
});

export const requestH2HSchema = z.object({
  team1Id: z.string().min(1).max(50),
  team2Id: z.string().min(1).max(50),
});

export const requestTeamFormSchema = z.object({
  teamId: z.string().min(1).max(50),
});

export const requestTopScorersSchema = z.object({
  seasonId: z.string().min(1).max(50),
  limit: z.number().int().min(1).max(50).optional(),
});

export const requestLineupsSchema = z.object({
  fixtureId: z.string().min(1).max(50),
});

export const requestMatchWidgetsSchema = z.object({
  matchId: matchIdSchema,
});

// ==================== VERSUS SCHEMAS ====================

const playerStatsSchema = z.object({
  goals: z.number(),
  assists: z.number(),
  appearances: z.number(),
  minutes: z.number(),
  rating: z.number().nullable(),
});

const playerDataSchema = z.object({
  id: z.number(),
  name: z.string(),
  firstname: z.string(),
  lastname: z.string(),
  photoUrl: z.string().optional().nullable(),
  position: z.string(),
  height: z.number().optional().nullable(),
  weight: z.number().optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  nationality: z.string().optional().nullable(),
  marketValue: z
    .object({
      value: z.number(),
      currency: z.string(),
    })
    .nullable()
    .optional(),
  statistics: playerStatsSchema,
});

export const adminShowVersusSchema = z.object({
  player1: playerDataSchema,
  player2: playerDataSchema,
});

export const adminHideVersusSchema = z.object({});

// ==================== RESOLUME SCHEMAS ====================

const resolumeWidgetTypeSchema = z.enum(["none", "livestandings", "livestandings-ucl1", "livestandings-ucl2", "versus", "scoreboard", "ticker", "custom"]);

const resolumeZoneSchema = z.object({
  id: z.string().min(1).max(50),
  name: z.string().max(100).optional(),
  widgetType: resolumeWidgetTypeSchema.optional(),
  x: z.number().int().min(0).max(10000).optional(),
  y: z.number().int().min(0).max(10000).optional(),
  width: z.number().int().min(1).max(10000).optional(),
  height: z.number().int().min(1).max(10000).optional(),
  scale: z.number().min(0.1).max(10).optional(),
  spanZones: z.array(z.string().min(1).max(50)).optional(),
  visible: z.boolean().optional(),
});

export const adminSetResolumeConfigSchema = z.object({
  config: z.object({
    canvasWidth: z.number().int().min(100).max(20000),
    canvasHeight: z.number().int().min(100).max(20000),
    backgroundColor: z.string().max(50).optional(),
    zones: z.array(resolumeZoneSchema),
    lastUpdatedAt: z.number().optional(),
  }),
});

export const adminUpdateResolumeZoneSchema = z.object({
  zoneId: z.string().min(1).max(50),
  updates: z.object({
    name: z.string().max(100).optional(),
    widgetType: resolumeWidgetTypeSchema.optional(),
    x: z.number().int().min(0).max(10000).optional(),
    y: z.number().int().min(0).max(10000).optional(),
    width: z.number().int().min(1).max(10000).optional(),
    height: z.number().int().min(1).max(10000).optional(),
    scale: z.number().min(0.1).max(10).optional(),
    spanZones: z.array(z.string().min(1).max(50)).nullable().optional(),
    visible: z.boolean().optional(),
  }),
});

// ==================== MESSAGE TYPE TO SCHEMA MAPPING ====================

export const messageSchemas = {
  "admin:hello": adminHelloSchema,
  "overlay:hello": overlayHelloSchema,
  "admin:setMainMatch": adminSetMainMatchSchema,
  "admin:setTickerMatches": adminSetTickerMatchesSchema,
  "admin:setTheme": adminSetThemeSchema,
  "admin:setOverlayToggles": adminSetTogglesSchema,
  "admin:testEvent": adminTestEventSchema,
  "admin:clearMainMatch": z.object({}),
  "admin:clearTicker": z.object({}),
  "admin:resetSession": z.object({}),
  "admin:setResolumeConfig": adminSetResolumeConfigSchema,
  "admin:updateResolumeZone": adminUpdateResolumeZoneSchema,
  "admin:showVersus": adminShowVersusSchema,
  "admin:hideVersus": adminHideVersusSchema,
  "widget:requestStandings": requestStandingsSchema,
  "widget:requestH2H": requestH2HSchema,
  "widget:requestTeamForm": requestTeamFormSchema,
  "widget:requestTopScorers": requestTopScorersSchema,
  "widget:requestLineups": requestLineupsSchema,
  "widget:requestMatchWidgets": requestMatchWidgetsSchema,
} as const;

export type MessageType = keyof typeof messageSchemas;

/**
 * Validates a message payload against its schema
 * @returns The validated payload or null if validation fails
 */
export function validatePayload<T extends MessageType>(
  type: T,
  payload: unknown
): z.infer<(typeof messageSchemas)[T]> | null {
  const schema = messageSchemas[type];
  if (!schema) return null;

  const result = schema.safeParse(payload);
  if (!result.success) {
    return null;
  }

  return result.data as z.infer<(typeof messageSchemas)[T]>;
}

/**
 * Validates a message payload and returns detailed error
 */
export function validatePayloadWithError<T extends MessageType>(
  type: T,
  payload: unknown
): { success: true; data: z.infer<(typeof messageSchemas)[T]> } | { success: false; error: string } {
  const schema = messageSchemas[type];
  if (!schema) {
    return { success: false, error: `Unknown message type: ${type}` };
  }

  const result = schema.safeParse(payload);
  if (!result.success) {
    const errors = result.error.issues
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join(", ");
    return { success: false, error: errors };
  }

  return { success: true, data: result.data as z.infer<(typeof messageSchemas)[T]> };
}
