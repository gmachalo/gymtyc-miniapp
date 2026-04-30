"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const BODY_TYPES = [
  {
    type: "SKINNY",
    emoji: "🦴",
    label: "Lean",
    desc: "High metabolism. Low strength but fast stamina gains.",
    stats: { STR: 6, STA: 12, DIS: 10, MET: 14 },
    color: "#4cc9f0",
  },
  {
    type: "AVERAGE",
    emoji: "🧑",
    label: "Average",
    desc: "Balanced starting stats. Most flexible build.",
    stats: { STR: 10, STA: 10, DIS: 10, MET: 10 },
    color: "#6c47ff",
  },
  {
    type: "OVERWEIGHT",
    emoji: "🐻",
    label: "Bulky",
    desc: "High strength base. Slow metabolism but powerful.",
    stats: { STR: 14, STA: 6, DIS: 8, MET: 6 },
    color: "#ff6b35",
  },
];

const STEPS = ["Welcome", "Body Type", "Character", "Plan", "Done"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [charName, setCharName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedBodyType = BODY_TYPES.find((b) => b.type === selectedType);

  const handleCreateCharacter = async () => {
    if (!selectedType || !charName.trim()) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/game/character", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: charName.trim(), bodyType: selectedType }),
      });
      const data = await res.json();
      if (res.ok) {
        // Mark onboarding done
        await fetch("/api/game/onboarding", { method: "POST" });
        setStep(4);
      } else {
        setError(data.error ?? "Failed to create character");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        zIndex: 1,
      }}
    >
      {/* Progress bar */}
      <div style={{ height: "3px", background: "var(--bg-elevated)" }}>
        <div
          style={{
            height: "100%",
            width: `${((step + 1) / STEPS.length) * 100}%`,
            background: "linear-gradient(90deg, #6c47ff, #00d4aa)",
            transition: "width 0.4s ease",
          }}
        />
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          maxWidth: 480,
          margin: "0 auto",
          width: "100%",
        }}
      >

        {/* Step 0: Welcome */}
        {step === 0 && (
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: "72px", margin: "0 0 24px" }}>🏋️</p>
            <h1 style={{ fontSize: "32px", fontWeight: 900, margin: "0 0 12px" }} className="gradient-text">
              Welcome to<br />Gym Tycoon
            </h1>
            <p style={{ color: "var(--text-secondary)", margin: "0 0 40px", lineHeight: 1.6 }}>
              Build your character. Train hard. Own your gym. Earn GYMFIT tokens on Base.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "32px" }}>
              {[
                "🎮 Create your fitness character",
                "💪 Workout to earn XP & tokens",
                "🏢 Join or build a gym",
                "💰 Earn passive income",
              ].map((f) => (
                <div key={f} className="card" style={{ padding: "12px 16px", textAlign: "left", fontSize: "15px" }}>
                  {f}
                </div>
              ))}
            </div>
            <button id="onboard-start" className="btn btn-primary btn-lg" style={{ width: "100%" }} onClick={() => setStep(1)}>
              Let&apos;s Go →
            </button>
          </div>
        )}

        {/* Step 1: Body Type */}
        {step === 1 && (
          <div style={{ width: "100%" }}>
            <h2 style={{ fontSize: "24px", fontWeight: 800, textAlign: "center", margin: "0 0 8px" }}>
              Choose Your Starting Body
            </h2>
            <p style={{ color: "var(--text-secondary)", textAlign: "center", margin: "0 0 28px", fontSize: "14px" }}>
              Each body type has unique stats. You can transform any type to any shape.
            </p>
            <div style={{ display: "flex", gap: "10px", marginBottom: "28px" }}>
              {BODY_TYPES.map((b) => (
                <button
                  key={b.type}
                  id={`body-type-${b.type.toLowerCase()}`}
                  className={`body-type-card ${selectedType === b.type ? "selected" : ""}`}
                  onClick={() => setSelectedType(b.type)}
                  style={{ border: `2px solid ${selectedType === b.type ? b.color : "var(--border-subtle)"}` }}
                >
                  <p style={{ fontSize: "36px", margin: "0 0 8px" }}>{b.emoji}</p>
                  <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: "14px" }}>{b.label}</p>
                  <p style={{ margin: "0 0 10px", fontSize: "11px", color: "var(--text-secondary)", lineHeight: 1.4 }}>{b.desc}</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                    {Object.entries(b.stats).map(([k, v]) => (
                      <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                        <span style={{ color: "var(--text-muted)" }}>{k}</span>
                        <span style={{ fontWeight: 700 }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </button>
              ))}
            </div>
            <button
              id="body-type-next"
              className="btn btn-primary"
              style={{ width: "100%" }}
              disabled={!selectedType}
              onClick={() => setStep(2)}
            >
              Next →
            </button>
          </div>
        )}

        {/* Step 2: Name Your Character */}
        {step === 2 && (
          <div style={{ width: "100%", textAlign: "center" }}>
            <p style={{ fontSize: "56px", margin: "0 0 16px" }}>
              {selectedBodyType?.emoji}
            </p>
            <h2 style={{ fontSize: "24px", fontWeight: 800, margin: "0 0 8px" }}>
              Name Your Character
            </h2>
            <p style={{ color: "var(--text-secondary)", margin: "0 0 28px", fontSize: "14px" }}>
              This is the name other players will see.
            </p>
            <input
              id="character-name"
              className="input"
              placeholder="Enter character name..."
              value={charName}
              onChange={(e) => setCharName(e.target.value)}
              maxLength={30}
              style={{ marginBottom: "12px", textAlign: "center" }}
            />
            {error && (
              <p style={{ color: "#ff4d6d", fontSize: "13px", margin: "0 0 12px" }}>{error}</p>
            )}
            <button
              id="character-name-next"
              className="btn btn-primary"
              style={{ width: "100%", marginTop: "8px" }}
              disabled={charName.trim().length < 2 || loading}
              onClick={handleCreateCharacter}
            >
              {loading ? "Creating..." : "Create Character →"}
            </button>
          </div>
        )}

        {/* Step 4: Done */}
        {step === 4 && (
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: "72px", margin: "0 0 24px", filter: "drop-shadow(0 0 20px gold)" }}>🎉</p>
            <h2 style={{ fontSize: "28px", fontWeight: 900, margin: "0 0 8px" }} className="gradient-text">
              You&apos;re ready!
            </h2>
            <p style={{ color: "var(--text-secondary)", margin: "0 0 32px" }}>
              Your character is live. Start training to earn your first GYMFIT tokens.
            </p>
            <button
              id="onboard-finish"
              className="btn btn-primary btn-lg"
              style={{ width: "100%" }}
              onClick={() => router.push("/dashboard")}
            >
              Enter Gym Tycoon 🏋️
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
