/**
 * Goal Alert Store
 * 
 * Manages goal alert state for LiveTicker.
 * Receives goal alerts automatically from server via WebSocket when goals are detected.
 * Uses localStorage events for cross-tab sync (more reliable than BroadcastChannel).
 */

import { create } from "zustand";
import type { GoalAlertPayload } from "@parerineavizate/shared/wsEvents";

// Re-export GoalAlert type from shared
export type GoalAlert = GoalAlertPayload;

const STORAGE_KEY = "parerineavizate-goal-alert";

interface GoalAlertStore {
  currentGoalAlert: GoalAlert | null;
  
  // Actions
  triggerGoal: (alert: GoalAlert) => void;
  clearGoalAlert: () => void;
  
  // Initialize listener for cross-tab messages
  initListener: () => (() => void);
}

export const useGoalAlertStore = create<GoalAlertStore>((set) => ({
  currentGoalAlert: null,

  triggerGoal: (alert) => {
    set({ currentGoalAlert: alert });
    
    // Sync to other tabs via localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ 
        type: "GOAL_ALERT", 
        alert,
        timestamp: Date.now() 
      }));
    } catch (e) {
      console.warn("[GoalAlertStore] localStorage write failed:", e);
    }
  },

  clearGoalAlert: () => {
    set({ currentGoalAlert: null });
    
    // Sync clear to other tabs
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ 
        type: "GOAL_CLEAR",
        timestamp: Date.now() 
      }));
    } catch (e) {
      // Ignore
    }
  },

  initListener: () => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      
      try {
        const data = JSON.parse(event.newValue);
        
        if (data.type === "GOAL_ALERT" && data.alert) {
          set({ currentGoalAlert: data.alert });
        } else if (data.type === "GOAL_CLEAR") {
          set({ currentGoalAlert: null });
        }
      } catch (e) {
        console.warn("[GoalAlertStore] Failed to parse storage event:", e);
      }
    };

    window.addEventListener("storage", handleStorage);
    
    // Return cleanup function
    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  },
}));
