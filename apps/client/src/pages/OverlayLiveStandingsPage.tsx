/**
 * Live Standings Overlay Page (16:9 HORIZONTAL)
 * 
 * Real-time league standings display for 16:9 screens.
 * Shows live positions with dynamic qualification zones from API.
 * Dynamic column layout: 1-3 columns based on team count
 * Dimensions: 1920x1080px
 */

import { useOverlayConnection } from "@/hooks/useOverlayConnection";
import { useWidgetData } from "@/hooks/useWidgetData";
import { API_ENDPOINTS } from "@/config";
import { FontStyles, LiveStandingsWidget } from "@/widgets";
import type { Standings } from "@parerineavizate/shared/models";

export function OverlayLiveStandingsPage() {
  const { state } = useOverlayConnection({ overlayName: "livestandings" });
  const mainMatch = state?.data?.mainMatch;
  const mainMatchId = state?.selection?.mainMatchId;
  const seasonId = mainMatch?.competition?.season?.id;
  
  const isLoadingMatch = mainMatchId && !mainMatch;
  
  const { data: standings, loading, error } = useWidgetData<Standings>(
    `${API_ENDPOINTS.LIVE_STANDINGS}${seasonId ? `?seasonId=${seasonId}` : ""}`,
    { 
      autoFetch: !!seasonId,
      deps: [seasonId],
      refreshInterval: 2000, // Fast refresh for live data
    }
  );

  const highlightTeamIds = mainMatch 
    ? [mainMatch.homeTeam.id, mainMatch.awayTeam.id]
    : [];

  if (!mainMatchId) {
    return (
      <div className="relative w-[1920px] h-[1080px] overflow-hidden bg-transparent select-none flex items-center justify-center font-montserrat text-[#F5F5F5]">
        <FontStyles />
        <div className="text-white/30 font-montserrat text-xl">
          No match selected
        </div>
      </div>
    );
  }

  if (isLoadingMatch || loading) {
    return (
      <div className="relative w-[1920px] h-[1080px] overflow-hidden bg-transparent select-none flex items-center justify-center font-montserrat text-[#F5F5F5]">
        <FontStyles />
        <div className="text-white/50 flex items-center gap-3 font-montserrat">
          <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
          Loading live standings...
        </div>
      </div>
    );
  }

  if (error || !standings) {
    return (
      <div className="relative w-[1920px] h-[1080px] overflow-hidden bg-transparent select-none flex items-center justify-center font-montserrat text-[#F5F5F5]">
        <FontStyles />
        <div className="text-white/30 font-montserrat text-xl text-center px-8">
          {error || "Live standings not available for this competition"}
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-[1920px] h-[1080px] overflow-hidden bg-transparent select-none font-montserrat text-[#F5F5F5]">
      <FontStyles />
      <LiveStandingsWidget 
        standings={standings}
        highlightTeamIds={highlightTeamIds}
      />
    </div>
  );
}
