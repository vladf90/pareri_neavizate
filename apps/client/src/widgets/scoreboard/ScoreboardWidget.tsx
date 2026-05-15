/**
 * ScoreboardWidget - Broadcast-quality scoreboard with animations
 * 
 * Features:
 * - Goal animation (pink fill + GOL! text + competition logo)
 * - VAR overlay with check animation
 * - Red cards display above teams
 * - Stoppage time pink mode
 * - ET label animation at key moments
 * - HT/FT/PEN status modes
 * - Score change animations
 * - Client-side clock interpolation
 * 
 * @example
 * <ScoreboardWidget match={match} events={events} />
 */

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef, useCallback } from "react";
import { useInterpolatedClock } from "@/hooks/useInterpolatedClock";
import type { Match, MatchEvent } from "@parerineavizate/shared/models";

// Competitions that should keep original logo colors (not inverted to white)
const KEEP_ORIGINAL_LOGO_COMPETITIONS = [
  "Bundesliga",
  "Ligue 1", 
  "Superliga",
  "Serie A",
];

function shouldKeepOriginalLogo(competitionName?: string): boolean {
  if (!competitionName) return false;
  return KEEP_ORIGINAL_LOGO_COMPETITIONS.some(name => 
    competitionName.toLowerCase().includes(name.toLowerCase())
  );
}

// ==================== TYPES ====================

interface GoalAnimationState {
  isActive: boolean;
  phase: 'idle' | 'filling' | 'text-gol' | 'logo-comp' | 'draining';
  scoringTeam: 'home' | 'away' | null;
}

interface RedCardsState {
  home: number;
  away: number;
}

export interface ScoreboardWidgetProps {
  match: Match;
  events?: MatchEvent[];
}

// ==================== SUB-COMPONENTS ====================

function ScrambleText({ text }: { text: string }) {
  const [displayText, setDisplayText] = useState(text);
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*';

  useEffect(() => {
    let iterations = 0;
    const interval = setInterval(() => {
      setDisplayText(text.split('').map((_letter, index) => {
        if (index < iterations) return text[index];
        return characters[Math.floor(Math.random() * characters.length)];
      }).join(''));

      if (iterations >= text.length) clearInterval(interval);
      iterations += 1 / 3;
    }, 30);

    return () => clearInterval(interval);
  }, [text]);

  return <span>{displayText}</span>;
}

// ==================== MAIN WIDGET ====================

