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

const WORKOUT_PLANS = [
  {
    id: "strength",
    name: "Iron Foundations",
    type: "STRENGTH",
    icon: "🏋️",
    desc: "Compound lifts. Maximum strength gains.",
    color: "#ff4d6d",
  },
  {
    id: "fatloss",
    name: "Lean Machine",
    type: "FAT_LOSS",
    icon: "🔥",
    desc: "HIIT + cardio. Burn fat fast.",
    color: "#ff6b35",
  },
  {
    id: "hybrid",
    name: "Athlete Protocol",
    type: "HYBRID",
    icon: "⚡",
    desc: "Strength + conditioning. Balanced gains.",
    color: "#6c47ff",
  },
  {
    id: "calisthenics",
    name: "Body Control",
    type: "CALISTHENICS",
    icon: "🤸",
    desc: "Bodyweight mastery. No equipment needed.",
    color: "#00d4aa",
  },
];

const GAME_MODES = [
  {
    mode: "SOLO",
    emoji: "🏃",
    label: "Solo",
    desc: "Personal journey. Compete on global leaderboards.",
    features: ["Personal rewards", "Global leaderboards", "Character ownership"],
  },
  {
    mode: "SOCIAL",
    emoji: "👥",
    label: "Social",
    desc: "Join friends. Build gyms together. Earn passive income.",
    features: ["Gym co-ownership", "Friend challenges", "Profit sharing"],
  },
];

