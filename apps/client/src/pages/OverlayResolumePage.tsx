/**
 * Resolume Multi-Display Overlay Page
 * 
 * Canvas: 5400x1800px (configurable)
 * Supports multiple zones with different widgets
 * Each zone can be positioned, scaled, and configured independently
 * 
 * Layout example (L-shape with 5 TVs):
 * ┌────────────────────────┬──────────┐
 * │   TV1  │  TV2  │  TV3  │   TV4    │
 * │        │       │       ├──────────┤
 * │        │       │       │   TV5    │
 * └────────┴───────┴───────┴──────────┘
 */

import { useOverlayConnection } from "@/hooks/useOverlayConnection";
import { useWidgetData } from "@/hooks/useWidgetData";
import { API_ENDPOINTS } from "@/config";
import { FontStyles } from "@/widgets";
import type { ResolumeZone, ResolumeConfig, Standings } from "@parerineavizate/shared/models";
import { DEFAULT_RESOLUME_CONFIG } from "@parerineavizate/shared/models";
import logoImage from "@/assets/logo png-8.png";
import { VersusComparison } from "@/components/overlays/VersusComparison";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useAppStore } from "@/store/appStore";
import { motion, AnimatePresence } from "framer-motion";

// ==================== WIDGETS ====================

/**
 * Live Standings Widget (Scalable for Resolume)
 * Same visual as standalone but can be scaled/positioned
 */
interface LiveStandingsWidgetProps {
  standings: Standings;
  width: number;
  height: number;
  qualificationLine?: number;
  playoffLine?: number;
  subtitle?: string;
  side?: "left" | "right";
}

