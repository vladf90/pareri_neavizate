/**
 * Master Overlay Page (16:9)
 * 
 * Integrates all existing overlay components in a single page:
 * - Scoreboard (exact same as standalone)
 * - Lineups Home (exact same as standalone)
 * - Lineups Away (exact same as standalone)
 * - TipeeStream Alerts (donations & subscriptions with queue management)
 * - Live Ticker (bottom right, shows ticker matches with goal alerts)
 * 
 * All components can be shown/hidden individually via Admin panel toggles.
 * This is the primary overlay for OBS broadcast.
 * 
 * NOTE: This page imports and uses the EXACT same widgets from the standalone pages.
 * No redesign - just composition.
 */

import { useOverlayConnection } from "@/hooks/useOverlayConnection";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { useTipeeStore } from "@/store/tipeeStore";
import { useGoalAlertStore } from "@/store/goalAlertStore";
import { WsClient } from "@/ws/WsClient";
import { useWidgetData } from "@/hooks/useWidgetData";
import { API_ENDPOINTS } from "@/config";
import type { Standings } from "@parerineavizate/shared/models";

// Import widgets from centralized widget library
import {
  FontStyles,
  ScoreboardWidget,
  LineupsWidget,
  LiveStandingsWidget,
  LiveTickerWidget,
  StatsWidget,
  SocialCapsule,
  BrandPopup,
  TipeeAlertTier1And2,
  TipeeAlertTier3,
} from "@/widgets";

const wsClient = new WsClient();

