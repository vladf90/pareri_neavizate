/**
 * Live Standings UCL Overlay Page - Part 2 (Positions 17-32)
 * 
 * Dedicated overlay for UCL 32-team format.
 * Shows positions 17-32 (bottom half).
 * Dimensions: 1080x1920px (9:16 VERTICAL)
 */

import { motion } from "framer-motion";
import { useWidgetData } from "@/hooks/useWidgetData";
import { useOverlayConnection } from "@/hooks/useOverlayConnection";
import { API_ENDPOINTS } from "@/config";
import { FontStyles } from "@/widgets";
import type { Standings, StandingEntry } from "@parerineavizate/shared/models";
import logoImage from "@/assets/logo png-8.png";

// ==================== COMPONENTS ====================

function PositionChangeIndicator({ change }: { change?: number }) {
  if (!change || change === 0) return null;

  const isUp = change > 0;
  const absChange = Math.abs(change);

  return (
    <div className={`flex items-center gap-0.5 ${isUp ? "text-[#00FF9D]" : "text-red-500"}`}>
      <svg 
        className={`w-5 h-5 ${isUp ? "" : "rotate-180"}`} 
        viewBox="0 0 24 24" 
        fill="currentColor"
      >
        <path d="M12 4L4 14h5v6h6v-6h5L12 4z" />
      </svg>
      <span className="text-lg font-bold font-montserrat">
        {absChange}
      </span>
    </div>
  );
}

interface TeamRowProps {
  entry: StandingEntry;
  index: number;
  qualificationLine?: number;
  playoffLine?: number;
  isHighlighted?: boolean;
}

function TeamRow({ entry, index, qualificationLine = 8, playoffLine = 24, isHighlighted }: TeamRowProps) {
  const rank = entry.position;
  const positionChange = entry.positionChange;
  
  let rowStyle = "";
  let rankColor = "";
  
  // 1-8: Verde (calificare directă), 9-24: Roz (playoff), 25+: fără highlight
  if (rank <= qualificationLine) {
    rowStyle = "bg-[#00FF9D]/15 border-l-[8px] border-l-[#00FF9D]";
    rankColor = "text-[#00FF9D]";
  } else if (rank <= playoffLine) {
    rowStyle = "bg-[#F659FD]/15 border-l-[8px] border-l-[#F659FD]";
    rankColor = "text-[#F659FD]";
  } else {
    rowStyle = "bg-white/5 border-l-[8px] border-l-white/20";
    rankColor = "text-white/50";
  }

  if (isHighlighted) {
    rowStyle = "bg-[#33EFFF]/20 border-l-[8px] border-l-[#33EFFF]";
    rankColor = "text-[#33EFFF]";
  }

  // Row height: 16 teams must fit in ~1400px body = 87.5px per row
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ 
        layout: { duration: 0.4, ease: "easeInOut" },
        opacity: { duration: 0.4 },
        x: { duration: 0.4, delay: 0.02 * index }
      }}
      className={`relative flex items-center justify-between px-4 h-[85px] rounded-r-xl ${rowStyle}`}
    >
      {/* Rank + Position Change */}
      <div className="flex items-center w-20 justify-start gap-1">
        <span className={`text-[56px] font-bebas ${rankColor} drop-shadow-lg w-12 text-center leading-none`}>
          {rank}
        </span>
        <PositionChangeIndicator change={positionChange} />
      </div>

      {/* Team Logo + Name */}
      <div className="flex items-center flex-1 gap-4 ml-2 min-w-0">
        {entry.team.crestUrl && (
          <div className="w-14 h-14 flex-shrink-0 relative filter drop-shadow-lg">
            <img 
              src={entry.team.crestUrl} 
              className="w-full h-full object-contain" 
              alt={entry.team.name} 
            />
          </div>
        )}
        <span className="text-[40px] font-bebas text-[#F5F5F5] tracking-wide leading-none drop-shadow-md truncate">
          {entry.team.shortName || entry.team.name}
        </span>
      </div>

      {/* Stats: GD + PTS */}
      <div className="flex items-center gap-4 mr-2">
        <div className="flex flex-col items-center w-14">
          <span className="text-[12px] font-bold text-[#F5F5F5]/50 uppercase leading-none">GD</span>
          <span className="text-[28px] font-bebas text-[#F5F5F5]/90 leading-none mt-0.5">
            {entry.goalDifference > 0 ? `+${entry.goalDifference}` : entry.goalDifference}
          </span>
        </div>
        
        <div className="flex flex-col items-center w-16 bg-[#0A1B51]/70 rounded-lg py-2 border-2 border-white/10 shadow-lg">
          <span className="text-[11px] font-black text-[#33EFFF] uppercase tracking-wide leading-none">PTS</span>
          <span className="text-[42px] font-bebas text-[#F5F5F5] leading-none">{entry.points}</span>
        </div>
      </div>

      {/* Playoff line indicator at position 24 */}
      {rank === playoffLine && (
        <div className="absolute bottom-[-5px] left-0 w-full h-[4px] bg-[#F659FD] shadow-[0_0_15px_#F659FD] z-10" />
      )}
    </motion.div>
  );
}

interface LiveStandingsWidgetProps {
  standings: Standings;
  qualificationLine?: number;
  playoffLine?: number;
  highlightTeamIds?: string[];
  subtitle?: string;
}

