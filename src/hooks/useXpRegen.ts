// src/hooks/useXpRegen.ts
// Polls every 30s, syncs XP regen with the server
"use client";
import { useEffect, useCallback } from "react";

export function useXpRegen(onSync?: (data: { currentXp: number; overflowXp: number; restUntil: string | null }) => void) {
  const sync = useCallback(async () => {
    try {
      const res = await fetch("/api/game/xp/regen", { method: "PATCH" });
      if (res.ok) {
        const data = await res.json();
        onSync?.(data);
      }
    } catch {
      // Silently fail — UI still works
    }
  }, [onSync]);

  useEffect(() => {
    sync(); // Sync on mount
    const interval = setInterval(sync, 30_000); // every 30s
    return () => clearInterval(interval);
  }, [sync]);
}
