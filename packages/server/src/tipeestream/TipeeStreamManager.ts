import { TipeeStreamClient } from "./TipeeStreamClient.js";
import type { WsServer } from "../ws/WsServer.js";
import type {
  TipeeStreamNewEventPayload,
  TipeeStreamDonationParameters,
  TipeeStreamSubscriptionParameters,
  TipeeAlert,
} from "./types.js";
import { calculateDonationTier } from "./types.js";
import { env } from "@parerineavizate/shared/wsEvents";
import { tipeeLogger } from "../utils/logger.js";

/**
 * Currency symbol mapping
 */
const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: "€",
  USD: "$",
  GBP: "£",
  RON: "lei",
  AUD: "A$",
  CAD: "C$",
  CHF: "Fr",
  JPY: "¥",
  CNY: "¥",
  RUB: "₽",
  BRL: "R$",
  INR: "₹",
  MXN: "Mex$",
  ZAR: "R",
  SEK: "kr",
  NOK: "kr",
  DKK: "kr",
  PLN: "zł",
  CZK: "Kč",
  HUF: "Ft",
};

/**
 * Convert currency code to symbol
 */
function formatCurrency(amount: number | string, currency: string): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  const symbol = CURRENCY_SYMBOLS[currency.toUpperCase()] || currency;
  
  // For currencies that go after (RON, CZK, etc), format accordingly
  if (["RON", "CZK", "SEK", "NOK", "DKK", "PLN", "HUF"].includes(currency.toUpperCase())) {
    return `${numAmount.toFixed(2)} ${symbol}`;
  }
  
  // For most currencies, symbol goes before
  return `${symbol}${numAmount.toFixed(2)}`;
}

/**
 * TipeeStreamManager - Handles TipeeStream events and broadcasts alerts
 * 
 * Event mapping:
 * - donation → dono alert (tier 1/2/3 based on amount)
 * - subscription (YouTube only) → member alert (tier 1)
 * 
 * Kick subscriptions are NOT handled here (separate integration)
 */
export class TipeeStreamManager {
  private client: TipeeStreamClient;
  private wsServer: WsServer;
  private isRunning = false;

  constructor(apiKey: string, wsServer: WsServer) {
    this.client = new TipeeStreamClient(apiKey);
    this.wsServer = wsServer;
  }

  /**
   * Start listening to TipeeStream events
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      tipeeLogger.warn("TipeeStreamManager already running");
      return;
    }

    try {
      await this.client.connect((payload) => {
        this.handleEvent(payload);
      });

      this.isRunning = true;
      tipeeLogger.info("TipeeStreamManager started");
    } catch (err) {
      tipeeLogger.error({ err }, "Failed to start TipeeStreamManager");
      throw err;
    }
  }

  /**
   * Stop listening to TipeeStream events
   */
  stop(): void {
    if (!this.isRunning) return;

    this.client.disconnect();
    this.isRunning = false;
    tipeeLogger.info("TipeeStreamManager stopped");
  }

  /**
   * Check if running
   */
  getStatus(): boolean {
    return this.isRunning && this.client.getConnectionStatus();
  }

  /**
   * Handle incoming TipeeStream event
   */
  private handleEvent(payload: TipeeStreamNewEventPayload): void {
    const { event } = payload;

    try {
      // Log ALL events for debugging
      tipeeLogger.info(
        {
          type: event.type,
          user: event.user.username,
          providers: event.user.providers?.map((p) => p.code) || [],
          parameters: event.parameters,
        },
        "TipeeStream event received"
      );

      if (event.type === "donation") {
        this.handleDonation(event);
      } else if (event.type === "subscription") {
        this.handleSubscription(event);
      } else {
        tipeeLogger.debug(
          { type: event.type },
          "Ignoring TipeeStream event type"
        );
      }
    } catch (err) {
      tipeeLogger.error({ err, event }, "Error handling TipeeStream event");
    }
  }

  /**
   * Handle donation event
   */
  private handleDonation(event: TipeeStreamNewEventPayload["event"]): void {
    const params = event.parameters as TipeeStreamDonationParameters;
    const amount = params.amount || event["parameters.amount"] || 0;
    const currency = params.currency || "EUR";
    const username = params.username || event.user.username || "Anonymous";
    const message = params.message || params.formattedMessage;

    // Debug logging to see raw event data - use INFO level to ensure visibility
    tipeeLogger.info(
      { 
        rawAmount: amount,
        rawCurrency: currency,
        rawMessage: message,
        paramsMessage: params.message,
        paramsFormattedMessage: params.formattedMessage,
        fullParams: JSON.stringify(params),
      },
      "Processing donation event - RAW DATA"
    );

    if (amount <= 0) {
      tipeeLogger.warn({ event }, "Ignoring donation with zero amount");
      return;
    }

    const tier = calculateDonationTier(amount);
    // ALWAYS use our custom currency formatter for consistent display
    const formattedAmount = formatCurrency(amount, currency);

    const alert: TipeeAlert = {
      type: "dono",
      user: username,
      amount: formattedAmount,
      tier,
      message,
    };

    this.broadcastAlert(alert);

    tipeeLogger.info(
      { user: username, amount: formattedAmount, tier, message: message ? "yes" : "no" },
      "Donation alert triggered"
    );
  }

  /**
   * Handle subscription event (YouTube members only)
   */
  private handleSubscription(event: TipeeStreamNewEventPayload["event"]): void {
    const params = event.parameters as TipeeStreamSubscriptionParameters;
    const username = params.username || event.user.username || "Anonymous";

    // Check if it's a YouTube subscription
    const providers = event.user.providers || [];
    const hasYouTube = providers.some((p) => p.code === "youtube");

    if (!hasYouTube) {
      tipeeLogger.debug(
        { username, providers: providers.map((p) => p.code) },
        "Ignoring non-YouTube subscription"
      );
      return;
    }

    const alert: TipeeAlert = {
      type: "member",
      user: username,
      tier: 1,
      platform: "youtube",
    };

    this.broadcastAlert(alert);

    tipeeLogger.info({ user: username }, "YouTube member alert triggered");
  }

  /**
   * Broadcast alert to all connected clients via WebSocket
   */
  private broadcastAlert(alert: TipeeAlert): void {
    const message = env("tipee:alert", alert);
    this.wsServer.broadcast(message);
  }
}
