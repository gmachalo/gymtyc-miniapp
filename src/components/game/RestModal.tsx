"use client";
import { useEffect, useState } from "react";

interface RestModalProps {
  restUntil: string; // ISO datetime
  overflowXp: number;
  onSkip: () => void;    // costs GYMFIT
  onDismiss: () => void;
  skipping?: boolean;
}

export function RestModal({ restUntil, overflowXp, onSkip, onDismiss, skipping }: RestModalProps) {
  const [secsLeft, setSecsLeft] = useState(0);

  useEffect(() => {
    const tick = () => {
      const s = Math.max(0, (new Date(restUntil).getTime() - Date.now()) / 1000);
      setSecsLeft(Math.floor(s));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [restUntil]);

  const fmtTime = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const pct = Math.max(0, Math.min(100, (secsLeft / 1800) * 100)); // 30min rest

  if (secsLeft === 0) {
    onDismiss();
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.85)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        className="glass"
        style={{
          width: "100%",
          maxWidth: "340px",
          padding: "32px 24px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: "64px",
            animation: "sleep-sway 2s ease-in-out infinite",
            display: "inline-block",
            marginBottom: "16px",
          }}
        >
          😴
        </div>

        <h2 style={{ fontSize: "22px", fontWeight: 800, margin: "0 0 8px" }}>
          Your Character is Resting
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "14px", margin: "0 0 24px" }}>
          XP exhausted. Rest is essential for growth — your body is recovering and
          XP will regenerate automatically.
        </p>

        {/* Rest progress */}
        <div style={{ marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "6px" }}>
            <span style={{ color: "var(--text-muted)" }}>Recovery</span>
            <span style={{ color: "#6c47ff", fontWeight: 700 }}>{fmtTime(secsLeft)} left</span>
          </div>
          <div
            style={{
              height: "8px",
              background: "var(--bg-elevated)",
              borderRadius: "99px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${100 - pct}%`,
                background: "linear-gradient(90deg, #6c47ff, #00d4aa)",
                borderRadius: "99px",
                transition: "width 1s linear",
              }}
            />
          </div>
        </div>

        {/* While waiting */}
        <div
          style={{
            background: "rgba(108,71,255,0.08)",
            borderRadius: "10px",
            padding: "12px",
            marginBottom: "20px",
            fontSize: "13px",
            color: "var(--text-secondary)",
            textAlign: "left",
          }}
        >
          <p style={{ margin: "0 0 6px", fontWeight: 700, color: "var(--text-primary)" }}>
            💡 While you wait:
          </p>
          <ul style={{ margin: 0, paddingLeft: "16px", lineHeight: 1.8 }}>
            <li>Browse & upgrade your gym</li>
            <li>Check the leaderboard</li>
            <li>Plan your next workout</li>
          </ul>
        </div>

        {/* Skip rest button */}
        {overflowXp >= 50 && (
          <button
            onClick={onSkip}
            disabled={skipping}
            className="btn btn-secondary"
            style={{ width: "100%", marginBottom: "10px" }}
          >
            {skipping ? "Skipping..." : "⚡ Skip Rest (50 overflow XP)"}
          </button>
        )}

        <button
          onClick={onDismiss}
          style={{
            width: "100%",
            background: "none",
            border: "none",
            color: "var(--text-muted)",
            fontSize: "13px",
            cursor: "pointer",
            padding: "8px",
          }}
        >
          Continue browsing →
        </button>
      </div>

      <style>{`
        @keyframes sleep-sway {
          0%, 100% { transform: rotate(-5deg); }
          50% { transform: rotate(5deg); }
        }
      `}</style>
    </div>
  );
}
