/**
 * Game Engine — Reward Calculation
 *
 * Controlled tokenomics:
 *   - Emission caps prevent infinite supply
 *   - Diminishing returns prevent farming
 *   - Sinks: gym fees, equipment purchases, challenge entry
 */

export interface WorkoutRewardInput {
  durationMins: number;
  intensity: "LOW" | "MEDIUM" | "HIGH";
  adherencePct: number;
  streakCount: number;
  fitnessBoost: number; // 0–0.30 from fitness API
  dailyWorkoutCount: number; // workouts done today already
}

export interface RewardResult {
  baseXp: number;
  baseTokens: bigint;
  bonusTokens: bigint;
  totalTokens: bigint;
  totalXp: number;
  fitnessBoostApplied: number;
  cappedByDailyLimit: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const BASE_XP_PER_MIN = 2;
const BASE_TOKENS_PER_MIN = BigInt(1); // 1 GYMFIT per minute (off-chain)

const INTENSITY_MULTIPLIER: Record<string, number> = {
  LOW: 0.7,
  MEDIUM: 1.0,
  HIGH: 1.4,
};

const DAILY_TOKEN_CAP = BigInt(200); // max tokens earnable per day
const DAILY_XP_CAP = 400;

// Diminishing returns: each successive workout today earns less
const DIMINISHING_RETURNS = [1.0, 0.6, 0.3, 0.1];

export function calculateWorkoutReward(input: WorkoutRewardInput): RewardResult {
  const {
    durationMins,
    intensity,
    adherencePct,
    streakCount,
    fitnessBoost,
    dailyWorkoutCount,
  } = input;

  const intensityMult = INTENSITY_MULTIPLIER[intensity] ?? 1.0;
  const adherenceMult = Math.max(0.1, adherencePct / 100);
  const streakBonus = Math.min(1 + streakCount * 0.02, 1.5); // max 50% streak bonus
  const diminish = DIMINISHING_RETURNS[Math.min(dailyWorkoutCount, 3)];

  // Base calculations
  const rawXp = Math.floor(
    durationMins * BASE_XP_PER_MIN * intensityMult * adherenceMult * diminish
  );
  const rawTokens = BigInt(
    Math.floor(
      Number(BigInt(durationMins) * BASE_TOKENS_PER_MIN) *
        intensityMult *
        adherenceMult *
        streakBonus *
        diminish
    )
  );

  // Apply fitness boost: Total Reward = Base × (1 + FitnessBoost)
  const cappedBoost = Math.min(fitnessBoost, 0.3);
  const boostedTokens = BigInt(Math.floor(Number(rawTokens) * (1 + cappedBoost)));
  const bonusTokens = boostedTokens - rawTokens;

  // Apply daily caps
  const cappedByDailyLimit = boostedTokens > DAILY_TOKEN_CAP;
  const totalTokens = cappedByDailyLimit ? DAILY_TOKEN_CAP : boostedTokens;
  const totalXp = Math.min(rawXp, DAILY_XP_CAP);

  return {
    baseXp: rawXp,
    baseTokens: rawTokens,
    bonusTokens,
    totalTokens,
    totalXp,
    fitnessBoostApplied: cappedBoost,
    cappedByDailyLimit,
  };
}

// ─── Character Stat Progression ───────────────────────────────────────────────

export interface StatGain {
  strength: number;
  stamina: number;
  discipline: number;
  metabolism: number;
}

export function calculateStatGain(
  planType: string,
  durationMins: number,
  intensity: string
): StatGain {
  const base = Math.floor(durationMins / 20); // 1 point per 20 mins
  const intMult = { LOW: 0.5, MEDIUM: 1, HIGH: 1.5 }[intensity] ?? 1;

  const gains: Record<string, StatGain> = {
    STRENGTH: {
      strength: Math.ceil(base * 2 * intMult),
      stamina: Math.ceil(base * 0.5 * intMult),
      discipline: Math.ceil(base * 0.5 * intMult),
      metabolism: 0,
    },
    FAT_LOSS: {
      strength: Math.ceil(base * 0.5 * intMult),
      stamina: Math.ceil(base * 1.5 * intMult),
      discipline: Math.ceil(base * 0.5 * intMult),
      metabolism: Math.ceil(base * 1.5 * intMult),
    },
    HYBRID: {
      strength: Math.ceil(base * 1 * intMult),
      stamina: Math.ceil(base * 1 * intMult),
      discipline: Math.ceil(base * 1 * intMult),
      metabolism: Math.ceil(base * 0.5 * intMult),
    },
    CALISTHENICS: {
      strength: Math.ceil(base * 1 * intMult),
      stamina: Math.ceil(base * 1.5 * intMult),
      discipline: Math.ceil(base * 1.5 * intMult),
      metabolism: Math.ceil(base * 0.5 * intMult),
    },
  };

  return gains[planType] ?? gains["HYBRID"];
}

// ─── Transformation Stage ─────────────────────────────────────────────────────

export function calculateTransformationStage(totalXp: bigint): number {
  const xp = Number(totalXp);
  if (xp >= 10000) return 5;
  if (xp >= 5000) return 4;
  if (xp >= 2000) return 3;
  if (xp >= 800) return 2;
  if (xp >= 250) return 1;
  return 0;
}

// ─── Gym Income (NPC simulation) ─────────────────────────────────────────────

export function calculateGymDailyIncome(
  memberCount: number,
  npcSatisfaction: number, // 0–100 avg
  equipmentLevel: number,  // avg level of equipment
  monthlyFee: bigint
): bigint {
  const dailyFee = monthlyFee / BigInt(30);
  const satisfactionMult = npcSatisfaction / 100;
  const equipmentBonus = 1 + (equipmentLevel - 1) * 0.1; // +10% per level above 1
  return BigInt(
    Math.floor(Number(dailyFee) * memberCount * satisfactionMult * equipmentBonus)
  );
}

// ─── Streak Update ────────────────────────────────────────────────────────────

export function calculateStreakUpdate(
  lastWorkoutAt: Date | null,
  currentStreak: number,
  longestStreak: number
): { newStreak: number; newLongest: number } {
  const now = new Date();
  if (!lastWorkoutAt) {
    return { newStreak: 1, newLongest: Math.max(1, longestStreak) };
  }

  const diffHours =
    (now.getTime() - lastWorkoutAt.getTime()) / (1000 * 60 * 60);

  if (diffHours <= 24) {
    // Same day: streak already counted
    return { newStreak: currentStreak, newLongest: longestStreak };
  } else if (diffHours <= 48) {
    // Yesterday: extend streak
    const newStreak = currentStreak + 1;
    return { newStreak, newLongest: Math.max(newStreak, longestStreak) };
  } else {
    // Missed a day: reset streak
    return { newStreak: 1, newLongest: longestStreak };
  }
}
