/**
 * LiveTickerWidget - Real-time rotating carousel of match scores
 * 
 * Displays rotating ticker with live match scores from ticker matches.
 * Includes goal alert animation system that slides out when a goal is scored.
 * 
 * Features:
 * - Auto-rotating carousel of ticker matches (5 second intervals)
 * - Goal alert sidecar animation (slides left from behind ticker)
 * - Bouncing team logo on goal
 * - Progress bar for rotation timing
 * 
 * @example
 * <LiveTickerWidget matches={tickerMatches} goalAlert={goalAlert} />
 */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Match } from "@parerineavizate/shared/models";

// ==================== TYPES ====================

export interface GoalAlert {
  id: string;
  teamName: string;
  teamLogo?: string;
  minute: string;
  newScore: string;
}

export interface LiveTickerWidgetProps {
  matches: Match[];
  competitionLabel?: string; // e.g., "UCL LIVE"
  goalAlert?: GoalAlert | null;
  onGoalAlertDismiss?: () => void;
}

// ==================== CONSTANTS ====================

const smoothTransition = { duration: 0.8, ease: [0.25, 0.1, 0.25, 1] };

// ==================== HELPERS ====================

function getStatusDisplay(match: Match): string {
  if (match.status === "HT") return "HT";
  if (match.status === "FT") return "FT";
  if (match.status === "NS") {
    return new Date(match.startTime).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }
  return match.clock?.display || match.status;
}

function isLive(match: Match): boolean {
  return match.status === "LIVE" || 
         (match.status !== "HT" && match.status !== "FT" && match.status !== "NS");
}

// ==================== MAIN WIDGET ====================