export function OverlayMasterPage() {
  const { state } = useOverlayConnection({ overlayName: "master" });
  const { currentAlert, clearCurrent, addAlert } = useTipeeStore();
  const { currentGoalAlert, clearGoalAlert, initListener } = useGoalAlertStore();
  
  const mainMatch = state?.data?.mainMatch;
  const events = state?.data?.events;
  const lineups = state?.data?.lineups;
  const stats = state?.data?.stats;
  const tickerMatches = state?.data?.tickerMatches || [];
  const toggles = state?.selection?.toggles || {};

  // Get toggle states with defaults matching GFX_REGISTRY
  const showScoreboard = toggles.showMasterScoreboard !== false; // Default true
  const showLineupsHome = toggles.showMasterLineupsHome === true; // Default false
  const showLineupsAway = toggles.showMasterLineupsAway === true; // Default false
  const showTicker = toggles.showMasterTicker !== false; // Default true
  const showSocials = toggles.showMasterSocials !== false; // Default true
  const showBranding = toggles.showMasterBranding !== false; // Default true
  const showLiveStandings = toggles.showMasterLiveStandings === true; // Default false
  const showStats = toggles.showMasterStats === true; // Default false

  // Fetch standings data when Live Standings is enabled
  const seasonId = mainMatch?.competition?.season?.id;
  const { data: standings } = useWidgetData<Standings>(
    `${API_ENDPOINTS.LIVE_STANDINGS}${seasonId ? `?seasonId=${seasonId}` : ""}`,
    { 
      autoFetch: showLiveStandings && !!seasonId,
      deps: [seasonId, showLiveStandings],
      refreshInterval: 2000,
    }
  );

  const highlightTeamIds = mainMatch 
    ? [mainMatch.homeTeam.id, mainMatch.awayTeam.id]
    : [];

  // Initialize localStorage listener for goal alerts from Admin (cross-tab sync)
  useEffect(() => {
    const cleanup = initListener();
    return cleanup;
  }, [initListener]);

  // TipeeStream WebSocket listener (active when socials is enabled)
  useEffect(() => {
    if (!showSocials) return; // Don't listen if disabled

    wsClient.connect();

    wsClient.onMessage((message: any) => {
      if ("type" in message && (message as any).type === "tipee:alert") {
        const alertMessage = message as any;
        console.log("[MasterOverlay] Received Tipee alert:", alertMessage.payload);

        addAlert({
          type: alertMessage.payload.type,
          user: alertMessage.payload.user,
          amount: alertMessage.payload.amount,
          tier: alertMessage.payload.tier,
          platform: alertMessage.payload.platform,
          message: alertMessage.payload.message,
        });
      }
    });

    return () => {
      // Keep connection open for other overlays
    };
  }, [showSocials, addAlert]);

  return (
    <div className="relative w-[1920px] h-[1080px] overflow-hidden bg-transparent select-none font-montserrat text-[#F5F5F5]">
      <FontStyles />
      
      {/* Scoreboard - uses exact same widget from OverlayScoreboardPage */}
      <AnimatePresence>
        {showScoreboard && mainMatch && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            <ScoreboardWidget match={mainMatch} events={events} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lineups Home - uses exact same widget from OverlayLineupsHomePage */}
      {mainMatch && lineups && (
        <LineupsWidget 
          lineups={lineups}
          team={mainMatch.homeTeam}
          teamSide="HOME"
          isActive={showLineupsHome}
        />
      )}

      {/* Lineups Away - uses exact same widget from OverlayLineupsHomePage (with AWAY teamSide) */}
      {mainMatch && lineups && (
        <LineupsWidget 
          lineups={lineups}
          team={mainMatch.awayTeam}
          teamSide="AWAY"
          isActive={showLineupsAway}
        />
      )}

      {/* TipeeStream Alerts & Socials - conditionally rendered based on toggles */}
      {showSocials && (
        <>
          {/* ZONA STÂNGA JOS - Capsula Socială & Alerte */}
          {/* Position: bottom-10 left-10 to align horizontally with LiveTicker (also bottom-10) */}
          <div className="absolute bottom-10 left-10 pointer-events-none">
            <div className="relative">
              
              {/* Alert Display (Queue-based) - ABOVE SocialCapsule */}
              <div className="absolute bottom-full left-0 mb-4">
                <AnimatePresence mode="wait">
                  {currentAlert && currentAlert.tier === 3 ? (
                    <TipeeAlertTier3
                      key={`tier3-${currentAlert.id}`}
                      user={currentAlert.user}
                      amount={currentAlert.amount || ""}
                      message={currentAlert.message}
                      onComplete={clearCurrent}
                    />
                  ) : currentAlert && (
                    <TipeeAlertTier1And2
                      key={`tier12-${currentAlert.id}`}
                      type={currentAlert.type}
                      user={currentAlert.user}
                      amount={currentAlert.amount}
                      tier={currentAlert.tier}
                      platform={currentAlert.platform}
                      message={currentAlert.message}
                      onComplete={clearCurrent}
                    />
                  )}
                </AnimatePresence>
              </div>

              {/* SocialCapsule - Base element (h-16 = 64px, same as LiveTicker) */}
              <SocialCapsule />

              {/* BrandPopup - Extension from SocialCapsule (conditional) */}
              {showBranding && <BrandPopup />}
            </div>
          </div>
        </>
      )}

      {/* Live Ticker - Bottom Right */}
      {/* Always mount when enabled - component handles visibility internally */}
      {/* This ensures BroadcastChannel listener is active for goal alerts */}
      {showTicker && (
        <LiveTickerWidget
          matches={tickerMatches}
          competitionLabel={mainMatch?.competition?.shortName || mainMatch?.competition?.name || "LIVE"}
          goalAlert={currentGoalAlert}
          onGoalAlertDismiss={clearGoalAlert}
        />
      )}

      {/* Live Standings - Full screen overlay with custom animations (scaled to 75%) */}
      {standings && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ transform: 'scale(0.75)' }}>
          <LiveStandingsWidget 
            standings={standings}
            highlightTeamIds={highlightTeamIds}
            isActive={showLiveStandings}
          />
        </div>
      )}

      {/* Stats Widget - Right side with slide animation */}
      <AnimatePresence>
        {showStats && mainMatch && stats && (
          <motion.div 
            className="absolute right-10 top-1/2 -translate-y-1/2"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <StatsWidget 
              match={mainMatch}
              stats={stats}
              showHeader={true}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* No match selected message */}
      {!mainMatch && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-white/30 font-montserrat text-xl">No match selected</div>
        </div>
      )}
    </div>
  );
}
