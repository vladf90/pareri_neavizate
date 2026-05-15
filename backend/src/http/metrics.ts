/**
 * Metrics endpoint for monitoring server health and performance.
 *
 * Provides:
 * - Server uptime and memory usage
 * - WebSocket client counts by role
 * - Provider status and health
 * - Cache statistics
 * - State metrics
 *
 * Prometheus-compatible format available at /metrics/prometheus
 */

import { Application, Request, Response } from "express";
import type { AppStateStore } from "../store/AppStateStore.js";
import type { WsServer } from "../ws/WsServer.js";
import type { WidgetDataCache } from "../services/WidgetDataCache.js";
import { apiLogger } from "../utils/logger.js";

export interface MetricsConfig {
  store: AppStateStore;
  wsServer: WsServer;
  widgetCache?: WidgetDataCache;
}

export function setupMetrics(app: Application, config: MetricsConfig): void {
  const { store, wsServer, widgetCache } = config;

  /**
   * JSON metrics endpoint - detailed server metrics
   */
  app.get("/metrics", (_req: Request, res: Response) => {
    try {
      const state = store.getState();
      const clients = wsServer.getClients();
      const memoryUsage = process.memoryUsage();

      const metrics = {
        // Server metrics
        server: {
          uptime: Math.round(process.uptime()),
          uptimeFormatted: formatUptime(process.uptime()),
          memory: {
            heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
            heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
            rss: Math.round(memoryUsage.rss / 1024 / 1024),
            external: Math.round(memoryUsage.external / 1024 / 1024),
          },
          nodeVersion: process.version,
        },

        // WebSocket metrics
        websocket: {
          totalClients: clients.length,
          byRole: {
            admin: clients.filter((c) => c.role === "admin").length,
            overlay: clients.filter((c) => c.role === "overlay").length,
            unknown: clients.filter((c) => !c.role).length,
          },
        },

        // State metrics
        state: {
          mainMatchSelected: !!state.selection.mainMatchId,
          mainMatchId: state.selection.mainMatchId,
          tickerMatchCount: state.selection.tickerMatchIds.length,
          eventsCount: state.data.events.length,
          hasStats: !!state.data.stats,
          hasLineups: !!state.data.lineups,
          stateUpdatedAt: state.updatedAt,
        },

        // Provider metrics
        provider: {
          name: state.provider.name,
          status: state.provider.status,
          message: state.provider.message,
          lastSuccessAt: state.provider.lastSuccessAt,
          healthy: state.provider.status === "ok",
        },

        // Cache metrics (if widget cache is available)
        cache: widgetCache
          ? widgetCache.getDetailedCacheStats()
          : { caches: {}, revalidating: 0, totalEntries: 0 },

        // Timestamps
        timestamp: Date.now(),
        timestampISO: new Date().toISOString(),
      };

      res.json(metrics);
    } catch (err) {
      apiLogger.error({ err }, "Error generating metrics");
      res.status(500).json({ error: "Failed to generate metrics" });
    }
  });

  /**
   * Prometheus-compatible metrics endpoint
   */
  app.get("/metrics/prometheus", (_req: Request, res: Response) => {
    try {
      const state = store.getState();
      const clients = wsServer.getClients();
      const memoryUsage = process.memoryUsage();

      const lines: string[] = [
        // Server uptime
        "# HELP watchalong_uptime_seconds Server uptime in seconds",
        "# TYPE watchalong_uptime_seconds gauge",
        `watchalong_uptime_seconds ${Math.round(process.uptime())}`,
        "",

        // Memory
        "# HELP watchalong_memory_bytes Memory usage in bytes",
        "# TYPE watchalong_memory_bytes gauge",
        `watchalong_memory_bytes{type="heap_used"} ${memoryUsage.heapUsed}`,
        `watchalong_memory_bytes{type="heap_total"} ${memoryUsage.heapTotal}`,
        `watchalong_memory_bytes{type="rss"} ${memoryUsage.rss}`,
        "",

        // WebSocket clients
        "# HELP watchalong_ws_clients_total Total WebSocket clients",
        "# TYPE watchalong_ws_clients_total gauge",
        `watchalong_ws_clients_total{role="admin"} ${clients.filter((c) => c.role === "admin").length}`,
        `watchalong_ws_clients_total{role="overlay"} ${clients.filter((c) => c.role === "overlay").length}`,
        `watchalong_ws_clients_total{role="unknown"} ${clients.filter((c) => !c.role).length}`,
        "",

        // State metrics
        "# HELP watchalong_ticker_matches_total Total ticker matches",
        "# TYPE watchalong_ticker_matches_total gauge",
        `watchalong_ticker_matches_total ${state.selection.tickerMatchIds.length}`,
        "",

        "# HELP watchalong_events_total Total events in state",
        "# TYPE watchalong_events_total gauge",
        `watchalong_events_total ${state.data.events.length}`,
        "",

        // Provider status (1 = ok, 0 = not ok)
        "# HELP watchalong_provider_healthy Provider health status",
        "# TYPE watchalong_provider_healthy gauge",
        `watchalong_provider_healthy{provider="${state.provider.name}"} ${state.provider.status === "ok" ? 1 : 0}`,
        "",

        // Main match selected (1 = yes, 0 = no)
        "# HELP watchalong_main_match_selected Whether a main match is selected",
        "# TYPE watchalong_main_match_selected gauge",
        `watchalong_main_match_selected ${state.selection.mainMatchId ? 1 : 0}`,
        "",
      ];

      // Add cache metrics if available
      if (widgetCache) {
        const cacheStats = widgetCache.getDetailedCacheStats();
        lines.push(
          "# HELP watchalong_cache_entries Cache entries by type",
          "# TYPE watchalong_cache_entries gauge"
        );
        for (const [name, stats] of Object.entries(cacheStats.caches)) {
          lines.push(`watchalong_cache_entries{cache="${name}"} ${stats.size}`);
        }
        lines.push("");

        lines.push(
          "# HELP watchalong_cache_utilization_percent Cache utilization percentage",
          "# TYPE watchalong_cache_utilization_percent gauge"
        );
        for (const [name, stats] of Object.entries(cacheStats.caches)) {
          lines.push(`watchalong_cache_utilization_percent{cache="${name}"} ${stats.utilization}`);
        }
        lines.push("");

        lines.push(
          "# HELP watchalong_cache_revalidating Active revalidation requests",
          "# TYPE watchalong_cache_revalidating gauge",
          `watchalong_cache_revalidating ${cacheStats.revalidating}`,
          ""
        );
      }

      res.set("Content-Type", "text/plain; charset=utf-8");
      res.send(lines.join("\n"));
    } catch (err) {
      apiLogger.error({ err }, "Error generating Prometheus metrics");
      res.status(500).send("# Error generating metrics");
    }
  });

  /**
   * Simple health check endpoint (already exists in routes.ts, but this is more detailed)
   */
  app.get("/health/detailed", (_req: Request, res: Response) => {
    const state = store.getState();
    const clients = wsServer.getClients();

    const isHealthy =
      state.provider.status === "ok" && clients.length >= 0; // Basic health check

    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? "healthy" : "unhealthy",
      checks: {
        provider: {
          status: state.provider.status === "ok" ? "pass" : "fail",
          observedValue: state.provider.status,
          observedUnit: "status",
        },
        websocket: {
          status: "pass",
          observedValue: clients.length,
          observedUnit: "connections",
        },
        memory: {
          status: process.memoryUsage().heapUsed < 500 * 1024 * 1024 ? "pass" : "warn",
          observedValue: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          observedUnit: "MB",
        },
      },
      version: "1.0.0",
      uptime: Math.round(process.uptime()),
    });
  });

  apiLogger.info("Metrics endpoints configured: /metrics, /metrics/prometheus, /health/detailed");
}

/**
 * Format uptime in human-readable format
 */
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(" ");
}