function LiveStandingsWidget({ standings, qualificationLine = 8, playoffLine = 24, highlightTeamIds = [], subtitle }: LiveStandingsWidgetProps) {
  const entries = standings.entries || [];
  
  return (
    <div className="absolute inset-0 flex items-center justify-center p-4">
      <div className="w-full h-full bg-[#0A1B51]/30 backdrop-blur-2xl border-4 border-[#33EFFF] rounded-[40px] shadow-[0_0_80px_rgba(51,239,255,0.2)] overflow-hidden flex flex-col relative">
        
        {/* Compact Header - optimized for 1080x1920 */}
        <div className="pt-5 pb-3 px-6 flex flex-col items-center justify-center border-b-2 border-white/10 bg-gradient-to-b from-[#0A1B51]/90 to-transparent">
          <div className="w-16 h-16 mb-2 bg-white/5 rounded-full flex items-center justify-center border-2 border-[#F659FD] shadow-[0_0_20px_rgba(246,89,253,0.4)] overflow-hidden">
            <img src={logoImage} className="w-12 h-12 object-contain" alt="Pareri Neavizate" />
          </div>

          <h1 className="text-[72px] font-bebas text-white tracking-widest text-center leading-[0.85] mb-1 drop-shadow-xl">
            LIVE STANDINGS
          </h1>
          <span className="text-xl font-montserrat font-black text-[#33EFFF] tracking-[0.35em] uppercase drop-shadow-md">
            {standings.competitionName || "Champions League"}
          </span>
          {subtitle && (
            <span className="text-lg font-montserrat font-bold text-[#F659FD] tracking-[0.2em] uppercase mt-1">
              {subtitle}
            </span>
          )}
        </div>

        {/* Body - compact spacing for 16 teams */}
        <div className="flex-1 overflow-hidden px-3 py-3 flex flex-col gap-1 no-scrollbar">
          {entries.map((entry, idx) => (
            <TeamRow 
              key={entry.team.id}
              entry={entry}
              index={idx}
              qualificationLine={qualificationLine}
              playoffLine={playoffLine}
              isHighlighted={highlightTeamIds.includes(entry.team.id)}
            />
          ))}
        </div>

        {/* Compact Footer */}
        <div className="h-16 border-t-2 border-white/10 flex flex-col items-center justify-center bg-[#0A1B51]/80">
          <span className="text-sm uppercase tracking-[0.25em] text-[#F5F5F5]/50 font-bold">
            Brought to you by
          </span>
          <span className="text-3xl font-bebas text-[#F659FD] tracking-widest drop-shadow-[0_0_10px_rgba(246,89,253,0.5)]">
            SUPERBET
          </span>
        </div>

        {/* Bottom Accent Line */}
        <div className="absolute bottom-0 left-0 w-full h-2 bg-gradient-to-r from-[#33EFFF] via-[#F659FD] to-[#33EFFF]" />
      </div>
    </div>
  );
}

/**
 * Live Standings UCL Part 2 - Positions 17-32
 */
export function OverlayLiveStandingsUCL2Page() {
  const { state } = useOverlayConnection({ overlayName: "livestandings-ucl2" });
  const mainMatch = state?.data?.mainMatch;
  const mainMatchId = state?.selection?.mainMatchId;
  const seasonId = mainMatch?.competition?.season?.id;
  
  const isLoadingMatch = mainMatchId && !mainMatch;
  
  const { data: standings, loading, error } = useWidgetData<Standings>(
    `${API_ENDPOINTS.LIVE_STANDINGS}${seasonId ? `?seasonId=${seasonId}` : ""}`,
    { 
      autoFetch: !!seasonId,
      deps: [seasonId],
      refreshInterval: 2000,
    }
  );

  const highlightTeamIds = mainMatch 
    ? [mainMatch.homeTeam.id, mainMatch.awayTeam.id]
    : [];

  if (!mainMatchId) {
    return (
      <div className="relative w-[1080px] h-[1920px] overflow-hidden bg-transparent select-none flex items-center justify-center font-montserrat text-[#F5F5F5]">
        <FontStyles />
        <div className="text-white/30 font-montserrat text-xl">
          No match selected
        </div>
      </div>
    );
  }

  if (isLoadingMatch || loading) {
    return (
      <div className="relative w-[1080px] h-[1920px] overflow-hidden bg-transparent select-none flex items-center justify-center font-montserrat text-[#F5F5F5]">
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
      <div className="relative w-[1080px] h-[1920px] overflow-hidden bg-transparent select-none flex items-center justify-center font-montserrat text-[#F5F5F5]">
        <FontStyles />
        <div className="text-white/30 font-montserrat text-xl text-center px-8">
          {error || "Live standings not available for this competition"}
        </div>
      </div>
    );
  }

  // UCL format: 1-8 direct, 9-24 playoffs
  const qualificationLine = 8;
  const playoffLine = 24;

  // Get positions 17-32
  const sortedEntries = [...standings.entries].sort((a, b) => a.position - b.position);
  const segmentedStandings = {
    ...standings,
    entries: sortedEntries.slice(16, 32)
  };

  return (
    <div className="relative w-[1080px] h-[1920px] overflow-hidden bg-transparent select-none font-montserrat text-[#F5F5F5]">
      <FontStyles />
      <LiveStandingsWidget 
        standings={segmentedStandings}
        qualificationLine={qualificationLine}
        playoffLine={playoffLine}
        highlightTeamIds={highlightTeamIds}
        subtitle="POSITIONS 17-32"
      />
    </div>
  );
}
