"use client";

// CSS-animated character sprite using emoji + keyframe animations
// Appearance changes based on bodyType and transformationStage

interface CharacterSpriteProps {
  bodyType?: "SKINNY" | "AVERAGE" | "OVERWEIGHT";
  transformationStage?: number; // 0–5
  isMoving?: boolean;
  isWorking?: boolean;
  isResting?: boolean;
  size?: number;
  label?: string;
  isPlayer?: boolean;
}

const BODY_EMOJIS = {
  SKINNY: ["🦴", "🏃", "💪", "🦾", "⚡", "🏆"],
  AVERAGE: ["🧑", "🚶", "💪", "🦾", "⚡", "🏆"],
  OVERWEIGHT: ["🐻", "🐻", "💪", "🦾", "⚡", "🏆"],
};

const WORKOUT_EMOJIS = {
  SKINNY: "🏃",
  AVERAGE: "🏋️",
  OVERWEIGHT: "🏋️",
};

export function CharacterSprite({
  bodyType = "AVERAGE",
  transformationStage = 0,
  isMoving = false,
  isWorking = false,
  isResting = false,
  size = 48,
  label,
  isPlayer = false,
}: CharacterSpriteProps) {
  const stage = Math.min(5, Math.max(0, transformationStage));
  const emoji = isWorking
    ? WORKOUT_EMOJIS[bodyType]
    : BODY_EMOJIS[bodyType][stage];

  const animationName = isWorking
    ? "workout-bounce"
    : isMoving
    ? "walk-bob"
    : isResting
    ? "sleep-sway"
    : "idle-bob";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "4px",
        userSelect: "none",
      }}
    >
      {/* Player indicator ring */}
      {isPlayer && (
        <div
          style={{
            width: size + 8,
            height: size + 8,
            borderRadius: "50%",
            background: "rgba(108,71,255,0.25)",
            border: "2px solid #6c47ff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: "pulse-ring 2s ease-in-out infinite",
          }}
        >
          <span
            style={{
              fontSize: size,
              lineHeight: 1,
              animation: `${animationName} 0.8s ease-in-out infinite`,
              display: "inline-block",
              filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.4))",
            }}
          >
            {emoji}
          </span>
        </div>
      )}

      {!isPlayer && (
        <span
          style={{
            fontSize: size,
            lineHeight: 1,
            animation: `${animationName} ${isWorking ? "0.5s" : "1.2s"} ease-in-out infinite`,
            display: "inline-block",
            opacity: 0.85,
          }}
        >
          {emoji}
        </span>
      )}

      {/* Shadow */}
      <div
        style={{
          width: size * 0.6,
          height: 4,
          background: "rgba(0,0,0,0.3)",
          borderRadius: "50%",
          animation: isWorking ? "shadow-pump 0.5s ease-in-out infinite" : undefined,
        }}
      />

      {/* Label */}
      {label && (
        <span
          style={{
            fontSize: "10px",
            color: isPlayer ? "#a78bfa" : "var(--text-muted)",
            fontWeight: isPlayer ? 700 : 400,
            background: "rgba(0,0,0,0.5)",
            borderRadius: "4px",
            padding: "1px 5px",
            whiteSpace: "nowrap",
          }}
        >
          {isPlayer ? "▶ " : ""}{label}
        </span>
      )}

      <style>{`
        @keyframes idle-bob {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
        @keyframes walk-bob {
          0%, 100% { transform: translateY(0px) rotate(-3deg); }
          50% { transform: translateY(-6px) rotate(3deg); }
        }
        @keyframes workout-bounce {
          0%, 100% { transform: translateY(0px) scaleY(1); }
          30% { transform: translateY(-10px) scaleY(1.1); }
          60% { transform: translateY(0px) scaleY(0.95); }
        }
        @keyframes sleep-sway {
          0%, 100% { transform: rotate(-5deg); }
          50% { transform: rotate(5deg); }
        }
        @keyframes pulse-ring {
          0%, 100% { box-shadow: 0 0 0 0 rgba(108,71,255,0.4); }
          50% { box-shadow: 0 0 0 8px rgba(108,71,255,0); }
        }
        @keyframes shadow-pump {
          0%, 100% { transform: scaleX(1); opacity: 0.3; }
          30% { transform: scaleX(0.6); opacity: 0.1; }
        }
      `}</style>
    </div>
  );
}