function LiveStandingsWidget({ 
  standings, 
  width: _width, // eslint-disable-line @typescript-eslint/no-unused-vars
  height,
  qualificationLine = 8, 
  playoffLine = 24,
  subtitle,
  side = "left",
}: LiveStandingsWidgetProps) {
  const entries = standings.entries || [];
  
  // Calculate font sizes based on height
  const titleSize = Math.max(48, height * 0.05);
  const subtitleSize = Math.max(16, height * 0.015);
  const rowHeight = Math.max(40, (height - 300) / Math.min(entries.length, 20));
  
  return (
    <div 
      className={`w-full h-full bg-[#0A1B51]/80 backdrop-blur-xl border-4 border-[#33EFFF]  rounded-[30px] ${subtitle === "POSITIONS 1-16" ? "rounded-tr-none border-r-0" : "rounded-tl-none"} shadow-[0_0_60px_rgba(51,239,255,0.3)] overflow-hidden flex flex-col`}
    >
      {/* Header */}
      <div className="pt-4 pb-3 px-6 flex flex-col items-center justify-center border-b-2 border-white/10 bg-gradient-to-b from-[#0A1B51]/90 to-transparent">

        <div 
          className={`font-bebas flex text-white tracking-widest text-center leading-[0.9] drop-shadow-xl `}
          style={{ fontSize: `${titleSize}px` }}
        >
        {side === "left" &&<div className=" absolute left-[-200px] w-[135px] top-[0px] h-[135px] rounded-full flex items-center justify-center  overflow -hidden">
           <img src={logoImage} className="w-full h-auto object-contain" alt="PN" />
        </div>}
          {side === "left" ? "LIVE STANDINGS" : standings.competitionName || "Champions League"}
          
        </div>
        {/* <span 
          className="font-montserrat font-black text-[#33EFFF] tracking-[0.3em] uppercase drop-shadow-md"
          style={{ fontSize: `${subtitleSize}px` }}
        >
          {standings.competitionName || "Champions League"}
        </span> */}
        {subtitle && (
          <span 
            className="font-montserrat font-bold text-[#F659FD] tracking-[0.2em] uppercase mt-1"
            style={{ fontSize: `${subtitleSize * 0.9}px` }}
          >
            {subtitle}
          </span>
        )}
      </div>

      {/* Team Rows */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 no-scrollbar ">
        {entries.slice(0, 20).map((entry) => {
          const rank = entry.position;
          let rowStyle = "bg-[#1E2C49]/40 border-l-4 border-l-transparent";
          let rankColor = "text-white/60";
          
          if (rank <= qualificationLine) {
            rowStyle = "bg-[#33EFFF]/10 border-l-4 border-l-[#00FF9D]";
            rankColor = "text-[#00FF9D]";
          } else if (rank <= playoffLine) {
            rowStyle = "bg-[#1E2C49]/40 border-l-4 border-l-[#33EFFF]";
            rankColor = "text-[#33EFFF]";
          }
          
          return (
            <div
              key={entry.team.id}
              className={`flex items-center px-3 rounded-lg ${rowStyle}`}
              style={{ height: `${rowHeight}px` }}
            >
              {/* Rank */}
              <span className={`w-[50px] h-[80px] flex justify-center items-center text-[40px] font-bebas ${rankColor}`}>
                {rank}
              </span>
              
              {/* Team Logo */}
              <div className="w-[80px] h-[80px] mx-2 rounded-full bg-white/10 flex items-center justify-center overflow-hidden">
                {entry.team.crestUrl ? (
                  <img src={entry.team.crestUrl} className="w-[50px] h-[50px] object-contain" alt="" />
                ) : (
                  <span className="text-xs text-white/50">{entry.team.shortName?.charAt(0)}</span>
                )}
              </div>
              
              {/* Team Name */}
              <span className="flex-1 text-white  text-[50px] ml-4 truncate font-montserrat font-bold">
                {entry.team.name || entry.team.shortName}
              </span>
              
              {/* Stats */}
              <div className="flex items-center justify-center gap-3 text-white/70  text-[40px] mr-3 w-[100px] scale-125">
                {/* Goal Difference */}
                <div className="flex flex-col items-center w-10">
           <span className="text-[10px] font-bold text-[#F5F5F5]/30 uppercase">GD</span>
           <span className="text-xl font-montserrat font-bold text-[#F5F5F5]/80">
             {entry.goalDifference > 0 ? `+${entry.goalDifference}` : entry.goalDifference}
           </span>
        </div>
                        <div className="flex flex-col items-center w-14 bg-[#0A1B51]/60 rounded-lg py-1 border border-white/10 shadow-inner">
           <span className="text-[10px] font-black text-[#33EFFF] uppercase tracking-widest">PTS</span>
           <span className="text-3xl font-bebas text-[#F5F5F5] leading-none pt-1">{entry.points}</span>
        </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="h-16 border-t-2 border-white/10 flex items-center justify-center bg-[#0A1B51]/80 opacity-0">
        <span className="text-sm uppercase tracking-[0.2em] text-[#F5F5F5]/50 font-bold mr-2">
          Powered by
        </span>
        <span className="text-2xl font-bebas text-[#F659FD] tracking-widest">
          SUPERBET
        </span>
      </div>
    </div>
  );
}

/**
 * Versus Widget - renders VersusComparison from global store
 */
function VersusWidget({ bounds }: { bounds: { width: number; height: number } }) {
  const versusData = useAppStore((s) => s.versusData);
  const appState = useAppStore((s) => s.appState);
  const competition = appState?.data?.mainMatch?.competition?.name || "UEFA CHAMPIONS LEAGUE";
  const stage = appState?.data?.mainMatch?.competition?.stage || "ETAPA 8";
  const homeTeamLogo = appState?.data?.mainMatch?.homeTeam?.logo;
  const awayTeamLogo = appState?.data?.mainMatch?.awayTeam?.logo;
  
  // If versus is not visible or no players, show placeholder
  if (!versusData.visible || !versusData.player1 || !versusData.player2) {
    return (
      <div 
        className="w-full h-full bg-gradient-to-br from-[#0A1B51] to-[#020814] rounded-[30px] flex items-center justify-center border-4 border-[#33EFFF]/30"
        style={{ width: bounds.width, height: bounds.height }}
      >
        <div className="text-center text-white/40 font-montserrat">
          <div className="text-3xl mb-2">⚔️</div>
          <div className="text-xl font-bold">Versus</div>
          <div className="text-sm opacity-70">Waiting for player comparison...</div>
        </div>
      </div>
    );
  }
  
  // Prepare player data with team logos
  const player1WithLogo = {
    ...versusData.player1,
    teamLogo: homeTeamLogo
  };
  const player2WithLogo = {
    ...versusData.player2,
    teamLogo: awayTeamLogo
  };
  
  return (
    <div style={{ width: bounds.width, height: bounds.height }}>
      <VersusComparison
        competition={`${competition} - ${stage}`}
        player1={player1WithLogo}
        player2={player2WithLogo}
      />
    </div>
  );
}

/**
 * Empty Zone Placeholder
 */
function EmptyZone({ zone }: { zone: ResolumeZone }) {
  return (
    <div className="w-full h-full border-2 border-dashed border-white/20 rounded-xl flex items-center justify-center bg-black/20">
      <span className="text-white/30 font-montserrat text-lg">
        {zone.name}
      </span>
    </div>
  );
}

// ==================== ZONE RENDERER ====================

interface ZoneRendererProps {
  zone: ResolumeZone;
  allZones: ResolumeZone[];
  standings?: Standings;
  standingsLoading?: boolean;
}

/**
 * Calculate bounding box for a zone that spans multiple zones
 */
function calculateSpanBounds(zone: ResolumeZone, allZones: ResolumeZone[]): { x: number; y: number; width: number; height: number } {
  if (!zone.spanZones || zone.spanZones.length === 0) {
    return { x: zone.x, y: zone.y, width: zone.width, height: zone.height };
  }
  
  // Get all zones that are spanned (including the current zone)
  const spannedZoneIds = [zone.id, ...zone.spanZones];
  const spannedZones = allZones.filter(z => spannedZoneIds.includes(z.id));
  
  if (spannedZones.length === 0) {
    return { x: zone.x, y: zone.y, width: zone.width, height: zone.height };
  }
  
  // Calculate bounding box
  const minX = Math.min(...spannedZones.map(z => z.x));
  const minY = Math.min(...spannedZones.map(z => z.y));
  const maxX = Math.max(...spannedZones.map(z => z.x + z.width));
  const maxY = Math.max(...spannedZones.map(z => z.y + z.height));
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Check if a zone is spanned by another zone (should not render)
 */
function isZoneSpannedByOther(zone: ResolumeZone, allZones: ResolumeZone[]): boolean {
  for (const otherZone of allZones) {
    if (otherZone.id === zone.id) continue;
    if (otherZone.spanZones?.includes(zone.id)) {
      return true;
    }
  }
  return false;
}

/**
 * Calculate widget container styles based on alignment
 */
function getAlignmentStyles(alignment: string | undefined): React.CSSProperties {
  switch (alignment) {
    case "top-left":
      return { justifyContent: "flex-start", alignItems: "flex-start" };
    case "top-center":
      return { justifyContent: "center", alignItems: "flex-start" };
    case "top-right":
      return { justifyContent: "flex-end", alignItems: "flex-start" };
    case "bottom-left":
      return { justifyContent: "flex-start", alignItems: "flex-end" };
    case "bottom-center":
      return { justifyContent: "center", alignItems: "flex-end" };
    case "bottom-right":
      return { justifyContent: "flex-end", alignItems: "flex-end" };
    case "center":
    default:
      return { justifyContent: "center", alignItems: "center" };
  }
}

function ZoneRenderer({ zone, allZones, standings, standingsLoading }: ZoneRendererProps) {
  // Skip rendering if this zone is spanned by another zone with a widget
  const isSpanned = isZoneSpannedByOther(zone, allZones);
  if (isSpanned) {
    return null;
  }
  
  // Calculate bounds (may include spanned zones)
  const bounds = calculateSpanBounds(zone, allZones);
  
  // Widget transform values - ONLY apply scale/offset when there's an actual widget
  const hasWidget = zone.widgetType !== "none";
  const widgetScale = hasWidget ? (zone.widgetScale ?? 1) : 1;
  const widgetOffsetX = hasWidget ? (zone.widgetOffsetX ?? 0) : 0;
  const widgetOffsetY = hasWidget ? (zone.widgetOffsetY ?? 0) : 0;
  const alignment = zone.widgetAlignment ?? "center";
  
  // Zone container style - positioned in canvas
  // IMPORTANT: Zone stays full size and transparent - only widget scales visually
  const zoneStyle: React.CSSProperties = {
    position: "absolute",
    left: bounds.x,
    top: bounds.y,
    width: bounds.width,
    height: bounds.height,
    transform: `scale(${zone.scale})`,
    transformOrigin: "top left",
    opacity: zone.opacity ?? 1,
    display: "flex",
    overflow: "visible", // Changed from hidden - allow widget to be visible when scaled
    background: "transparent", // Explicit transparent for Resolume layers below
    ...getAlignmentStyles(alignment),
  };
  
  // Widget wrapper style - handles scale and offset
  // When widget is "none", we don't apply any transform so EmptyZone shows full size
  const widgetWrapperStyle: React.CSSProperties = {
    transform: hasWidget 
      ? `scale(${widgetScale}) translate(${widgetOffsetX}px, ${widgetOffsetY}px)`
      : "none",
    transformOrigin: "center center",
    // When scaled down, the widget should maintain aspect ratio
    // We give it the full zone dimensions and let it scale
    width: bounds.width,
    height: bounds.height,
    flexShrink: 0,
  };
  
  // Render widget based on type
  const renderWidget = () => {
    
    // Handle all livestandings variants
    if (zone.widgetType === "livestandings" || zone.widgetType === "livestandings-ucl1" || zone.widgetType === "livestandings-ucl2") {
      if (standingsLoading) {
        return (
          <div className="w-full h-full bg-[#0A1B51]/80 border-4 border-[#33EFFF] rounded-[30px] flex items-center justify-center">
            <div className="text-white/50 flex items-center gap-3 font-montserrat">
              <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
              Loading standings...
            </div>
          </div>
        );
      }
      if (standings) {
        // Determine which segment to show
        let segmentedStandings = standings;
        let subtitle = "";
        
        if (zone.widgetType === "livestandings-ucl1") {
          const sortedEntries = [...standings.entries].sort((a, b) => a.position - b.position);
          segmentedStandings = { ...standings, entries: sortedEntries.slice(0, 16) };
          subtitle = "POSITIONS 1-16";
        } else if (zone.widgetType === "livestandings-ucl2") {
          const sortedEntries = [...standings.entries].sort((a, b) => a.position - b.position);
          segmentedStandings = { ...standings, entries: sortedEntries.slice(16, 32) };
          subtitle = "POSITIONS 17-32";
        }
        
        return (
          <motion.div
            key={`standings-${zone.widgetType}`}
            initial={{ y: "-100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "-100%", opacity: 0 }}
            transition={{ 
              type: "spring", 
              stiffness: 100, 
              damping: 20,
              duration: 0.6 
            }}
            className="w-full h-full"
          >
            <LiveStandingsWidget 
              standings={segmentedStandings}
              width={bounds.width}
              height={bounds.height}
              subtitle={subtitle}
              side={subtitle === "POSITIONS 1-16" ? "left" : "right"}
            />
          </motion.div>
        );
      }
      // No standings yet - show placeholder
      return (
        <div className="w-full h-full bg-[#0A1B51]/80 border-4 border-[#33EFFF] rounded-[30px] flex items-center justify-center">
          <div className="text-white/50 font-montserrat text-center">
            <div className="text-xl mb-2">Live Standings</div>
            <div className="text-sm opacity-70">Waiting for match data...</div>
          </div>
        </div>
      );
    }
    
    // Versus widget - uses global versus state from store
    if (zone.widgetType === "versus") {
      return (
        <motion.div
          key="versus-widget"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full h-full"
        >
          <ErrorBoundary 
            fallback={
              <div className="w-full h-full bg-red-900/50 flex items-center justify-center text-white">
                <div className="text-center">
                  <div className="text-2xl">⚠️ Error</div>
                  <div className="text-sm">VersusWidget crashed</div>
                </div>
              </div>
            }
          >
            <VersusWidget bounds={bounds} />
          </ErrorBoundary>
        </motion.div>
      );
    }
    
    if (zone.widgetType === "none") {
      return <EmptyZone zone={zone} />;
    }
    
    // Unknown widget type
    return <EmptyZone zone={zone} />;
  };
  
  // Determine if we should show content (for animation purposes)
  const shouldShowContent = zone.visible && zone.widgetType !== "none";
  
  return (
    <div style={zoneStyle}>
      <div style={widgetWrapperStyle}>
        <AnimatePresence mode="wait">
          {shouldShowContent && renderWidget()}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ==================== MAIN PAGE ====================

export function OverlayResolumePage() {
  const { state } = useOverlayConnection({ overlayName: "resolume" });
  
  // Get resolume config from state or use defaults
  const config: ResolumeConfig = state?.resolume || DEFAULT_RESOLUME_CONFIG;
  
  // Get match data for widgets
  const mainMatch = state?.data?.mainMatch;
  const seasonId = mainMatch?.competition?.season?.id;
  
  // Fetch standings data
  const { data: standings, loading: standingsLoading, error: standingsError } = useWidgetData<Standings>(
    `${API_ENDPOINTS.LIVE_STANDINGS}${seasonId ? `?seasonId=${seasonId}` : ""}`,
    { 
      autoFetch: !!seasonId,
      deps: [seasonId],
      refreshInterval: 30000,
    }
  );
  
  return (
    <div 
      className="relative overflow-hidden bg-transparent select-none font-montserrat text-[#F5F5F5]"
      style={{ 
        width: `${config.canvasWidth}px`, 
        height: `${config.canvasHeight}px`,
        backgroundColor: config.backgroundColor || "transparent",
      }}
    >
      <FontStyles />
      
      {/* Render all zones */}
      {config.zones.map((zone) => (
        <ZoneRenderer 
          key={zone.id}
          zone={zone}
          allZones={config.zones}
          standings={standings || undefined}
          standingsLoading={standingsLoading}
        />
      ))}
    </div>
  );
}
