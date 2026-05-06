"use client";

import { useState, useEffect, useCallback } from "react";
import { EventBus } from "@/lib/game/EventBus";
import { XpBar } from "@/components/xp/XpBar";

interface GameHUDProps {
  playerName: string;
  initialXp: number;
  initialOverflow: number;
  initialRestUntil: string | null;
  initialLastRegenAt: string;
  initialTokens: number;
  streakCount: number;
  gymName?: string;
  hasGym: boolean;
}

type ActiveScene = "GymScene" | "HomeScene";

export function GameHUD({
  playerName,
  initialXp,
  initialOverflow,
  initialRestUntil,
  initialLastRegenAt,
  initialTokens,
  streakCount,
  gymName,
  hasGym,
}: GameHUDProps) {
  const [currentXp, setCurrentXp]       = useState(initialXp);
  const [overflowXp, setOverflowXp]     = useState(initialOverflow);
  const [restUntil, setRestUntil]       = useState<string | null>(initialRestUntil);
  const [lastRegenAt, setLastRegenAt]   = useState(initialLastRegenAt);
  const [tokens, setTokens]             = useState(initialTokens);
  const [activeScene, setActiveScene]   = useState<ActiveScene>(hasGym ? "GymScene" : "HomeScene");
  const [isFirstPerson, setIsFirstPerson] = useState(false);
  const [workoutReward, setWorkoutReward] = useState<{ xp: number; tokens: number } | null>(null);
  const [npcCount, setNpcCount]          = useState(0);
  const [pendingIncome, setPendingIncome] = useState(0);

  // ── Subscribe to EventBus ─────────────────────────────────────
  useEffect(() => {
    const onXpChanged = (d: { currentXp: number; overflowXp: number; restUntil: string | null }) => {
      setCurrentXp(d.currentXp);
      setOverflowXp(d.overflowXp);
      setRestUntil(d.restUntil);
      setLastRegenAt(new Date().toISOString());
    };
    const onWorkoutComplete = async (d: { xpEarned: number; tokensEarned: number; equipmentId?: string; intensity?: string }) => {
      // Show popup immediately (optimistic UI)
      setWorkoutReward({ xp: d.xpEarned, tokens: d.tokensEarned });
      setTokens((t) => t + d.tokensEarned);
      setTimeout(() => setWorkoutReward(null), 3000);

      // Persist to DB
      try {
        const res = await fetch("/api/game/workout/gym", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            xpEarned:    d.xpEarned,
            tokensEarned: d.tokensEarned,
            intensity:   d.intensity ?? "MEDIUM",
            equipmentId: d.equipmentId ?? "unknown",
          }),
        });
        if (res.ok) {
          const data = await res.json();
          // Update XP bar with real DB values
          setCurrentXp(data.currentXp);
          setOverflowXp(data.overflowXp);
          setRestUntil(data.restUntil ?? null);
          setLastRegenAt(new Date().toISOString());
          EventBus.emit("player:xp_changed", {
            currentXp:  data.currentXp,
            overflowXp: data.overflowXp,
            restUntil:  data.restUntil ?? null,
          });
          if (data.exhausted) {
            EventBus.emit("player:exhausted", { restUntil: data.restUntil });
          }
        }
      } catch { /* silent — optimistic update already shown */ }
    };
    const onIncomeCollected = (d: { amount: number }) => {
      setTokens((t) => t + d.amount);
      setPendingIncome(0);
    };
    const onNpcPaid = (d: { amount: number }) => {
      setPendingIncome((p) => p + d.amount);
    };
    const onNpcEntered = () => setNpcCount((n) => n + 1);
    const onNpcLeft = () => setNpcCount((n) => Math.max(0, n - 1));
    const onFirstPerson = (d: { enabled: boolean }) => setIsFirstPerson(d.enabled);

    EventBus.on("player:xp_changed", onXpChanged);
    EventBus.on("workout:complete", onWorkoutComplete);
    EventBus.on("income:collected", onIncomeCollected);
    EventBus.on("npc:paid", onNpcPaid);
    EventBus.on("npc:entered", onNpcEntered);
    EventBus.on("npc:left_dissatisfied", onNpcLeft);
    EventBus.on("workout:firstperson_toggle", onFirstPerson);

    return () => {
      EventBus.off("player:xp_changed", onXpChanged);
      EventBus.off("workout:complete", onWorkoutComplete);
      EventBus.off("income:collected", onIncomeCollected);
      EventBus.off("npc:paid", onNpcPaid);
      EventBus.off("npc:entered", onNpcEntered);
      EventBus.off("npc:left_dissatisfied", onNpcLeft);
      EventBus.off("workout:firstperson_toggle", onFirstPerson);
    };
  }, []);

  // ── XP regen sync ────────────────────────────────────────────
  const syncXp = useCallback(async () => {
    try {
      const res = await fetch("/api/game/xp/regen", { method: "PATCH" });
      if (res.ok) {
        const d = await res.json();
        setCurrentXp(d.currentXp);
        setOverflowXp(d.overflowXp);
        setRestUntil(d.restUntil ?? null);
        setLastRegenAt(new Date().toISOString());
        EventBus.emit("player:xp_changed", { currentXp: d.currentXp, overflowXp: d.overflowXp, restUntil: d.restUntil ?? null });
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    syncXp();
    const id = setInterval(syncXp, 30_000);
    return () => clearInterval(id);
  }, [syncXp]);

  // ── Scene switch ─────────────────────────────────────────────
  const switchScene = (to: ActiveScene) => {
    setActiveScene(to);
    EventBus.emit("scene:switch", { to });
  };

  if (isFirstPerson) return null; // HUD hidden in first-person view

  return (
    <>
      {/* ── Top HUD ── */}
      <div
        style={{
          position: "fixed",
          top: 0, left: 0, right: 0,
          zIndex: 50,
          padding: "10px 14px 8px",
          background: "linear-gradient(180deg, rgba(13,17,23,0.97) 0%, rgba(13,17,23,0) 100%)",
          pointerEvents: "none",
        }}
      >
        {/* Player info row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#6c47ff,#00d4aa)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>
              🏋️
            </div>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#fff" }}>{playerName}</div>
              <div style={{ fontSize: "10px", color: "#6b7280" }}>🔥 {streakCount} day streak</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", pointerEvents: "auto" }}>
            {/* NPC count */}
            {npcCount > 0 && (
              <span style={{ fontSize: "11px", background: "rgba(0,212,170,0.15)", color: "#00d4aa", borderRadius: "99px", padding: "3px 9px", border: "1px solid rgba(0,212,170,0.3)" }}>
                👥 {npcCount}
              </span>
            )}
            {/* Pending income */}
            {pendingIncome > 0 && (
              <span style={{ fontSize: "11px", background: "rgba(255,215,0,0.15)", color: "#ffd700", borderRadius: "99px", padding: "3px 9px", border: "1px solid rgba(255,215,0,0.3)", animation: "pulse-badge 1s ease-in-out infinite" }}>
                💰 +{pendingIncome}
              </span>
            )}
            <span style={{ fontSize: "12px", background: "rgba(255,215,0,0.1)", color: "#ffd700", borderRadius: "99px", padding: "4px 10px", border: "1px solid rgba(255,215,0,0.25)", fontWeight: 700 }}>
              {tokens.toLocaleString()} 🪙
            </span>
          </div>
        </div>

        {/* XP Bar */}
        <div style={{ pointerEvents: "auto" }}>
          <XpBar currentXp={currentXp} overflowXp={overflowXp} restUntil={restUntil} lastXpRegenAt={lastRegenAt} />
        </div>
      </div>

      {/* ── Scene switcher (bottom nav) ── */}
      <div
        style={{
          position: "fixed",
          bottom: 100,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 50,
          display: "flex",
          gap: "8px",
          background: "rgba(13,17,23,0.9)",
          borderRadius: "12px",
          padding: "6px 8px",
          border: "1px solid rgba(108,71,255,0.3)",
          pointerEvents: "auto",
        }}
      >
        <button
          onClick={() => switchScene("HomeScene")}
          style={{
            padding: "6px 14px",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: activeScene === "HomeScene" ? 700 : 400,
            background: activeScene === "HomeScene" ? "#6c47ff" : "transparent",
            color: activeScene === "HomeScene" ? "#fff" : "#6b7280",
            transition: "all 0.15s",
          }}
        >
          🏠 Home
        </button>
        {hasGym ? (
          <button
            onClick={() => switchScene("GymScene")}
            style={{
              padding: "6px 14px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: activeScene === "GymScene" ? 700 : 400,
              background: activeScene === "GymScene" ? "#6c47ff" : "transparent",
              color: activeScene === "GymScene" ? "#fff" : "#6b7280",
              transition: "all 0.15s",
            }}
          >
            🏢 {gymName ?? "Gym"}
          </button>
        ) : (
          <a href="/gyms" style={{ padding: "6px 14px", borderRadius: "8px", fontSize: "12px", color: "#6b7280", textDecoration: "none" }}>
            + Join Gym
          </a>
        )}
        <a href="/dashboard" style={{ padding: "6px 14px", borderRadius: "8px", fontSize: "12px", color: "#6b7280", textDecoration: "none", display: "flex", alignItems: "center" }}>
          ☰
        </a>
      </div>

      {/* ── Workout reward popup ── */}
      {workoutReward && (
        <div
          style={{
            position: "fixed",
            top: "35%",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 100,
            textAlign: "center",
            animation: "reward-popup 0.4s ease-out",
            background: "rgba(13,17,23,0.95)",
            border: "1px solid #6c47ff",
            borderRadius: "16px",
            padding: "20px 32px",
          }}
        >
          <div style={{ fontSize: "40px", marginBottom: "8px" }}>🎉</div>
          <div style={{ fontSize: "22px", fontWeight: 900, color: "#a78bfa" }}>+{workoutReward.xp} XP</div>
          <div style={{ fontSize: "18px", fontWeight: 700, color: "#ffd700" }}>+{workoutReward.tokens} 🪙</div>
        </div>
      )}

      <style>{`
        @keyframes pulse-badge {
          0%,100% { opacity:1; } 50% { opacity:0.6; }
        }
        @keyframes reward-popup {
          0% { transform:translateX(-50%) scale(0.7); opacity:0; }
          100% { transform:translateX(-50%) scale(1); opacity:1; }
        }
      `}</style>
    </>
  );
}
