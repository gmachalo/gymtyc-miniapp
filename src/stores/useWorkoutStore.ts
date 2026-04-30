"use client";
import { create } from "zustand";

interface WorkoutSession {
  planId: string;
  planType: string;
  startedAt: Date;
  durationMins: number;
  intensity: "LOW" | "MEDIUM" | "HIGH";
  isActive: boolean;
}

interface WorkoutStore {
  session: WorkoutSession | null;
  startSession: (planId: string, planType: string, intensity: "LOW" | "MEDIUM" | "HIGH") => void;
  endSession: () => void;
  elapsedSecs: number;
  setElapsed: (secs: number) => void;
}

export const useWorkoutStore = create<WorkoutStore>((set) => ({
  session: null,
  elapsedSecs: 0,
  startSession: (planId, planType, intensity) =>
    set({
      session: {
        planId,
        planType,
        intensity,
        startedAt: new Date(),
        durationMins: 0,
        isActive: true,
      },
      elapsedSecs: 0,
    }),
  endSession: () => set({ session: null, elapsedSecs: 0 }),
  setElapsed: (secs) =>
    set((state) => ({
      elapsedSecs: secs,
      session: state.session
        ? { ...state.session, durationMins: Math.floor(secs / 60) }
        : null,
    })),
}));