export function LiveTickerWidget({ 
  matches, 
  competitionLabel = "LIVE", 
  goalAlert,
  onGoalAlertDismiss 
}: LiveTickerWidgetProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Keep reference to last valid matches to prevent flash during data updates
  const lastValidMatchesRef = useRef<Match[]>([]);
  if (matches.length > 0) {
    lastValidMatchesRef.current = matches;
  }
  const stableMatches = matches.length > 0 ? matches : lastValidMatchesRef.current;

  // Auto-rotation every 5 seconds - use stableMatches.length
  useEffect(() => {
    if (stableMatches.length === 0) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % stableMatches.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [stableMatches.length]);

  // Auto-dismiss goal alert after 6 seconds
  useEffect(() => {
    if (goalAlert && onGoalAlertDismiss) {
      const timeout = setTimeout(() => {
        onGoalAlertDismiss();
      }, 6000);
      return () => clearTimeout(timeout);
    }
  }, [goalAlert, onGoalAlertDismiss]);

  // Don't render if no matches ever received AND no goal alert
  if (stableMatches.length === 0 && !goalAlert) {
    return null;
  }

  // Ensure currentIndex is valid for current matches length
  const safeIndex = stableMatches.length > 0 ? currentIndex % stableMatches.length : 0;
  const currentMatch = stableMatches.length > 0 ? stableMatches[safeIndex] : null;

  // Use competition from current cycling match, fallback to prop
  const displayCompetitionLabel = currentMatch?.competition?.shortName || 
                                   currentMatch?.competition?.name || 
                                   competitionLabel;

  return (
    <div className="absolute bottom-10 right-10 w-fit h-20 pointer-events-none">
      <div className="relative w-full h-full flex items-center justify-end pointer-events-auto">
        
        {/* === A. GOAL EXTENSION (Sidecar) === */}
        <AnimatePresence>
          {goalAlert && (
            <motion.div
              initial={{ x: 0, opacity: 0 }}
              animate={{ x: -440, opacity: 1 }} 
              exit={{ x: 0, opacity: 0 }} 
              transition={smoothTransition}
              className="absolute right-0 h-14 flex items-center bg-[#1E2C49]/90 backdrop-blur-xl border border-[#F659FD] rounded-l-full rounded-r-lg pr-4 pl-4 shadow-[0_0_20px_rgba(246,89,253,0.3)] z-0 min-w-[160px]"
            >
              {/* Gradient Decorativ */}
              <div className="absolute inset-0 bg-gradient-to-l from-[#F659FD]/20 to-transparent pointer-events-none rounded-l-full" />

              {/* Content */}
              <div className="flex items-center gap-4 w-full justify-between">
                
                {/* Bouncing Logo */}
                <motion.div 
                  className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center border border-white/20"
                  animate={{ y: [0, -6, 0] }}
                  transition={{ repeat: Infinity, duration: 0.6, ease: "easeInOut" }}
                >
                  {goalAlert.teamLogo ? (
                    <img src={goalAlert.teamLogo} className="w-6 h-6 object-contain" alt="Scorer" />
                  ) : (
                    <span className="text-white text-lg">⚽</span>
                  )}
                </motion.div>

                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-2">
                    <span className="text-white opacity-60 font-mono text-[10px]">{goalAlert.minute}</span>
                    <span className="text-[#F659FD] font-black text-[10px] uppercase tracking-widest leading-none">
                      GOAL!
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bebas text-[#33EFFF] leading-none">
                      {goalAlert.newScore}
                    </span>
                    <span className="text-xl font-bebas text-white leading-none tracking-wide">
                      {goalAlert.teamName}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>


        {/* === B. MAIN TICKER === */}
        {currentMatch && (
          <div 
            className="relative z-20 h-16 bg-[#0A1B51]/60 backdrop-blur-md border border-[#33EFFF]/30 rounded-full flex items-center pl-6 pr-2 shadow-[0_4px_30px_rgba(0,0,0,0.8)] overflow-hidden w-[420px]" 
            style={{ 
              transform: 'translate3d(0, 0, 0)', 
              backfaceVisibility: 'hidden',
              willChange: 'auto'
            }}
          >
            
            {/* Gradient contrast */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

            {/* Fixed label */}
            <div className="relative z-10 flex flex-col justify-center border-r border-[#33EFFF]/20 pr-4 mr-4 flex-shrink-0">
              <span className="text-[9px] font-bold text-white uppercase tracking-widest leading-none mb-0.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                {displayCompetitionLabel}
              </span>
              <span className="text-xl font-bebas text-[#33EFFF] tracking-wide leading-none">
                ALTE MECIURI
              </span>
            </div>

            {/* Carousel Content */}
            <div className="relative z-10 flex-1 h-full flex items-center overflow-hidden">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={currentMatch.id}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }} 
                  className="flex items-center gap-2 w-full justify-between"
                  style={{ willChange: 'transform, opacity' }}
                >
                  {/* Current match */}
                  <div className="flex items-center gap-2 flex-1 justify-center">
                    
                    {/* Home team */}
                    <div className="flex items-center gap-2 justify-end flex-1">
                      <span className="text-xl font-bebas text-[#F5F5F5] truncate text-right">
                        {currentMatch.homeTeam?.shortName || currentMatch.homeTeam?.name || "HOME"}
                      </span>
                      {currentMatch.homeTeam?.crestUrl && (
                        <img 
                          src={currentMatch.homeTeam.crestUrl} 
                          className="w-6 h-6 object-contain flex-shrink-0" 
                          alt="Home" 
                        />
                      )}
                    </div>

                    {/* Score */}
                    <div className="bg-black/40 px-2 py-0.5 rounded flex items-center gap-1 border border-white/10 flex-shrink-0">
                      <span className="text-xl font-bebas text-[#33EFFF]">{currentMatch.score?.home ?? 0}</span>
                      <span className="text-xs text-white/40 font-bold">-</span>
                      <span className="text-xl font-bebas text-[#33EFFF]">{currentMatch.score?.away ?? 0}</span>
                    </div>

                    {/* Away team */}
                    <div className="flex items-center gap-2 justify-start flex-1">
                      {currentMatch.awayTeam?.crestUrl && (
                        <img 
                          src={currentMatch.awayTeam.crestUrl} 
                          className="w-6 h-6 object-contain flex-shrink-0" 
                          alt="Away" 
                        />
                      )}
                      <span className="text-xl font-bebas text-[#F5F5F5] truncate text-left">
                        {currentMatch.awayTeam?.shortName || currentMatch.awayTeam?.name || "AWAY"}
                      </span>
                    </div>

                  </div>

                  {/* Status badge */}
                  <div className="flex items-center justify-center w-12 flex-shrink-0 ml-1 bg-[#F659FD]/20 px-1 py-0.5 rounded text-[#F659FD] border border-[#F659FD]/20">
                    {isLive(currentMatch) && (
                      <div className="w-1.5 h-1.5 bg-[#F659FD] rounded-full mr-1" style={{ animation: 'pulse 2s ease-in-out infinite' }} />
                    )}
                    <span className="text-sm font-bold font-mono leading-none pt-[1px]">
                      {getStatusDisplay(currentMatch)}
                    </span>
                  </div>

                </motion.div>
              </AnimatePresence>
            </div>

            {/* Progress bar - CSS animation instead of framer-motion */}
            <div 
              key={currentIndex}
              className="absolute bottom-0 left-0 h-[2px] bg-[#33EFFF]/50"
              style={{ 
                animation: 'progressBar 5s linear forwards',
                willChange: 'width'
              }}
            />

          </div>
        )}

      </div>
    </div>
  );
}

export default LiveTickerWidget;
