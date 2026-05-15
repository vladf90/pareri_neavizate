/**
 * Custom hook for overlay pages to connect to WebSocket and receive state updates.
 * This hook manages the WebSocket connection lifecycle and provides state from the store.
 */
import { useEffect, useRef } from "react";
import { useAppStore } from "@/store/appStore";
import { getWsClient } from "@/ws";
import { env } from "@parerineavizate/shared/wsEvents";
import type { OverlayFormat } from "@parerineavizate/shared/models";

interface UseOverlayConnectionOptions {
  /** Unique overlay name for identification */
  overlayName: string;
  /** Display format (16x9 or 9x16) */
  format?: OverlayFormat;
}

/**
 * Hook to connect overlay pages to WebSocket and receive real-time state updates.
 * 
 * @example
 * ```tsx
 * function MyOverlay() {
 *   const { state, isConnected } = useOverlayConnection({ overlayName: "scoreboard" });
 *   
 *   if (!state?.data?.mainMatch) return <NoMatchMessage />;
 *   return <MatchDisplay match={state.data.mainMatch} />;
 * }
 * ```
 */
export function useOverlayConnection({ overlayName, format = "16x9" }: UseOverlayConnectionOptions) {
  const appState = useAppStore((s) => s.appState);
  const handleServerMessage = useAppStore((s) => s.handleServerMessage);
  const setConnectionStatus = useAppStore((s) => s.setConnectionStatus);
  const connectionStatus = useAppStore((s) => s.connectionStatus);
  const wsInitialized = useRef(false);

  // Connect to WebSocket on mount
  useEffect(() => {
    if (wsInitialized.current) return;
    wsInitialized.current = true;

    const ws = getWsClient();
    
    ws.setHelloMessage(
      env("overlay:hello", {
        role: "overlay" as const,
        clientId: `overlay_${overlayName}_${Date.now()}`,
        overlay: overlayName as any,
        format,
      })
    );

    ws.onMessage(handleServerMessage);
    ws.onStatusChange(setConnectionStatus);
    ws.connect();

    // Cleanup is handled by WsClient singleton
  }, [overlayName, format, handleServerMessage, setConnectionStatus]);

  // Return the full state with selection info (including resolume)
  const state = appState
    ? {
        data: {
          mainMatch: appState.data.mainMatch,
          tickerMatches: appState.data.tickerMatches,
          lineups: appState.data.lineups,
          events: appState.data.events,
          stats: appState.data.stats,
        },
        selection: {
          mainMatchId: appState.selection.mainMatchId,
          tickerMatchIds: appState.selection.tickerMatchIds,
          themeId: appState.selection.themeId,
          toggles: appState.selection.toggles,
        },
        provider: appState.provider,
        resolume: appState.resolume,
      }
    : null;

  return {
    state,
    isConnected: connectionStatus === "connected",
    connectionStatus,
  };
}
