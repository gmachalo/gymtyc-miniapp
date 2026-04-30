"use client";
import { create } from "zustand";

interface GymSummary {
  id: string;
  name: string;
  type: "SYSTEM" | "PLAYER";
  memberCount: number;
  maxMembers: number;
  reputation: number;
  monthlyFee: number;
  description?: string;
}

interface GymStore {
  gyms: GymSummary[];
  myGym: GymSummary | null;
  activeGym: GymSummary | null;
  setGyms: (gyms: GymSummary[]) => void;
  setMyGym: (gym: GymSummary | null) => void;
  setActiveGym: (gym: GymSummary | null) => void;
}

export const useGymStore = create<GymStore>((set) => ({
  gyms: [],
  myGym: null,
  activeGym: null,
  setGyms: (gyms) => set({ gyms }),
  setMyGym: (myGym) => set({ myGym }),
  setActiveGym: (activeGym) => set({ activeGym }),
}));
