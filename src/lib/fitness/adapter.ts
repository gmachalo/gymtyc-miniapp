/**
 * Mock Fitness API Adapter
 *
 * In production this would call a real external fitness miniapp API.
 * For MVP, this generates realistic mock data seeded by userId + date.
 *
 * External API contract:
 *   GET /workouts → WorkoutSummary[]
 *   GET /plans    → PlanSummary[]
 *   GET /streaks  → StreakSummary
 */

export interface ExternalWorkoutSummary {
  id: string;
  date: string; // ISO date string
  durationMins: number;
  intensity: "LOW" | "MEDIUM" | "HIGH";
  adherencePct: number;
  planType: string;
}

export interface ExternalStreakSummary {
  currentStreak: number;
  longestStreak: number;
  lastWorkoutDate: string;
}

export interface DailyFitnessSummary {
  date: string;
  durationMins: number;
  intensity: "LOW" | "MEDIUM" | "HIGH";
  adherencePct: number;
  streakCount: number;
  fitnessBoost: number; // 0.0 – 0.30 (capped)
  valid: boolean; // passes anti-cheat thresholds
}

// ─── Anti-cheat thresholds ────────────────────────────────────────────────────
const MIN_DURATION_MINS = 15;
const MIN_ADHERENCE_PCT = 40;

// ─── Deterministic mock data generator ───────────────────────────────────────
// Uses userId + date as seed so same inputs = same outputs (testable)

function seededRandom(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return () => {
    h = (Math.imul(1664525, h) + 1013904223) | 0;
    return ((h >>> 0) / 0xffffffff);
  };
}

function pickIntensity(rand: number): "LOW" | "MEDIUM" | "HIGH" {
  if (rand < 0.25) return "LOW";
  if (rand < 0.7) return "MEDIUM";
  return "HIGH";
}

// ─── Mock API calls ───────────────────────────────────────────────────────────

export async function fetchMockWorkouts(
  userId: string,
  daysBack = 7
): Promise<ExternalWorkoutSummary[]> {
  const workouts: ExternalWorkoutSummary[] = [];

  for (let d = 0; d < daysBack; d++) {
    const date = new Date();
    date.setDate(date.getDate() - d);
    const dateStr = date.toISOString().split("T")[0];
    const rng = seededRandom(`${userId}-${dateStr}`);

    // ~70% chance user worked out that day
    if (rng() > 0.3) {
      const planTypes = ["STRENGTH", "FAT_LOSS", "HYBRID", "CALISTHENICS"];
      workouts.push({
        id: `mock-${userId}-${dateStr}`,
        date: dateStr,
        durationMins: Math.floor(rng() * 45 + 15), // 15–60 mins
        intensity: pickIntensity(rng()),
        adherencePct: Math.floor(rng() * 40 + 60), // 60–100%
        planType: planTypes[Math.floor(rng() * planTypes.length)],
      });
    }
  }

  return workouts;
}

export async function fetchMockStreak(
  userId: string
): Promise<ExternalStreakSummary> {
  const rng = seededRandom(`${userId}-streak`);
  const currentStreak = Math.floor(rng() * 14);
  return {
    currentStreak,
    longestStreak: currentStreak + Math.floor(rng() * 20),
    lastWorkoutDate: new Date(Date.now() - 86400000).toISOString().split("T")[0],
  };
}

// ─── Daily summary processor ─────────────────────────────────────────────────

export async function getDailyFitnessSummary(
  userId: string,
  targetDate?: Date
): Promise<DailyFitnessSummary> {
  const date = targetDate ?? new Date();
  const dateStr = date.toISOString().split("T")[0];

  const [workouts, streak] = await Promise.all([
    fetchMockWorkouts(userId, 1),
    fetchMockStreak(userId),
  ]);

  const todayWorkout = workouts.find((w) => w.date === dateStr);

  if (!todayWorkout) {
    return {
      date: dateStr,
      durationMins: 0,
      intensity: "LOW",
      adherencePct: 0,
      streakCount: streak.currentStreak,
      fitnessBoost: 0,
      valid: false,
    };
  }

  // Anti-cheat validation
  const valid =
    todayWorkout.durationMins >= MIN_DURATION_MINS &&
    todayWorkout.adherencePct >= MIN_ADHERENCE_PCT;

  // Boost formula
  const intensityScore = { LOW: 0.3, MEDIUM: 0.6, HIGH: 1.0 }[todayWorkout.intensity];
  const durationScore = Math.min(todayWorkout.durationMins / 60, 1);
  const adherenceScore = todayWorkout.adherencePct / 100;
  const streakMultiplier = Math.min(1 + streak.currentStreak * 0.01, 1.2);

  const rawBoost =
    (durationScore * 0.4 + intensityScore * 0.3 + adherenceScore * 0.3) *
    streakMultiplier;

  const fitnessBoost = valid ? Math.min(rawBoost, 0.3) : 0;

  return {
    date: dateStr,
    durationMins: todayWorkout.durationMins,
    intensity: todayWorkout.intensity,
    adherencePct: todayWorkout.adherencePct,
    streakCount: streak.currentStreak,
    fitnessBoost,
    valid,
  };
}
