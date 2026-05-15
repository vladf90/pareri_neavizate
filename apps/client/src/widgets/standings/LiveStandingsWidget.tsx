/**
 * LiveStandingsWidget - Real-time league standings display
 * 
 * Features:
 * - Dynamic column layout: 1-3 columns based on team count
 * - API-based qualification zones with dynamic colors
 * - Position change indicators
 * - Highlighted teams (currently playing)
 * - Animated reveal
 * 
 * Zone colors:
 * - Champion: Gold
 * - Promotion: Green
 * - Promotion Playoff: Magenta
 * - Playoff: Cyan
 * - Relegation Playoff: Orange
 * - Relegation: Red
 * 
 * @example
 * <LiveStandingsWidget standings={standings} highlightTeamIds={[teamId1, teamId2]} />
 */

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Standings, StandingEntry, QualificationZone } from "@parerineavizate/shared/models";
import logoImage from "@/assets/logo png-8.png";

// ==================== TYPES ====================

export interface LiveStandingsWidgetProps {
  standings: Standings;
  highlightTeamIds?: string[];
  isActive?: boolean;
}

// ==================== CONSTANTS ====================

function getLayoutConfig(totalTeams: number): { columns: number; teamsPerColumn: number } {
  if (totalTeams <= 12) {
    return { columns: 1, teamsPerColumn: totalTeams };
  } else if (totalTeams <= 20) {
    return { columns: 2, teamsPerColumn: Math.ceil(totalTeams / 2) };
  } else {
    return { columns: 3, teamsPerColumn: Math.ceil(totalTeams / 3) };
  }
}

const ZONE_STYLES: Record<QualificationZone, { bg: string; border: string; text: string }> = {
  champion: { 
    bg: "bg-[#FFD700]/[0.20]", 
    border: "border-l-[#FFD700]", 
    text: "text-[#FFD700]" 
  },
  promotion: { 
    bg: "bg-[#00FF9D]/[0.15]", 
    border: "border-l-[#00FF9D]", 
    text: "text-[#00FF9D]" 
  },
  promotion_playoff: { 
    bg: "bg-[#F659FD]/[0.15]", 
    border: "border-l-[#F659FD]", 
    text: "text-[#F659FD]" 
  },
  playoff: { 
    bg: "bg-[#33EFFF]/[0.15]", 
    border: "border-l-[#33EFFF]", 
    text: "text-[#33EFFF]" 
  },
  relegation_playoff: { 
    bg: "bg-[#FFA500]/[0.15]", 
    border: "border-l-[#FFA500]", 
    text: "text-[#FFA500]" 
  },
  relegation: { 
    bg: "bg-[#FF4444]/[0.15]", 
    border: "border-l-[#FF4444]", 
    text: "text-[#FF4444]" 
  },
  none: { 
    bg: "bg-white/[0.08]", 
    border: "border-l-white/30", 
    text: "text-white/70" 
  },
};

const ZONE_LABELS: Partial<Record<QualificationZone, string>> = {
  champion: "Champion",
  promotion: "Direct Qualification",
  promotion_playoff: "Playoff Qualification",
  playoff: "Playoff",
  relegation_playoff: "Relegation Playoff",
  relegation: "Relegation",
};

// ==================== SUB-COMPONENTS ====================

function PositionChangeIndicator({ change }: { change?: number }) {
  if (!change || change === 0) return null;

  const isUp = change > 0;
  const absChange = Math.abs(change);

  return (
    <div className={`flex items-center gap-0.5 ${isUp ? "text-[#00FF9D]" : "text-red-500"}`}>
      <svg 
        className={`w-4 h-4 ${isUp ? "" : "rotate-180"}`} 
        viewBox="0 0 24 24" 
        fill="currentColor"
      >
        <path d="M12 4L4 14h5v6h6v-6h5L12 4z" />
      </svg>
      <span className="text-sm font-bold font-montserrat">
        {absChange}
      </span>
    </div>
  );
}

interface TeamRowProps {
  entry: StandingEntry;
  index: number;
  isHighlighted?: boolean;
  columnIndex: number;
}

