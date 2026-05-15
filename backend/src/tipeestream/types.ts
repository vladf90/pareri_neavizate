/**
 * TipeeStream API Types
 * Documentation: https://tipeeestream.com/api
 */

export interface TipeeStreamSocketInfo {
  code: number;
  message: string;
  datas: {
    port: string;
    host: string;
  };
}

export interface TipeeStreamProvider {
  connectedAt: string;
  code: "youtube" | "twitch" | "hitbox";
  id: string;
  username: string;
}

export interface TipeeStreamUser {
  avatar: string;
  country: string;
  username: string;
  providers: TipeeStreamProvider[];
  created_at: string;
  session_at: string;
}

export interface TipeeStreamDonationParameters {
  formattedMessage?: string;
  message?: string;
  username: string;
  currency: string;
  amount: number;
  resub?: number;
  viewers?: number;
}

export interface TipeeStreamSubscriptionParameters {
  username: string;
  resub?: string;
  twitch_channel_id?: string;
}

export interface TipeeStreamEvent {
  id: number;
  type: "donation" | "subscription" | "follow" | "hosting";
  user: TipeeStreamUser;
  ref: string;
  inserted_at: string;
  deleted_at?: string;
  created_at: string;
  parameters: TipeeStreamDonationParameters | TipeeStreamSubscriptionParameters | any;
  formattedAmount?: string;
  "parameters.amount"?: number;
}

export interface TipeeStreamNewEventPayload {
  appKey: string;
  event: TipeeStreamEvent;
}

/**
 * Internal alert format (sent to client via WebSocket)
 */
export interface TipeeAlert {
  type: "member" | "dono";
  user: string;
  amount?: string;
  tier: 1 | 2 | 3;
  platform?: "youtube";
  message?: string;
}

/**
 * Donation tier calculation
 */
export function calculateDonationTier(amount: number): 1 | 2 | 3 {
  if (amount >= 30) return 3;
  if (amount >= 10) return 2;
  return 1;
}
