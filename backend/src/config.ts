/**
 * Application Configuration with Zod Validation
 * Validates environment variables at startup
 */

import dotenv from "dotenv";
import { z } from "zod";
import path from "path";
import { fileURLToPath } from "url";

// Load .env from backend/ (one level up from src/ or dist/)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverPkgDir = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(serverPkgDir, ".env") });

// Environment schema with validation and defaults
const envSchema = z.object({
  // Server
  PORT: z
    .string()
    .transform(Number)
    .pipe(z.number().min(1).max(65535))
    .default(3001),
  HOST: z.string().default("localhost"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // Provider
  PROVIDER: z.enum(["sportmonks", "mock"]).default("mock"),

  // SportMonks
  SPORTMONKS_BASE_URL: z.string().url().default("https://api.sportmonks.com"),
  SPORTMONKS_TOKEN: z.string().optional(),

  // TipeeStream
  TIPEESTREAM_API_KEY: z.string().optional(),

  // Polling (ms)
  POLL_MAIN_MATCH_MS: z
    .string()
    .transform(Number)
    .pipe(z.number().min(100))
    .default(500),
  POLL_TICKER_MS: z
    .string()
    .transform(Number)
    .pipe(z.number().min(100))
    .default(500),
  POLL_LIVESCORES_MS: z
    .string()
    .transform(Number)
    .pipe(z.number().min(1000))
    .default(1500),
  POLL_FIXTURES_MS: z
    .string()
    .transform(Number)
    .pipe(z.number().min(60000))
    .default(300000),
  // NEW: Consolidated orchestrator polling (per new architecture)
  POLL_FIXTURE_ORCHESTRATOR_MS: z
    .string()
    .transform(Number)
    .pipe(z.number().min(1000))
    .default(2000),
  POLL_STANDINGS_MS: z
    .string()
    .transform(Number)
    .pipe(z.number().min(5000))
    .default(10000),

  // Persistence
  STATE_FILE_PATH: z.string().default("./data/state.json"),
  PERSIST_DEBOUNCE_MS: z
    .string()
    .transform(Number)
    .pipe(z.number().min(100))
    .default(500),

  // Logging
  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal"])
    .default("info"),
});

// Parse environment with validation
const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
  console.error("❌ Invalid environment configuration:");
  console.error(parseResult.error.format());
  process.exit(1);
}

const env = parseResult.data;

// Export validated config
export const config = {
  // Server
  port: env.PORT,
  host: env.HOST,
  nodeEnv: env.NODE_ENV,

  // Provider
  provider: env.PROVIDER,

  // SportMonks
  sportmonks: {
    baseUrl: env.SPORTMONKS_BASE_URL,
    token: env.SPORTMONKS_TOKEN || "",
  },

  // TipeeStream
  tipeestream: {
    apiKey: env.TIPEESTREAM_API_KEY || "",
  },

  // Polling intervals (ms)
  pollMainMatchMs: env.POLL_MAIN_MATCH_MS,
  pollTickerMs: env.POLL_TICKER_MS,
  pollLivescoresMs: env.POLL_LIVESCORES_MS,
  pollFixturesMs: env.POLL_FIXTURES_MS,
  // NEW: Consolidated orchestrator polling intervals
  pollFixtureOrchestratorMs: env.POLL_FIXTURE_ORCHESTRATOR_MS,
  pollStandingsMs: env.POLL_STANDINGS_MS,

  // Persistence
  stateFilePath: env.STATE_FILE_PATH,
  persistDebounceMs: env.PERSIST_DEBOUNCE_MS,

  // Logging
  logLevel: env.LOG_LEVEL,

  // Derived
  isProduction: env.NODE_ENV === "production",
  isDevelopment: env.NODE_ENV === "development",
} as const;

export type Config = typeof config;