function TeamRow({ entry, index, isHighlighted, columnIndex }: TeamRowProps) {
  const rank = entry.position;
  const positionChange = entry.positionChange;
  
  const zone = entry.qualificationZone || "none";
  const zoneStyle = ZONE_STYLES[zone];
  
  let rowStyle = `${zoneStyle.bg} border-l-[6px] ${zoneStyle.border}`;
  let rankColor = zoneStyle.text;

  if (isHighlighted) {
    rowStyle = "bg-[#33EFFF]/[0.50] border-l-[6px] border-l-[#33EFFF] shadow-[0_0_15px_rgba(51,239,255,0.3)]";
    rankColor = "text-[#33EFFF]";
  }

  const animationDelay = columnIndex * 0.1 + index * 0.02;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ 
        layout: { duration: 0.4, ease: "easeInOut" },
        opacity: { duration: 0.4 },
        x: { duration: 0.4, delay: animationDelay }
      }}
      className={`relative flex items-center justify-between px-2 h-[62px] rounded-r-lg ${rowStyle}`}
    >
      <div className="flex items-center w-8 justify-center">
        <span className={`text-[36px] font-bebas ${rankColor} drop-shadow-lg text-center leading-none`}>
          {rank}.
        </span>
      </div>

      <div className="flex items-center flex-1 gap-1 min-w-0">
        {entry.team.crestUrl && (
          <div className="w-10 h-10 flex-shrink-0 relative filter drop-shadow-lg">
            <img 
              src={entry.team.crestUrl} 
              className="w-full h-full object-contain" 
              alt={entry.team.name} 
            />
          </div>
        )}
        <span className="text-[18px] font-semibold font-montserrat text-[#F5F5F5] tracking-wide leading-none drop-shadow-md truncate">
          {entry.team.name}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <div className="w-10 flex justify-center">
          <PositionChangeIndicator change={positionChange} />
        </div>
        
        <div className="flex flex-col items-center w-12">
          <span className="text-[9px] font-black text-[#33EFFF] uppercase tracking-wide leading-none">GD</span>
          <span className="text-[28px] font-bebas text-[#F5F5F5] leading-none">
            {entry.goalDifference > 0 ? `+${entry.goalDifference}` : entry.goalDifference}
          </span>
        </div>
        
        <div className="flex flex-col items-center w-12 bg-[#0A1B51]/70 rounded py-1 border border-white/10 shadow-lg">
          <span className="text-[9px] font-black text-[#33EFFF] uppercase tracking-wide leading-none">PTS</span>
          <span className="text-[28px] font-bebas text-[#F5F5F5] leading-none">{entry.points}</span>
        </div>
      </div>
    </motion.div>
  );
}

function ColumnHeader({ startPos, endPos }: { startPos: number; endPos: number }) {
  return (
    <div className="flex items-center justify-center py-1.5 mb-1.5 border-y border-[#33EFFF]/50">
      <span className="text-xl font-bebas text-[#F659FD] tracking-wider">
        #{startPos} - #{endPos}
      </span>
    </div>
  );
}

interface StandingsColumnProps {
  entries: StandingEntry[];
  columnIndex: number;
  highlightTeamIds: string[];
  animationDirection?: "left" | "right" | "top";
}

function StandingsColumn({ entries, columnIndex, highlightTeamIds, animationDirection }: StandingsColumnProps) {
  if (entries.length === 0) return null;
  
  const startPos = entries[0]?.position || 1;
  const endPos = entries[entries.length - 1]?.position || startPos;

  const getAnimation = () => {
    switch (animationDirection) {
      case "left":
        return { initial: { opacity: 0, x: -200 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -200 } };
      case "right":
        return { initial: { opacity: 0, x: 200 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: 200 } };
      case "top":
        return { initial: { opacity: 0, y: -200 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -200 } };
      default:
        return { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 20 } };
    }
  };

  const animation = getAnimation();

  return (
    <motion.div
      initial={animation.initial}
      animate={animation.animate}
      exit={animation.exit}
      transition={{ duration: 0.5, delay: columnIndex * 0.15, ease: "easeOut" }}
      className="flex-1 flex flex-col min-w-0"
    >
      <ColumnHeader startPos={startPos} endPos={endPos} />
      <div className="flex flex-col gap-[2px]">
        {entries.map((entry, idx) => (
          <TeamRow 
            key={entry.team.id}
            entry={entry}
            index={idx}
            columnIndex={columnIndex}
            isHighlighted={highlightTeamIds.includes(entry.team.id)}
          />
        ))}
      </div>
    </motion.div>
  );
}

// ==================== MAIN WIDGET ====================

