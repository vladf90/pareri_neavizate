/**
 * TipeeStore - Zustand store for managing alert queue
 * Ensures only one alert is displayed at a time
 */

import { create } from "zustand";

export interface TipeeAlert {
  id: string;
  type: "dono" | "member" | "sub";
  user: string;
  amount?: string;
  tier: 1 | 2 | 3;
  platform?: string;
  message?: string;
}

interface TipeeState {
  queue: TipeeAlert[];
  currentAlert: TipeeAlert | null;
  isProcessing: boolean;
  processedIds: Set<string>; // Track processed alerts to avoid duplicates
  addAlert: (alert: Omit<TipeeAlert, "id">) => void;
  processQueue: () => void;
  clearCurrent: () => void;
}

export const useTipeeStore = create<TipeeState>((set, get) => ({
  queue: [],
  currentAlert: null,
  isProcessing: false,
  processedIds: new Set(),

  addAlert: (alert) => {
    // Generate deterministic ID based on alert properties
    // This ensures the same alert from different sources gets the same ID
    const deterministicId = `${alert.type}-${alert.user}-${alert.amount || ''}-${Date.now()}`;
    
    // Check if we've already processed this exact alert in the last 10 seconds
    const recentId = `${alert.type}-${alert.user}-${alert.amount || ''}`;
    if (get().processedIds.has(recentId)) {
      console.log("[TipeeStore] Duplicate alert detected, skipping:", alert);
      return;
    }

    const newAlert: TipeeAlert = {
      ...alert,
      id: deterministicId,
    };

    // Add to processed IDs (with cleanup after 10 seconds)
    set((state) => {
      const newProcessedIds = new Set(state.processedIds);
      newProcessedIds.add(recentId);
      
      // Auto-cleanup after 10 seconds to prevent memory leak
      setTimeout(() => {
        set((state) => {
          const cleanedIds = new Set(state.processedIds);
          cleanedIds.delete(recentId);
          return { processedIds: cleanedIds };
        });
      }, 10000);

      return {
        queue: [...state.queue, newAlert],
        processedIds: newProcessedIds,
      };
    });

    // Auto-process if not currently showing an alert
    if (!get().isProcessing && !get().currentAlert) {
      get().processQueue();
    }
  },

  processQueue: () => {
    const { queue, isProcessing, currentAlert } = get();

    // Don't process if already showing an alert
    if (isProcessing || currentAlert || queue.length === 0) {
      return;
    }

    // Get next alert from queue
    const [nextAlert, ...remainingQueue] = queue;

    set({
      currentAlert: nextAlert,
      queue: remainingQueue,
      isProcessing: true,
    });

    // Calculate duration based on tier
    const duration = nextAlert.tier === 3 ? 8000 : 5000;

    // Auto-clear after duration
    setTimeout(() => {
      get().clearCurrent();
    }, duration);
  },

  clearCurrent: () => {
    set({
      currentAlert: null,
      isProcessing: false,
    });

    // Process next alert if any in queue
    setTimeout(() => {
      get().processQueue();
    }, 500); // Small delay between alerts
  },
}));
