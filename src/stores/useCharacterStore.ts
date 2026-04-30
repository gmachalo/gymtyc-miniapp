/**
 * Zustand store — Character state
 */
"use client";

import { create } from "zustand";

interface CharacterStats {
  strength: number;
  stamina: number;
  discipline: number;
  metabolism: number;
}

interface Character {
  id: string;
  name: string;
  bodyType: "SKINNY" | "AVERAGE" | "OVERWEIGHT";
  stats: CharacterStats;
  transformationStage: number;
  isActive: boolean;
}

interface CharacterStore {
  character: Character | null;
  isLoading: boolean;
  setCharacter: (c: Character) => void;
  updateStats: (delta: Partial<CharacterStats>) => void;
  setStage: (stage: number) => void;
  clear: () => void;
}

export const useCharacterStore = create<CharacterStore>((set) => ({
  character: null,
  isLoading: false,
  setCharacter: (character) => set({ character }),
  updateStats: (delta) =>
    set((state) => {
      if (!state.character) return state;
      return {
        character: {
          ...state.character,
          stats: {
            strength: state.character.stats.strength + (delta.strength ?? 0),
            stamina: state.character.stats.stamina + (delta.stamina ?? 0),
            discipline:
              state.character.stats.discipline + (delta.discipline ?? 0),
            metabolism:
              state.character.stats.metabolism + (delta.metabolism ?? 0),
          },
        },
      };
    }),
  setStage: (stage) =>
    set((state) => {
      if (!state.character) return state;
      return { character: { ...state.character, transformationStage: stage } };
    }),
  clear: () => set({ character: null }),
}));