export function LiveStandingsWidget({ standings, highlightTeamIds = [], isActive = true }: LiveStandingsWidgetProps) {
  const entries = standings.entries || [];
  const sortedEntries = [...entries].sort((a, b) => a.position - b.position);
  
  const { columns: numColumns, teamsPerColumn } = getLayoutConfig(sortedEntries.length);
  
  const columnData: StandingEntry[][] = [];
  for (let i = 0; i < numColumns; i++) {
    columnData.push(sortedEntries.slice(i * teamsPerColumn, (i + 1) * teamsPerColumn));
  }
  
  const zoneLabelsFromData = new Map<QualificationZone, string>();
  for (const entry of sortedEntries) {
    if (entry.qualificationZone && entry.qualificationZone !== "none") {
      if (!zoneLabelsFromData.has(entry.qualificationZone)) {
        zoneLabelsFromData.set(entry.qualificationZone, entry.qualificationLabel || "");
      }
    }
  }
  
  const getLegendLabel = (zone: QualificationZone): string => {
    const apiLabel = zoneLabelsFromData.get(zone);
    if (apiLabel) return apiLabel;
    return ZONE_LABELS[zone] || zone;
  };
  
  const containerWidth = numColumns === 1 ? "w-[600px]" : 
                         numColumns === 2 ? "w-[1200px]" : "w-[1720px]";
  
  const getAnimationDirection = (colIndex: number): "left" | "right" | "top" => {
    if (numColumns === 1) return "top";
    if (colIndex === 0) return "left";
    if (colIndex === numColumns - 1) return "right";
    return "top";
  };
  
  return (
    <AnimatePresence>
      {isActive && (
        <motion.div 
          className="absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{ transform: 'translateZ(0)', backfaceVisibility: 'hidden', perspective: '1000px' }}
        >
          <motion.div 
            className={`${containerWidth} bg-[#0A1B51]/40 backdrop-blur-2xl border-4 border-[#33EFFF] rounded-[32px] shadow-[0_0_80px_rgba(51,239,255,0.2)] overflow-hidden flex flex-col relative`}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            {/* Header */}
            <div className="py-3 px-6 flex items-center justify-between border-b-2 border-white/10 bg-gradient-to-b from-[#0A1B51]/90 to-transparent">
              <div className="w-12 h-12 flex-shrink-0">
                <img src={logoImage} className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(246,89,253,0.5)]" alt="Pareri Neavizate" />
              </div>

              <div className="flex flex-col items-center">
                <h1 className="text-[52px] font-bebas text-white tracking-widest text-center leading-[0.85] drop-shadow-xl">
                  LIVE STANDINGS
                </h1>
                <span className="text-base font-montserrat font-black text-[#33EFFF] tracking-[0.3em] uppercase drop-shadow-md">
                  {standings.competitionName || "League"}
                </span>
              </div>

              <div className="flex flex-col gap-1 text-[11px] font-montserrat font-semibold">
                {Array.from(zoneLabelsFromData.keys()).slice(0, 4).map((zone) => {
                  const style = ZONE_STYLES[zone];
                  return (
                    <div key={zone} className="flex items-center gap-1.5">
                      <div className={`w-2.5 h-2.5 rounded-full ${style.border.replace('border-l-', 'bg-')}`} />
                      <span className={style.text}>{getLegendLabel(zone)}</span>
                    </div>
                  );
                })}
                {zoneLabelsFromData.size === 0 && (
                  <span className="text-white/50 text-xs">No qualification data</span>
                )}
              </div>
            </div>

            {/* Body */}
            <div className="flex gap-1 px-3 py-2">
              {columnData.map((colEntries, colIndex) => (
                <React.Fragment key={colIndex}>
                  {colIndex > 0 && colEntries.length > 0 && (
                    <motion.div 
                      className="w-[2px] bg-gradient-to-b from-transparent via-[#33EFFF]/40 to-transparent"
                      initial={{ opacity: 0, scaleY: 0 }}
                      animate={{ opacity: 1, scaleY: 1 }}
                      exit={{ opacity: 0, scaleY: 0 }}
                      transition={{ duration: 0.4, delay: colIndex * 0.15 }}
                    />
                  )}
                  <StandingsColumn 
                    entries={colEntries}
                    columnIndex={colIndex}
                    highlightTeamIds={highlightTeamIds}
                    animationDirection={getAnimationDirection(colIndex)}
                  />
                </React.Fragment>
              ))}
            </div>

            {/* Bottom Accent */}
            <motion.div 
              className="absolute bottom-0 left-0 w-full h-2 bg-gradient-to-r from-[#33EFFF] via-[#F659FD] to-[#33EFFF]"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              exit={{ scaleX: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
