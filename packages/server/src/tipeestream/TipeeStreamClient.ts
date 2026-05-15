import { io, Socket } from "socket.io-client";
import axios from "axios";
import type {
  TipeeStreamSocketInfo,
  TipeeStreamNewEventPayload,
} from "./types.js";
import { tipeeLogger } from "../utils/logger.js";

/**
 * TipeeStreamClient - Socket.IO client for real-time TipeeStream events
 * 
 * Connects to TipeeStream API and listens for:
 * - Donations (all tiers)
 * - YouTube subscriptions (members)
 * 
 * NOTE: Kick subscriptions are NOT supported by TipeeStream API
 */
export class TipeeStreamClient {
  private socket: Socket | null = null;
  private apiKey: string;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 5000; // 5 seconds

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Fetch socket connection info from TipeeStream API
   */
  private async getSocketInfo(): Promise<TipeeStreamSocketInfo["datas"]> {
    try {
      const response = await axios.get<TipeeStreamSocketInfo>(
        "https://api.tipeeestream.com/v2.0/site/socket"
      );

      if (response.data.code !== 200) {
        throw new Error(`TipeeStream API returned code ${response.data.code}`);
      }

      tipeeLogger.info(
        { host: response.data.datas.host, port: response.data.datas.port },
        "TipeeStream socket info retrieved"
      );

      return response.data.datas;
    } catch (err) {
      tipeeLogger.error({ err }, "Failed to get TipeeStream socket info");
      throw err;
    }
  }

  /**
   * Connect to TipeeStream socket and join room
   */
  async connect(
    onEvent: (payload: TipeeStreamNewEventPayload) => void
  ): Promise<void> {
    try {
      // 1. Get socket connection info
      const { host, port } = await this.getSocketInfo();

      // 2. Connect to socket with API key
      this.socket = io(`${host}:${port}`, {
        query: {
          access_token: this.apiKey,
        },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionDelay: this.reconnectDelay,
        reconnectionAttempts: this.maxReconnectAttempts,
      });

      // 3. Handle connection
      this.socket.on("connect", () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;

        tipeeLogger.info("TipeeStream socket connected");

        // Join room to receive events
        this.socket!.emit("join-room", {
          room: this.apiKey,
          username: "PareriNeavizate",
        });

        tipeeLogger.info("TipeeStream room joined");
      });

      // 4. Handle events
      this.socket.on("new-event", (data: TipeeStreamNewEventPayload) => {
        // Log the complete raw event for debugging
        tipeeLogger.info(
          {
            rawEvent: JSON.stringify(data, null, 2),
          },
          "TipeeStream RAW event received"
        );

        onEvent(data);
      });

      // Listen to ALL socket events for debugging
      this.socket.onAny((eventName, ...args) => {
        if (eventName !== "new-event") {
          tipeeLogger.debug(
            {
              eventName,
              args: JSON.stringify(args, null, 2),
            },
            "TipeeStream other event received"
          );
        }
      });

      // 5. Handle disconnection
      this.socket.on("disconnect", (reason: string) => {
        this.isConnected = false;
        tipeeLogger.warn({ reason }, "TipeeStream socket disconnected");
      });

      // 6. Handle reconnection attempts
      this.socket.on("reconnect_attempt", (attempt: number) => {
        this.reconnectAttempts = attempt;
        tipeeLogger.info({ attempt }, "TipeeStream reconnection attempt");
      });

      // 7. Handle errors
      this.socket.on("error", (err: Error) => {
        tipeeLogger.error({ err }, "TipeeStream socket error");
      });

      this.socket.on("connect_error", (err: Error) => {
        tipeeLogger.error({ err }, "TipeeStream connection error");
      });
    } catch (err) {
      tipeeLogger.error({ err }, "Failed to connect to TipeeStream");
      throw err;
    }
  }

  /**
   * Disconnect from socket
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      tipeeLogger.info("TipeeStream socket disconnected manually");
    }
  }

  /**
   * Check if connected
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}
