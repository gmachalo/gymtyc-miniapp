"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ProfileModeToggle({ currentMode }: { currentMode: string }) {
  const router = useRouter();
  const [mode, setMode] = useState(currentMode);
  const [loading, setLoading] = useState(false);

  const toggle = async (newMode: string) => {
    if (newMode === mode) return;
    setLoading(true);
    try {
      const res = await fetch("/api/game/mode", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: newMode }),
      });
      if (res.ok) {
        setMode(newMode);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", gap: "10px" }}>
      {["SOLO", "SOCIAL"].map((m) => (
        <button
          key={m}
          id={`mode-${m.toLowerCase()}`}
          className="btn btn-secondary"
          style={{
            flex: 1,
            background: mode === m ? "rgba(108,71,255,0.2)" : undefined,
            borderColor: mode === m ? "var(--brand-primary)" : undefined,
            color: mode === m ? "var(--brand-primary)" : undefined,
          }}
          onClick={() => toggle(m)}
          disabled={loading}
        >
          {m === "SOLO" ? "🎮 Solo" : "👥 Social"}
        </button>
      ))}
    </div>
  );
}
