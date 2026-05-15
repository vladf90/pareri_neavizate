/**
 * StatsWidget - Match Statistics Overlay with animated bars
 * 
 * Displays side-by-side comparison of match statistics:
 * - Possession, Shots, Shots on Target, Passes, Fouls, Corners
 * - Animated bars that grow from center
 * - Compact header with team logos and PN logo
 * 
 * @example
 * <StatsWidget match={match} stats={stats} />
 */

import { motion } from "framer-motion";
import type { Match, MatchStats, StatsKey } from "@parerineavizate/shared/models";
import logoPN from "../../assets/logo png-8.png";

// ==================== TYPES ====================

export interface StatsWidgetProps {
  match: Match | null;
  stats: MatchStats | null;
  /** Show header with team logos */
  showHeader?: boolean;
  /** Custom stat labels (default: standard soccer stats) */
  statOrder?: StatsKey[];
}

interface StatRowProps {
  label: string;
  homeValue: number;
  awayValue: number;
  delay: number;
}

// ==================== CONSTANTS ====================

const STAT_LABELS: Record<StatsKey, string> = {
  possession: "Posesie",
  shots_total: "Șuturi",
  shots_on_target: "Șuturi pe poartă",
  passes: "Pase",
  passes_accuracy: "Precizie pase",
  fouls: "Faulturi",
  corners: "Cornere",
  xg: "xG",
};

const DEFAULT_STAT_ORDER: StatsKey[] = [
  "possession",
  "shots_total",
  "shots_on_target",
  "passes",
  "fouls",
  "corners",
];

// ==================== SUB-COMPONENTS ====================

/**
 * Single stat row with animated bars growing from center
 */
function StatRow({ label, homeValue, awayValue, delay }: StatRowProps) {
  const total = homeValue + awayValue;
  
  // Avoid division by zero
  const homePercent = total > 0 ? (homeValue / total) * 100 : 50;
  const awayPercent = total > 0 ? (awayValue / total) * 100 : 50;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="flex items-center justify-between w-full mb-4"
    >
      {/* Home Value */}
      <span className="text-3xl font-bebas text-white w-12 text-right tabular-nums drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
        {homeValue}
      </span>

      {/* Bars Container */}
      <div className="flex-1 mx-4 flex flex-col items-center">
        <span className="text-xs font-bold font-montserrat text-white uppercase tracking-widest mb-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
          {label}
        </span>
         
        <div className="flex w-full h-3 bg-white/10 rounded-full overflow-hidden">
          {/* Home Bar (Cyan) - grows from center to left */}
          <div className="flex-1 flex justify-end pr-1">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${homePercent}%` }}
              transition={{ delay: delay + 0.3, duration: 1, ease: "easeOut" }}
              className="h-full bg-[#33EFFF] rounded-l-full shadow-[0_0_10px_#33EFFF]"
            />
          </div>
          
          {/* Center Line */}
          <div className="w-[2px] bg-white/10" />

          {/* Away Bar (Pink) - grows from center to right */}
          <div className="flex-1 flex justify-start pl-1">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${awayPercent}%` }}
              transition={{ delay: delay + 0.3, duration: 1, ease: "easeOut" }}
              className="h-full bg-[#F659FD] rounded-r-full shadow-[0_0_10px_#F659FD]"
            />
          </div>
        </div>
      </div>

      {/* Away Value */}
      <span className="text-3xl font-bebas text-white w-12 text-left tabular-nums drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
        {awayValue}
      </span>
    </motion.div>
  );
}

// ==================== MAIN COMPONENT ====================

export function StatsWidget({ 
  match, 
  stats, 
  showHeader = true,
  statOrder = DEFAULT_STAT_ORDER,
}: StatsWidgetProps) {
  // Early return if no data
  if (!match || !stats) {
    return null;
  }

  const { homeTeam, awayTeam } = match;

  // Filter stats that have data
  const availableStats = statOrder.filter(key => 
    stats.home[key] !== undefined || stats.away[key] !== undefined
  );

  return (
    <div className="w-[520px] h-auto font-montserrat text-white" style={{ transform: 'translateZ(0)', backfaceVisibility: 'hidden', imageRendering: '-webkit-optimize-contrast' as any }}>
      {/* Main Glass Panel */}
      <div className="w-full bg-[#0A1B51]/80 backdrop-blur-2xl border-2 border-[#F659FD]/50 rounded-[30px] shadow-[0_0_80px_rgba(0,0,0,0.8)] flex flex-col relative overflow-hidden">
        
        {/* Header: Team Logos + PN Logo */}
        {showHeader && (
          <div className="h-16 flex items-center justify-between px-8 border-b border-white/10 bg-gradient-to-b from-black/50 to-transparent">
            {/* Home Team Logo */}
            {homeTeam.crestUrl && (
              <img 
                src={homeTeam.crestUrl} 
                className="w-10 h-10 object-contain drop-shadow-lg" 
                alt={homeTeam.shortName} 
              />
            )}

            {/* PN Logo Center */}
            <img 
              src={logoPN} 
              className="h-12 object-contain drop-shadow-lg" 
              alt="Pareri Neavizate" 
            />

            {/* Away Team Logo */}
            {awayTeam.crestUrl && (
              <img 
                src={awayTeam.crestUrl} 
                className="w-10 h-10 object-contain drop-shadow-lg" 
                alt={awayTeam.shortName} 
              />
            )}
          </div>
        )}

        {/* Body: Stats List */}
        <div className="px-8 py-5 flex flex-col justify-center">
          {availableStats.length > 0 ? (
            availableStats.map((statKey, idx) => (
              <StatRow 
                key={statKey}
                label={STAT_LABELS[statKey]}
                homeValue={stats.home[statKey] ?? 0}
                awayValue={stats.away[statKey] ?? 0}
                delay={0.5 + (idx * 0.1)}
              />
            ))
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-white/40 py-10"
            >
              <span className="text-xl font-montserrat drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                Statistici indisponibile
              </span>
            </motion.div>
          )}
        </div>

        {/* Footer Gradient Decor */}
        <div className="absolute bottom-0 w-full h-2 bg-gradient-to-r from-[#33EFFF] via-[#F659FD] to-[#33EFFF]" />
      </div>
    </div>
  );
}
