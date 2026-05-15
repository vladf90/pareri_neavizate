/**
 * useInterpolatedClock Hook
 * 
 * Provides client-side clock interpolation for smooth second-by-second updates
 * between API syncs (every 5 seconds). This prevents excessive API calls while
 * maintaining smooth timer display.
 * 
 * Features:
 * - Syncs with server clock on each update
 * - Interpolates locally between syncs
 * - Automatically stops when clock is not ticking (HT, FT, etc.)
 * - Handles added time display
 */

import { useState, useEffect, useRef } from "react";
import type { MatchClock } from "@parerineavizate/shared/models";

export interface InterpolatedTime {
  minute: number;
  seconds: number;
  display: string;  // Formatted display: "45:30" or "45+2:15"
  isLive: boolean;
  phase: string;
  addedMinute: number; // Added/stoppage time minutes (0 if not in added time)
}

export function useInterpolatedClock(clock: MatchClock | null | undefined): InterpolatedTime {
  const [time, setTime] = useState<InterpolatedTime>({
    minute: 0,
    seconds: 0,
    display: "-",
    isLive: false,
    phase: "PRE",
    addedMinute: 0,
  });
  
  // Track the last sync to detect server updates
  const lastSyncRef = useRef<number>(0);

  useEffect(() => {
    if (!clock) {
      setTime({
        minute: 0,
        seconds: 0,
        display: "-",
        isLive: false,
        phase: "PRE",
        addedMinute: 0,
      });
      return;
    }

    // Handle non-ticking states (HT, FT, PRE, etc.)
    if (!clock.ticking || !clock.isLive) {
      setTime({
        minute: clock.minute,
        seconds: clock.seconds || 0,
        display: clock.display,
        isLive: clock.isLive,
        phase: clock.phase,
        addedMinute: clock.addedMinute || 0,
      });
      return;
    }

    // Sync with server time on each clock update
    const syncWithServer = () => {
      const baseMinute = clock.minute;
      const baseSeconds = clock.seconds || 0;
      
      // Always show continuous minute format: "46:30", "91:15" etc.
      // No "45+X" format - just the actual minute
      const displayStr = `${baseMinute}:${baseSeconds.toString().padStart(2, "0")}`;
      
      setTime({
        minute: baseMinute,
        seconds: baseSeconds,
        display: displayStr,
        isLive: clock.isLive,
        phase: clock.phase,
        addedMinute: clock.addedMinute || 0,
      });
      
      lastSyncRef.current = Date.now();
    };

    // Initial sync
    syncWithServer();

    // Start interpolation interval (every second)
    const interval = setInterval(() => {
      setTime((prev) => {
        // Calculate elapsed since last sync
        const elapsedMs = Date.now() - lastSyncRef.current;
        const elapsedSeconds = Math.floor(elapsedMs / 1000);
        
        // Calculate new total seconds from sync point
        const syncTotalSeconds = (clock.minute * 60) + (clock.seconds || 0);
        const newTotalSeconds = syncTotalSeconds + elapsedSeconds;
        
        const newMinute = Math.floor(newTotalSeconds / 60);
        const newSeconds = newTotalSeconds % 60;
        
        // Cap at reasonable maximum (prevent runaway during HT transition)
        const maxMinute = clock.phase === "1H" ? 55 : 120;
        const cappedMinute = Math.min(newMinute, maxMinute);
        
        // Always show continuous minute format: "46:30", "91:15" etc.
        const displayStr = `${cappedMinute}:${newSeconds.toString().padStart(2, "0")}`;
        
        return {
          minute: cappedMinute,
          seconds: newSeconds,
          display: displayStr,
          isLive: prev.isLive,
          phase: prev.phase,
          addedMinute: clock.addedMinute || 0,
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [clock?.minute, clock?.seconds, clock?.ticking, clock?.isLive, clock?.phase, clock?.addedMinute, clock?.started]);

  return time;
}

/**
 * Format time for display without seconds (for compact views)
 */
export function formatMinuteOnly(time: InterpolatedTime): string {
  if (!time.isLive) {
    return time.display;
  }
  
  // Return just minute, handling added time
  if (time.phase === "HT") return "HT";
  if (time.phase === "FT") return "FT";
  if (time.phase === "PRE") return "-";
  
  return `${time.minute}'`;
}