const STEPS = ["Welcome", "Body Type", "Character", "Plan", "Mode", "Done"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const [charName, setCharName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedBodyType = BODY_TYPES.find((b) => b.type === selectedType);
  const selectedWorkoutPlan = WORKOUT_PLANS.find((p) => p.id === selectedPlan);
  const selectedGameMode = GAME_MODES.find((m) => m.mode === selectedMode);

  const handleCreateCharacter = async () => {
    if (!selectedType || !charName.trim() || !selectedPlan || !selectedMode) return;
    setError("");
    setLoading(true);
    try {
      // Create character
      const charRes = await fetch("/api/game/character", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: charName.trim(), bodyType: selectedType }),
      });
      const charData = await charRes.json();
      if (!charRes.ok) {
        setError(charData.error ?? "Failed to create character");
        setLoading(false);
        return;
      }

      // Set workout plan (via assignment or creation)
      if (selectedPlan && charData.character?.id) {
        const workoutPlan = WORKOUT_PLANS.find(p => p.id === selectedPlan);
        if (workoutPlan) {
          try {
            await fetch("/api/game/plans", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ characterId: charData.character.id, type: workoutPlan.type, name: workoutPlan.name }),
            }).catch(() => {}); // Non-critical
          } catch (err) {
            console.log("[v0] Plan assignment skipped:", err);
          }
        }
      }

      // Set game mode
      if (selectedMode) {
        try {
          await fetch("/api/game/mode", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: selectedMode }),
          }).catch(() => {}); // Non-critical
        } catch (err) {
          console.log("[v0] Mode update skipped:", err);
        }
      }

      // Mark onboarding done
      try {
        await fetch("/api/game/onboarding", { method: "POST" });
      } catch (err) {
        console.log("[v0] Onboarding mark skipped:", err);
      }

      setStep(5);
    } catch (err) {
      setError("An error occurred. Please try again.");
      console.error("[v0] Onboarding error:", err);
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
              disabled={charName.trim().length < 2}
              onClick={() => setStep(3)}
            >
              Next →
            </button>
          </div>
        )}

        {/* Step 3: Choose Workout Plan */}
        {step === 3 && (
          <div style={{ width: "100%" }}>
            <h2 style={{ fontSize: "24px", fontWeight: 800, textAlign: "center", margin: "0 0 8px" }}>
              Pick Your Training Style
            </h2>
            <p style={{ color: "var(--text-secondary)", textAlign: "center", margin: "0 0 28px", fontSize: "14px" }}>
              You can change anytime. Build your ideal physique your way.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "28px" }}>
              {WORKOUT_PLANS.map((plan) => (
                <button
                  key={plan.id}
                  id={`plan-${plan.id}`}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`body-type-card`}
                  style={{
                    border: `2px solid ${selectedPlan === plan.id ? plan.color : "var(--border-subtle)"}`,
                    background: selectedPlan === plan.id ? `rgba(108,71,255,0.1)` : "var(--bg-card)",
                    textAlign: "left",
                    padding: "16px",
                  }}
                >
                  <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                    <span style={{ fontSize: "32px" }}>{plan.icon}</span>
                    <div>
                      <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: "15px" }}>{plan.name}</p>
                      <p style={{ margin: "0 0 8px", fontSize: "13px", color: "var(--text-secondary)" }}>
                        {plan.desc}
                      </p>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                        {plan.type}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <button
              id="plan-next"
              className="btn btn-primary"
              style={{ width: "100%" }}
              disabled={!selectedPlan}
              onClick={() => setStep(4)}
            >
              Next →
            </button>
          </div>
        )}

        {/* Step 4: Choose Game Mode */}
        {step === 4 && (
          <div style={{ width: "100%" }}>
            <h2 style={{ fontSize: "24px", fontWeight: 800, textAlign: "center", margin: "0 0 8px" }}>
              Choose Your Game Mode
            </h2>
            <p style={{ color: "var(--text-secondary)", textAlign: "center", margin: "0 0 28px", fontSize: "14px" }}>
              Wallet linking is always optional. You can change mode anytime.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "28px" }}>
              {GAME_MODES.map((gameMode) => (
                <button
                  key={gameMode.mode}
                  id={`mode-${gameMode.mode.toLowerCase()}`}
                  onClick={() => setSelectedMode(gameMode.mode)}
                  className={`body-type-card`}
                  style={{
                    border: `2px solid ${selectedMode === gameMode.mode ? "#00d4aa" : "var(--border-subtle)"}`,
                    background: selectedMode === gameMode.mode ? "rgba(0,212,170,0.1)" : "var(--bg-card)",
                    textAlign: "left",
                    padding: "16px",
                  }}
                >
                  <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                    <span style={{ fontSize: "32px" }}>{gameMode.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: "15px" }}>{gameMode.label}</p>
                      <p style={{ margin: "0 0 8px", fontSize: "13px", color: "var(--text-secondary)" }}>
                        {gameMode.desc}
                      </p>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        {gameMode.features.map((feature) => (
                          <span key={feature} className="badge badge-purple" style={{ fontSize: "10px" }}>
                            ✓ {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <button
              id="mode-next"
              className="btn btn-primary"
              style={{ width: "100%" }}
              disabled={!selectedMode}
              onClick={handleCreateCharacter}
              title={!charName.trim() ? "Enter a character name" : ""}
            >
              {loading ? "Creating your character..." : "Start Your Journey →"}
            </button>
            {error && (
              <p style={{ color: "#ff4d6d", fontSize: "13px", margin: "12px 0 0", textAlign: "center" }}>
                {error}
              </p>
            )}
          </div>
        )}

        {/* Step 5: Done */}
        {step === 5 && (
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: "72px", margin: "0 0 24px", filter: "drop-shadow(0 0 20px gold)" }}>🎉</p>
            <h2 style={{ fontSize: "28px", fontWeight: 900, margin: "0 0 8px" }} className="gradient-text">
              Welcome, {charName}!
            </h2>
            <p style={{ color: "var(--text-secondary)", margin: "0 0 32px", lineHeight: 1.6 }}>
              Your character is live. Start training to earn GYMFIT tokens.<br />
              Wallet linking is optional and can be done anytime.
            </p>
            <button
              id="onboard-finish"
              className="btn btn-primary btn-lg"
              style={{ width: "100%" }}
              onClick={() => router.push("/dashboard")}
            >
              Enter Gym Tycoon →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
