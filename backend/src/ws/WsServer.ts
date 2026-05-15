import { WebSocketServer, WebSocket, RawData } from "ws";
import type { Server } from "http";
import type {
  ClientToServer,
  ServerHello,
  StateUpdate,
  ProviderStatusEvent,
  ServerError,
  ServerToClient,
  GoalAlertPayload,
  GoalAlertEvent,
} from "@parerineavizate/shared/wsEvents";
import { env, nowMs } from "@parerineavizate/shared/wsEvents";
import type { AppState, ProviderInfo, PlayerDetails, VersusData } from "@parerineavizate/shared/models";
import { wsLogger } from "../utils/logger.js";

export interface WsClient {
  id: string;
  role: "admin" | "overlay";
  socket: WebSocket;
  overlay?:
    | "hud"
    | "ticker"
    | "lineup"
    | "standings"
    | "h2h"
    | "form"
    | "topscorers"
    | "stats"
    | "livestandings"
    | "master"
    | "resolume"
    | "versus";
  format?: "16x9" | "9x16" | "custom";
  connectedAt: number;
}

export type MessageHandler = (client: WsClient, message: ClientToServer) => void;

// Stored versus data to send on reconnection
// VersusState must match the VersusUpdate payload structure
interface VersusState {
  visible: boolean;
  player1?: PlayerDetails;
  player2?: PlayerDetails;
}

export class WsServer {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WsClient> = new Map();
  private messageHandler: MessageHandler | null = null;
  private getState: () => AppState;
  private versusState: VersusState = { visible: false };

  constructor(getState: () => AppState) {
    this.getState = getState;
  }

  attach(server: Server, path: string = "/ws"): void {
    this.wss = new WebSocketServer({ server, path });

    this.wss.on("connection", (socket, req) => {
      const clientId = `client_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      wsLogger.info({ clientId }, "New WebSocket connection");

      // Create uninitialized client (role will be set on hello)
      const client: WsClient = {
        id: clientId,
        role: "overlay", // default, will be overwritten
        socket,
        connectedAt: Date.now(),
      };

      this.clients.set(clientId, client);

      socket.on("message", (data: RawData) => {
        this.handleMessage(client, data);
      });

      socket.on("close", () => {
        wsLogger.info({ clientId }, "Client disconnected");
        this.clients.delete(clientId);
      });

      socket.on("error", (err) => {
        wsLogger.error({ clientId, error: err }, "Client error");
        this.clients.delete(clientId);
      });
    });

    wsLogger.info({ path }, "WebSocket server attached");
  }

  private handleMessage(client: WsClient, rawData: RawData): void {
    try {
      const text = rawData.toString("utf-8");
      const message = JSON.parse(text) as ClientToServer;

      wsLogger.debug({ clientId: client.id, messageType: message.type }, "Received message");

      // Handle hello messages internally
      if (message.type === "admin:hello") {
        client.role = "admin";
        client.id = message.payload.clientId || client.id;
        this.sendHello(client);
        return;
      }

      if (message.type === "overlay:hello") {
        client.role = "overlay";
        client.id = message.payload.clientId || client.id;
        client.overlay = message.payload.overlay;
        client.format = message.payload.format;
        this.sendHello(client);
        return;
      }

      // Forward other messages to handler
      if (this.messageHandler) {
        this.messageHandler(client, message);
      }
    } catch (err) {
      wsLogger.error({ clientId: client.id, error: err }, "Failed to parse message");
      this.sendError(client, "PARSE_ERROR", "Failed to parse message");
    }
  }

  setMessageHandler(handler: MessageHandler): void {
    this.messageHandler = handler;
  }

  private sendHello(client: WsClient): void {
    const msg: ServerHello = env("server:hello", {
      serverTime: nowMs(),
      state: this.getState(),
    });
    this.send(client, msg);

    // If versus is active, also send the current versus state
    if (this.versusState.visible && client.role === "overlay") {
      wsLogger.info({ clientId: client.id }, "Sending current versus state to reconnected overlay");
      const versusMsg = env("versus:update", this.versusState);
      this.send(client, versusMsg);
    }
  }

  send(client: WsClient, message: ServerToClient): void {
    if (client.socket.readyState === WebSocket.OPEN) {
      client.socket.send(JSON.stringify(message));
    }
  }

  sendError(
    client: WsClient,
    code: string,
    message: string,
    details?: Record<string, unknown>
  ): void {
    const msg: ServerError = env("error", { code, message, details });
    this.send(client, msg);
  }

  broadcast(message: ServerToClient): void {
    const payload = JSON.stringify(message);
    for (const client of this.clients.values()) {
      if (client.socket.readyState === WebSocket.OPEN) {
        client.socket.send(payload);
      }
    }
  }

  broadcastStateUpdate(state: AppState): void {
    const msg: StateUpdate = env("state:update", { state });
    this.broadcast(msg);
  }

  broadcastProviderStatus(provider: ProviderInfo): void {
    const msg: ProviderStatusEvent = env("provider:status", {
      provider: provider.name,
      status: provider.status,
      message: provider.message,
      lastSuccessAt: provider.lastSuccessAt,
    });
    this.broadcast(msg);
  }

  /**
   * Broadcast a goal alert to all connected clients.
   * Used for automatic goal detection from live match events.
   */
  broadcastGoalAlert(goalAlert: GoalAlertPayload): void {
    const msg: GoalAlertEvent = env("goal:alert", goalAlert);
    wsLogger.info({ goalAlert }, "Broadcasting goal alert");
    this.broadcast(msg);
  }

  /**
   * Broadcast versus update to all connected clients.
   * Also stores the state for reconnecting clients.
   */
  broadcastVersusUpdate(data: {
    visible: boolean;
    player1?: any;
    player2?: any;
  }): void {
    // Store versus state for reconnecting clients
    this.versusState = { ...data };
    
    const msg = env("versus:update", data);
    wsLogger.info({ visible: data.visible }, "Broadcasting versus update");
    this.broadcast(msg);
  }

  getClients(): WsClient[] {
    return Array.from(this.clients.values());
  }

  getAdminClients(): WsClient[] {
    return this.getClients().filter((c) => c.role === "admin");
  }

  getOverlayClients(): WsClient[] {
    return this.getClients().filter((c) => c.role === "overlay");
  }

  close(): void {
    for (const client of this.clients.values()) {
      client.socket.close();
    }
    this.clients.clear();
    this.wss?.close();
  }
}
