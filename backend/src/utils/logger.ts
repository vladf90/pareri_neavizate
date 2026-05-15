/**
 * Structured Logger using Pino
 * Replaces console.log with proper logging levels and JSON output
 */

import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

// Main logger instance
export const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? "debug" : "info"),
  transport: isDev
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      }
    : undefined,
  base: {
    service: "watchalong-server",
    version: "1.0.0",
  },
});

// Child loggers for different modules
export const wsLogger = logger.child({ module: "websocket" });
export const apiLogger = logger.child({ module: "api" });
export const pollLogger = logger.child({ module: "polling" });
export const providerLogger = logger.child({ module: "provider" });
export const storeLogger = logger.child({ module: "store" });
export const cacheLogger = logger.child({ module: "cache" });
export const tipeeLogger = logger.child({ module: "tipeestream" });

export default logger;
