import { createServer } from "http";
import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { initStore } from "./store/index.js";
import { WsServer, createMessageHandler } from "./ws/index.js";
import { ProviderRegistry } from "./providers/index.js";
import { PollingManager } from "./polling/index.js";
import { createHttpRoutes, setupMetrics } from "./http/index.js";
import { logger } from "./utils/logger.js";
import { WidgetDataCache } from "./services/WidgetDataCache.js";
import { SportMonksClient } from "./providers/sportmonks/client.js";
import { TipeeStreamManager } from "./tipeestream/index.js";

async function main() {
  logger.info("=========================================");
  logger.info("  watchalong-graphics server v1.0.0");
  logger.info("=========================================");
  logger.info({ provider: config.provider, port: config.port }, "Server configuration");

  // Initialize store
  const store = initStore();
  logger.info("Store initialized");

  // Initialize provider registry
  const providerRegistry = new ProviderRegistry();
  await providerRegistry.init();
  logger.info("Provider registry initialized");

  // Update store with provider info
  store.setProvider(providerRegistry.getProviderInfo());

  // Create Express app
  const app = express();
  app.use(cors()); // Enable CORS for all origins
  app.use(express.json());

  // Create HTTP server
  const httpServer = createServer(app);

  // Create WebSocket server
  const wsServer = new WsServer(() => store.getState());
  wsServer.attach(httpServer, "/ws");
  logger.info("WebSocket server attached");

  // Set up message handler
  const messageHandler = createMessageHandler(store, wsServer, providerRegistry);
  wsServer.setMessageHandler(messageHandler);

  // Subscribe to state updates and broadcast
  store.subscribe((state) => {
    wsServer.broadcastStateUpdate(state);
  });

  // Create widget cache for metrics (singleton)
  const widgetCache = new WidgetDataCache(new SportMonksClient());

  // Set up HTTP routes
  createHttpRoutes(app, store, providerRegistry);
  logger.info("HTTP routes configured");

  // Set up metrics endpoints
  setupMetrics(app, { store, wsServer, widgetCache });
  logger.info("Metrics endpoints configured");

  // Initialize polling manager
  const pollingManager = new PollingManager(store, wsServer, providerRegistry);
  pollingManager.start();
  logger.info("Polling manager started");

  // Initialize TipeeStream manager (if API key is configured)
  let tipeeManager: TipeeStreamManager | null = null;
  if (config.tipeestream.apiKey) {
    tipeeManager = new TipeeStreamManager(config.tipeestream.apiKey, wsServer);
    try {
      await tipeeManager.start();
      logger.info("TipeeStream manager started");
    } catch (err) {
      logger.error({ err }, "Failed to start TipeeStream manager");
    }
  } else {
    logger.warn("TipeeStream API key not configured, skipping TipeeStream integration");
  }

  // Start HTTP server
  httpServer.listen(config.port, config.host, () => {
    logger.info("=========================================");
    logger.info({ host: config.host, port: config.port }, "Server running");
    logger.info({ wsPath: `/ws` }, "WebSocket available");
    logger.info("=========================================");
    logger.info("Endpoints: GET /health, /metrics, /metrics/prometheus, GET /state, WS /ws");
  });

  // Graceful shutdown
  const shutdown = () => {
    logger.info("Graceful shutdown initiated...");

    pollingManager.stop();
    if (tipeeManager) {
      tipeeManager.stop();
    }
    wsServer.close();
    providerRegistry.dispose();
    store.forcePersist();

    httpServer.close(() => {
      logger.info("Server closed");
      process.exit(0);
    });

    // Force exit after timeout
    setTimeout(() => {
      logger.warn("Forcing exit...");
      process.exit(1);
    }, 5000);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  logger.fatal({ err }, "Failed to start server");
  process.exit(1);
});
