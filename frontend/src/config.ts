/**
 * Application Configuration
 * Centralized config for API endpoints and other settings
 */

/**
 * Get the server host - uses the current browser location for network access
 * This allows clients on the same network to connect properly
 */
const getServerHost = () => {
  // If explicitly set via env var, use that
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // In production, use relative paths
  if (!import.meta.env.DEV) {
    return "";
  }
  
  // In development, use the current hostname (supports LAN access)
  // If accessing via IP (e.g., 192.168.1.100), API calls go to same IP
  // If accessing via localhost, API calls go to localhost
  const hostname = window.location.hostname;
  return `http://${hostname}:3001`;
};

/**
 * API Base URL
 * - In development: Uses current hostname for LAN support
 * - In production: Relative path (same origin or via proxy)
 */
export const API_BASE_URL = getServerHost();

/**
 * WebSocket URL
 * - In development: Uses current hostname for LAN support
 * - In production: Relative path with protocol upgrade
 */
export const WS_URL = import.meta.env.VITE_WS_URL ||
  (import.meta.env.DEV 
    ? `ws://${window.location.hostname}:3001/ws` 
    : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`);

/**
 * Refresh intervals (in milliseconds)
 */
export const REFRESH_INTERVALS = {
  /** Widget data refresh (standings, h2h, form) */
  WIDGET_DATA: 5 * 60 * 1000, // 5 minutes
  /** Live match data refresh */
  LIVE_MATCH: 5 * 1000, // 5 seconds
  /** Ticker refresh */
  TICKER: 10 * 1000, // 10 seconds
} as const;

/**
 * API Endpoints
 */
export const API_ENDPOINTS = {
  // Health & State
  HEALTH: "/health",
  STATE: "/state",
  
  // Fixtures
  FIXTURES: "/api/fixtures",
  LEAGUES: "/api/leagues",
  
  // Widgets
  STANDINGS: "/api/widgets/standings",
  H2H: "/api/widgets/h2h",
  FORM: "/api/widgets/form",
  FORM_COMPARE: "/api/widgets/form-compare",
  TOP_SCORERS: "/api/widgets/topscorers",
  LIVE_STANDINGS: "/api/widgets/livestandings",
  LINEUPS: "/api/widgets/lineups",
} as const;

/**
 * Build full API URL from endpoint
 */
export function apiUrl(endpoint: string): string {
  return `${API_BASE_URL}${endpoint}`;
}