export function ScoreboardWidget({ match, events }: ScoreboardWidgetProps) {
  // Use interpolated clock for smooth second-by-second updates
  const clock = useInterpolatedClock(match.clock);
  
  // Goal animation state
  const [goalAnimation, setGoalAnimation] = useState<GoalAnimationState>({
    isActive: false,
    phase: 'idle',
    scoringTeam: null
  });
  
  // VAR active state (triggered by NEW VAR events only)
  const [varActive, setVarActive] = useState(false);
  
  // ET label state (shows "ET" at key stoppage time moments)
  const [showETLabel, setShowETLabel] = useState(false);
  
  // Track previous score for detecting goals (only triggers animation on CHANGE)
  const prevScoreRef = useRef({ home: match.score.home, away: match.score.away });
  // Flag to skip first render (don't animate on initial load)
  const isFirstRenderRef = useRef(true);
  
  // Track processed events to avoid duplicate animations
  // This persists across renders - events already seen won't trigger again
  const processedEventsRef = useRef<Set<string>>(new Set());
  
  // Track match ID to detect when match changes
  const prevMatchIdRef = useRef(match.id);
  
  // Reset all refs when match changes (prevents triggering old events/scores on match switch)
  useEffect(() => {
    if (prevMatchIdRef.current !== match.id) {
      // Match changed - reset everything
      prevScoreRef.current = { home: match.score.home, away: match.score.away };
      isFirstRenderRef.current = true;
      processedEventsRef.current = new Set();
      
      // Mark all current events as seen immediately
      if (events) {
        events.forEach(e => processedEventsRef.current.add(e.id));
      }
      isFirstRenderRef.current = false;
      
      prevMatchIdRef.current = match.id;
    }
  }, [match.id, match.score.home, match.score.away, events]);
  
  // RED CARDS - Always show, even if we weren't live when they happened
  // This is permanent state, not an animation
  const redCards: RedCardsState = {
    home: events?.filter(e => 
      (e.kind === 'RED' || e.kind === 'SECOND_YELLOW') && e.teamSide === 'HOME'
    ).length || 0,
    away: events?.filter(e => 
      (e.kind === 'RED' || e.kind === 'SECOND_YELLOW') && e.teamSide === 'AWAY'
    ).length || 0
  };
  
  // Detect stoppage time (pink mode) - ONLY when we have added time (45+X, 90+X, etc.)
  // This uses clock.addedMinute which is > 0 only during actual stoppage/added time
  const isStoppageTime = clock.addedMinute > 0 && match.status === 'LIVE';
  
  const isPinkMode = isStoppageTime || match.status === 'PEN';
  
  // Trigger goal animation
  const triggerGoal = useCallback((team: 'home' | 'away') => {
    if (goalAnimation.isActive || varActive) return;
    
    setGoalAnimation({ isActive: true, phase: 'filling', scoringTeam: team });

    // Phase 1: Fill complete -> Show GOL! text
    setTimeout(() => {
      setGoalAnimation(prev => ({ ...prev, phase: 'text-gol' }));
    }, 1200);

    // Phase 2: Show competition logo
    setTimeout(() => {
      setGoalAnimation(prev => ({ ...prev, phase: 'logo-comp' }));
    }, 3500);

    // Phase 3: Drain animation
    setTimeout(() => {
      setGoalAnimation(prev => ({ ...prev, phase: 'draining' }));
    }, 5500);

    // Phase 4: Reset
    setTimeout(() => {
      setGoalAnimation({ isActive: false, phase: 'idle', scoringTeam: null });
    }, 6000);
  }, [goalAnimation.isActive, varActive]);
  
  // Trigger VAR animation (shows for ~30 seconds then auto-hides)
  const triggerVar = useCallback(() => {
    if (varActive || goalAnimation.isActive) return;
    
    setVarActive(true);
    
    // Auto-hide after 30 seconds (VAR checks typically last a while)
    setTimeout(() => {
      setVarActive(false);
    }, 30000);
  }, [varActive, goalAnimation.isActive]);
  
  // Initialize: Mark all existing events as "seen" on first render
  // This prevents triggering animations for old events when we start watching
  useEffect(() => {
    if (events && isFirstRenderRef.current) {
      events.forEach(e => processedEventsRef.current.add(e.id));
      isFirstRenderRef.current = false;
    }
  }, [events]);
  
  // Detect NEW events and trigger appropriate animations
  // Only triggers for events we haven't seen before
  useEffect(() => {
    if (!events || isFirstRenderRef.current) return;
    
    for (const event of events) {
      // Skip already processed events
      if (processedEventsRef.current.has(event.id)) continue;
      
      // Mark as processed
      processedEventsRef.current.add(event.id);
      
      // Trigger animation based on event type
      switch (event.kind) {
        case 'VAR':
          triggerVar();
          break;
        default:
          // Check if event is pending VAR (e.g., goal with "Pending VAR" in addition)
          if (event.isVarPending) {
            triggerVar();
          }
          // Goal animations are handled by score change detection
          // which is more reliable than events
          break;
      }
    }
  }, [events, triggerVar]);
  
  // Detect score changes and trigger goal animation
  // Only on CHANGE, not on initial load
  useEffect(() => {
    // Skip first render
    if (isFirstRenderRef.current) {
      prevScoreRef.current = { home: match.score.home, away: match.score.away };
      return;
    }
    
    const prevScore = prevScoreRef.current;
    
    if (match.score.home > prevScore.home) {
      triggerGoal('home');
    } else if (match.score.away > prevScore.away) {
      triggerGoal('away');
    }
    
    prevScoreRef.current = { home: match.score.home, away: match.score.away };
  }, [match.score.home, match.score.away, triggerGoal]);
  
  // Show ET label when stoppage time STARTS (transition from 0 to >0 addedMinute)
  const prevAddedMinuteRef = useRef(clock.addedMinute);
  
  useEffect(() => {
    if (match.status !== 'LIVE') return;
    
    // Show ET label when we enter stoppage time (addedMinute goes from 0 to > 0)
    if (prevAddedMinuteRef.current === 0 && clock.addedMinute > 0) {
      setShowETLabel(true);
    }
    
    prevAddedMinuteRef.current = clock.addedMinute;
  }, [clock.addedMinute, match.status]);
  
  
  // Hide ET label after 3 seconds
  useEffect(() => {
    if (showETLabel) {
      const timeout = setTimeout(() => setShowETLabel(false), 3000);
      return () => clearTimeout(timeout);
    }
  }, [showETLabel]);
  
  // Determine clock display based on match status
  const getClockDisplay = (): string => {
    if (match.status === 'NS') return 'VS';
    if (match.status === 'HT') return 'HT';
    if (match.status === 'FT') return 'FT';
    if (match.status === 'AET') return 'AET';
    if (match.status === 'PEN') return 'PEN';
    
    return clock.display;
  };
  
  const clockDisplay = getClockDisplay();
  const isStatusMode = ['HT', 'FT', 'AET', 'PEN', 'NS'].includes(match.status);

  return (
    <div className="absolute top-[80px] left-[100px] flex flex-col items-center" style={{ transform: 'translateZ(0)', backfaceVisibility: 'hidden', perspective: '1000px' }}>
      
      {/* Shadow Layer */}
      <div className="absolute top-0 left-0 w-full h-16 rounded-2xl shadow-[0_4px_40px_rgba(0,0,0,0.9)] z-0 pointer-events-none" />

      {/* VAR Overlay */}
      <AnimatePresence>
        {varActive && (
          <motion.div
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 120, damping: 14 }}
            className="absolute z-10 top-[58px] left-0 right-0 mx-auto w-fit bg-[#F659FD]/90 backdrop-blur-md border border-[#F659FD]/30 rounded-b-xl px-12 py-2 flex items-center justify-center shadow-[0_10px_30px_rgba(246,89,253,0.3)]"
          >
            <div className="flex items-center gap-3">
              <div className="w-5 h-4 border-2 border-white/90 rounded-sm bg-white/10" />
              <span className="text-3xl font-bebas text-white tracking-widest animate-pulse drop-shadow-md leading-none mt-0.5">
                VAR CHECK
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Scoreboard Container */}
      <motion.div 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 60 }}
        className="relative z-20 h-16 bg-black/20 backdrop-blur-xl border border-[#33EFFF]/20 rounded-2xl flex items-center overflow-visible shadow-[0_4px_40px_rgba(0,0,0,0.9)]"
      >
        
        {/* Background Mask Layer */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden z-0 pointer-events-none">
          <div className="absolute bottom-0 left-0 w-full h-[70%] bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        </div>

        {/* Goal Animation Layer (Z-30 - Above everything) */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden z-30 pointer-events-none">
          <AnimatePresence>
            {goalAnimation.isActive && (
              <motion.div 
                className="absolute inset-0 flex items-center justify-center pointer-events-auto"
                initial={{ x: '-100%' }}
                animate={{ x: goalAnimation.phase === 'draining' ? '100%' : '0%' }}
                exit={{ x: '100%' }}
                transition={{ duration: 1.2, ease: "circIn" }}
                style={{ backgroundColor: '#F659FD' }}
              >
                {/* Shimmer effect */}
                <div 
                  className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-40"
                  style={{ animation: 'shimmer 1s infinite' }}
                />
                
                <AnimatePresence mode="wait">
                  {goalAnimation.phase === 'text-gol' && (
                    <motion.div 
                      key="text-gol" 
                      initial={{ scale: 1.5, opacity: 0 }} 
                      animate={{ scale: 1, opacity: 1 }} 
                      exit={{ scale: 0.8, opacity: 0, y: -20 }} 
                      className="flex items-center justify-center"
                    >
                      <span className="text-6xl font-bebas text-white drop-shadow-[0_4px_0_rgba(0,0,0,0.2)] italic tracking-widest">
                        <ScrambleText text="GOL!" />
                      </span>
                    </motion.div>
                  )}
                  {goalAnimation.phase === 'logo-comp' && match.competition?.logoUrl && (
                    <motion.div 
                      key="logo-comp" 
                      initial={{ scale: 0.5, opacity: 0 }} 
                      animate={{ scale: 1, opacity: 1 }} 
                      exit={{ scale: 1.2, opacity: 0 }} 
                      transition={{ type: "spring", stiffness: 200, damping: 15 }} 
                      className="flex items-center justify-center"
                    >
                      <img 
                        src={match.competition.logoUrl} 
                        className={`h-12 w-auto drop-shadow-lg ${shouldKeepOriginalLogo(match.competition.name) ? '' : 'brightness-0 invert'}`}
                        alt="Competition" 
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 1. TIME/STATUS (Z-10) */}
        <div className="relative z-10 flex items-center justify-center h-full w-24 border-r border-[#33EFFF]/50 rounded-l-2xl overflow-hidden">
          {/* Pink background for stoppage time / PEN */}
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: isPinkMode ? "100%" : "0%" }}
            transition={{ type: "spring", stiffness: 50, damping: 15 }} 
            className="absolute inset-0 bg-[#F659FD] z-0"
          />
          
          <div className="relative z-10 flex justify-center items-center w-full">
            <AnimatePresence mode="wait">
              {showETLabel && match.status === 'LIVE' ? (
                <motion.span 
                  key="ET" 
                  initial={{ opacity: 0, y: 5 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -5 }} 
                  className="text-4xl font-bebas text-white tracking-wide pt-[3px] drop-shadow-md"
                >
                  ET
                </motion.span>
              ) : (
                <motion.span 
                  key={isStatusMode ? match.status : "time"}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`text-4xl font-bebas  w-[93px] h-[60px] flex justify-center items-center tracking-wide tabular-nums pt-[3px] drop-shadow-md text-center ${
                    isPinkMode || isStatusMode ? 'text-white' : 'text-[#33EFFF]'
                  }`}
                >
                  {clockDisplay}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* 2. HOME TEAM (Z-10) */}
        <div className="relative z-10 flex items-center gap-2 pl-4 pr-1 h-full overflow-visible">
          
          {/* Red Cards - Home */}
          {redCards.home > 0 && (
            <div className="absolute -top-4 left-4 flex gap-1 z-50">
              {Array.from({ length: redCards.home }).map((_, i) => (
                <motion.div 
                  key={`rc-home-${i}`} 
                  initial={{ y: 10, opacity: 0, scale: 0 }} 
                  animate={{ y: 0, opacity: 1, scale: 1 }} 
                  className="w-3 h-4 bg-red-600 rounded-[2px] shadow-md border border-white/30" 
                />
              ))}
            </div>
          )}

          {match.homeTeam.crestUrl && (
            <div className="w-10 h-10 relative filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] z-10">
              <img 
                src={match.homeTeam.crestUrl} 
                className="w-full h-full object-contain" 
                alt={match.homeTeam.name}
              />
            </div>
          )}
          <span className="text-4xl font-bebas text-[#F5F5F5] tracking-wide drop-shadow-md leading-none pt-[3px] z-10">
            {match.homeTeam.shortName}
          </span>
        </div>

        {/* 3. SCORE (Z-10) */}
        <div className="relative z-10 flex items-center justify-center px-1 gap-1 h-full min-w-[50px]">
          <AnimatePresence mode="popLayout">
            <motion.span 
              key={`home-${match.score.home}`} 
              initial={{ y: 10, opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              className="text-4xl font-bebas text-[#F5F5F5] leading-none drop-shadow-md block pt-[3px]"
            >
              {match.score.home}
            </motion.span>
          </AnimatePresence>
          <span className="text-[#33EFFF]/80 text-3xl font-light pb-[2px] mx-0.5">-</span>
          <AnimatePresence mode="popLayout">
            <motion.span 
              key={`away-${match.score.away}`} 
              initial={{ y: 10, opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              className="text-4xl font-bebas text-[#F5F5F5] leading-none drop-shadow-md block pt-[3px]"
            >
              {match.score.away}
            </motion.span>
          </AnimatePresence>
        </div>

        {/* 4. AWAY TEAM (Z-10) */}
        <div className="relative z-10 flex items-center gap-2 pl-1 pr-4 h-full overflow-visible">
          
          {/* Red Cards - Away */}
          {redCards.away > 0 && (
            <div className="absolute -top-4 right-4 flex gap-1 z-50">
              {Array.from({ length: redCards.away }).map((_, i) => (
                <motion.div 
                  key={`rc-away-${i}`} 
                  initial={{ y: 10, opacity: 0, scale: 0 }} 
                  animate={{ y: 0, opacity: 1, scale: 1 }} 
                  className="w-3 h-4 bg-red-600 rounded-[2px] shadow-md border border-white/30" 
                />
              ))}
            </div>
          )}

          <span className="text-4xl font-bebas text-[#F5F5F5] tracking-wide drop-shadow-md leading-none pt-[3px] z-10">
            {match.awayTeam.shortName}
          </span>
          {match.awayTeam.crestUrl && (
            <div className="w-10 h-10 relative filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] z-10">
              <img 
                src={match.awayTeam.crestUrl} 
                className="w-full h-full object-contain" 
                alt={match.awayTeam.name}
              />
            </div>
          )}
        </div>

      </motion.div>
    </div>
  );
}

// CSS keyframes for shimmer effect - add to your global CSS or via FontStyles
export const scoreboardStyles = `
  @keyframes shimmer {
    0% { transform: translateX(-100%) skewX(-12deg); }
    100% { transform: translateX(200%) skewX(-12deg); }
  }
`;
