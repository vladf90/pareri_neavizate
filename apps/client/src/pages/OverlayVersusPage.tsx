/**
 * OverlayVersusPage - Full-screen Versus Player Comparison Overlay
 * 
 * Displays player vs player head-to-head comparison with stats.
 * Connected to WebSocket for live data updates.
 */

import { useEffect, useRef } from "react";
import { getWsClient } from "@/ws";
import { useAppStore } from "@/store";
import { env } from "@parerineavizate/shared/wsEvents";
import { VersusComparison } from "@/components/overlays/VersusComparison";
import { AnimatePresence, motion } from "framer-motion";

export function OverlayVersusPage() {
  const handleServerMessage = useAppStore((s) => s.handleServerMessage);
  const setConnectionStatus = useAppStore((s) => s.setConnectionStatus);
  const appState = useAppStore((s) => s.appState);
  const versusData = useAppStore((s) => s.versusData);
  const wsInitialized = useRef(false);

  useEffect(() => {
    if (wsInitialized.current) return;
    wsInitialized.current = true;

    const ws = getWsClient();
    ws.setHelloMessage(
      env("overlay:hello", {
        role: "overlay" as const,
        overlay: "versus" as const,
        format: "16x9" as const,
        clientId: `versus_${Date.now()}`,
      })
    );
    ws.onMessage(handleServerMessage);
    ws.onStatusChange(setConnectionStatus);
    ws.connect();
  }, []);

  const mainMatch = appState?.data?.mainMatch;
  const { player1, player2, visible } = versusData;

  // Debug logging - log every render
  console.log('[OverlayVersus] Render:', {
    hasPlayer1: !!player1,
    hasPlayer2: !!player2,
    visible,
    player1Name: player1?.name,
    player2Name: player2?.name,
    timestamp: new Date().toISOString()
  });

  // Log when visible changes
  useEffect(() => {
    console.log('[OverlayVersus] visible changed to:', visible);
  }, [visible]);

  // Log when player1 changes
  useEffect(() => {
    console.log('[OverlayVersus] player1 changed:', player1?.name);
  }, [player1]);

  // Log when player2 changes  
  useEffect(() => {
    console.log('[OverlayVersus] player2 changed:', player2?.name);
  }, [player2]);

  // Prepare player data only if available (simplified - no stats)
  const player1Data = player1 ? {
    name: player1.firstname.toUpperCase(),
    lastname: player1.lastname.toUpperCase(),
    team: mainMatch?.homeTeam?.name || "Team 1",
    teamLogo: mainMatch?.homeTeam?.logo,
    img: player1.photoUrl
  } : null;

  const player2Data = player2 ? {
    name: player2.firstname.toUpperCase(),
    lastname: player2.lastname.toUpperCase(),
    team: mainMatch?.awayTeam?.name || "Team 2",
    teamLogo: mainMatch?.awayTeam?.logo,
    img: player2.photoUrl
  } : null;

  const showVersusOverlay = visible && player1Data && player2Data;

  return (
    <div className="w-full h-screen bg-transparent overflow-hidden">
      <AnimatePresence mode="sync">
        {showVersusOverlay && (
          <motion.div
            key="versus-overlay"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="w-full h-full"
          >
            <VersusComparison
              competition={`${mainMatch?.competition?.name || "UEFA CHAMPIONS LEAGUE"} - ${mainMatch?.round?.name || "MATCHDAY"}`}
              player1={player1Data}
              player2={player2Data}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default OverlayVersusPage;
