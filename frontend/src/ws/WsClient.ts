import type { ClientToServer, ServerToClient } from "@parerineavizate/shared/wsEvents";
import { WS_URL } from "@/config";

export type ConnectionStatus = "connected" | "reconnecting" | "disconnected";

export type WsMessageHandler = (message: ServerToClient) => void;
export type WsStatusHandler = (status: ConnectionStatus) => void;

const RECONNECT_DELAYS = [500, 1000, 2000, 5000, 10000];
const MAX_RECONNECT_ATTEMPTS = 20;

export class WsClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private messageHandler: WsMessageHandler | null = null;
  private statusHandler: WsStatusHandler | null = null;
  private shouldReconnect = true;
  private helloMessage: ClientToServer | null = null;

  constructor(url: string = WS_URL) {
    this.url = url;
  }

  setHelloMessage(message: ClientToServer): void {
    this.helloMessage = message;
  }

  onMessage(handler: WsMessageHandler): void {
    this.messageHandler = handler;
  }

  onStatusChange(handler: WsStatusHandler): void {
    this.statusHandler = handler;
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.shouldReconnect = true;
    this.createConnection();
  }

  private createConnection(): void {
    console.log(`[WsClient] Connecting to ${this.url}...`);
    this.updateStatus("reconnecting");

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log("[WsClient] Connected");
        this.reconnectAttempt = 0;
        this.updateStatus("connected");

        // Send hello message
        if (this.helloMessage) {
          this.send(this.helloMessage);
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as ServerToClient;
          this.messageHandler?.(message);
        } catch (err) {
          console.error("[WsClient] Failed to parse message:", err);
        }
      };

      this.ws.onclose = () => {
        console.log("[WsClient] Disconnected");
        this.ws = null;
        this.updateStatus("disconnected");
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.error("[WsClient] Error:", err);
      };
    } catch (err) {
      console.error("[WsClient] Failed to connect:", err);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (!this.shouldReconnect) return;
    if (this.reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) {
      console.error(`[WsClient] Max reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) reached`);
      return;
    }

    const delay = RECONNECT_DELAYS[Math.min(this.reconnectAttempt, RECONNECT_DELAYS.length - 1)];

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempt++;
      this.createConnection();
    }, delay);
  }

  private updateStatus(status: ConnectionStatus): void {
    this.statusHandler?.(status);
  }

  send(message: ClientToServer): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn("[WsClient] Cannot send, not connected");
    }
  }

  disconnect(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.updateStatus("disconnected");
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Singleton instance
let wsClientInstance: WsClient | null = null;

export function getWsClient(): WsClient {
  if (!wsClientInstance) {
    wsClientInstance = new WsClient();
  }
  return wsClientInstance;
}
