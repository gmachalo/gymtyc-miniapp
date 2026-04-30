import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatTokens, formatXp } from "@/lib/utils";

const BODY_TYPE_EMOJI: Record<string, string> = {
  SKINNY: "🦴",
  AVERAGE: "🧑",
  OVERWEIGHT: "🐻",
};

const STAGE_LABELS = [
  "Beginner",
  "Novice",
  "Intermediate",
  "Advanced",
  "Elite",
  "Legend",
];

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  const [user, character, streak, recentWorkouts, gymMembership, latestSync] =
    await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.character.findFirst({ where: { userId, isActive: true } }),
      prisma.streak.findUnique({ where: { userId } }),
      prisma.workout.findMany({
        where: { userId },
        orderBy: { completedAt: "desc" },
        take: 3,
        include: { plan: { select: { name: true } } },
      }),
      prisma.gymMember.findFirst({
        where: { userId },
        include: { gym: true },
        orderBy: { joinedAt: "desc" },
      }),
      prisma.fitnessSync.findFirst({
        where: { userId },
        orderBy: { syncDate: "desc" },
      }),
    ]);

  if (!user) redirect("/login");
  if (!user.onboardingDone) redirect("/onboarding");

  const tokens = formatTokens(user.offChainTokens);
  const xp = formatXp(user.totalXp);
  const streakCount = streak?.currentStreak ?? 0;
  const boostPct = latestSync ? Math.round(Number(latestSync.fitnessBoost) * 100) : 0;

  return (
    <div>
      {/* Top header */}
      <header className="top-header">
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div className="char-avatar" style={{ width: 40, height: 40, fontSize: 20 }}>
            {character ? BODY_TYPE_EMOJI[character.bodyType] : "🏋️"}
          </div>
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: "15px" }}>
              {user.displayName || user.name || "Trainer"}
            </p>
            <p style={{ margin: 0, fontSize: "12px", color: "var(--text-secondary)" }}>
              Level {user.level} ·{" "}
              <span className="gradient-text" style={{ WebkitTextFillColor: undefined }}>
                {character ? STAGE_LABELS[character.transformationStage] : "New"}
              </span>
            </p>
          </div>
        </div>

        {/* Token badge */}
        <div
          className="badge badge-gold"
          style={{ fontSize: "13px", padding: "6px 14px" }}
        >
          💰 {tokens} GYMFIT
        </div>
      </header>

      <div className="container" style={{ paddingTop: "20px" }}>
        {/* Stats row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "10px",
            marginBottom: "24px",
          }}
        >
          {[
            { label: "Streak", value: `${streakCount}🔥`, sub: streakCount === 1 ? "day" : "days" },
            { label: "XP", value: xp, sub: "total" },
            { label: "Boost", value: `+${boostPct}%`, sub: "fitness" },
          ].map((s) => (
            <div key={s.label} className="stat-pill">
              <span style={{ fontSize: "18px", fontWeight: 800 }}>{s.value}</span>
              <span style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase" }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* Character card */}
        {character ? (
          <div className="card hover-lift" style={{ marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div
                className="char-avatar"
                style={{
                  background: "linear-gradient(135deg, rgba(108,71,255,0.3), rgba(0,212,170,0.2))",
                }}
              >
                {BODY_TYPE_EMOJI[character.bodyType]}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: "17px" }}>
                    {character.name}
                  </p>
                  <span className="badge badge-purple">
                    Stage {character.transformationStage}
                  </span>
                </div>

                {/* Stat bars */}
                {[
                  { key: "strength",   val: character.strength,   fill: "fill-strength",   label: "STR" },
                  { key: "stamina",    val: character.stamina,    fill: "fill-stamina",    label: "STA" },
                  { key: "discipline", val: character.discipline, fill: "fill-discipline", label: "DIS" },
                  { key: "metabolism", val: character.metabolism, fill: "fill-metabolism", label: "MET" },
                ].map((s) => (
                  <div key={s.key} style={{ marginTop: "8px" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "11px",
                        color: "var(--text-muted)",
                        marginBottom: "3px",
                      }}
                    >
                      <span>{s.label}</span>
                      <span style={{ fontWeight: 700, color: "var(--text-secondary)" }}>
                        {s.val}
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className={`progress-fill ${s.fill}`}
                        style={{ width: `${Math.min(s.val, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <Link href="/character" style={{ textDecoration: "none", display: "block", marginBottom: "16px" }}>
            <div
              className="card"
              style={{
                textAlign: "center",
                border: "2px dashed var(--border-default)",
                padding: "32px",
              }}
            >
              <p style={{ fontSize: "40px", margin: "0 0 8px" }}>🧍</p>
              <p style={{ fontWeight: 700, margin: "0 0 4px" }}>Create Your Character</p>
              <p style={{ color: "var(--text-secondary)", fontSize: "13px", margin: 0 }}>
                Choose your starting body type and begin your transformation
              </p>
            </div>
          </Link>
        )}

        {/* Quick Actions */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "24px" }}>
          <Link href="/workout" style={{ textDecoration: "none" }}>
            <div
              className="card hover-lift"
              style={{
                textAlign: "center",
                padding: "20px 12px",
                background: "linear-gradient(135deg, rgba(108,71,255,0.2), rgba(108,71,255,0.05))",
                border: "1px solid rgba(108,71,255,0.3)",
              }}
            >
              <p style={{ fontSize: "32px", margin: "0 0 8px" }}>💪</p>
              <p style={{ fontWeight: 700, margin: "0 0 2px", fontSize: "14px" }}>Start Workout</p>
              <p style={{ color: "var(--text-secondary)", fontSize: "12px", margin: 0 }}>
                Earn XP + tokens
              </p>
            </div>
          </Link>

          <Link href="/gyms" style={{ textDecoration: "none" }}>
            <div
              className="card hover-lift"
              style={{
                textAlign: "center",
                padding: "20px 12px",
                background: "linear-gradient(135deg, rgba(0,212,170,0.15), rgba(0,212,170,0.05))",
                border: "1px solid rgba(0,212,170,0.3)",
              }}
            >
              <p style={{ fontSize: "32px", margin: "0 0 8px" }}>🏢</p>
              <p style={{ fontWeight: 700, margin: "0 0 2px", fontSize: "14px" }}>My Gym</p>
              <p style={{ color: "var(--text-secondary)", fontSize: "12px", margin: 0 }}>
                {gymMembership ? gymMembership.gym.name : "Find a gym"}
              </p>
            </div>
          </Link>
        </div>

        {/* Fitness sync status */}
        {latestSync && (
          <div className="card" style={{ marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ margin: "0 0 2px", fontWeight: 600, fontSize: "14px" }}>
                  🔗 Fitness API Sync
                </p>
                <p style={{ margin: 0, fontSize: "12px", color: "var(--text-secondary)" }}>
                  {latestSync.durationMins}min ·{" "}
                  {latestSync.intensity} intensity ·{" "}
                  {Number(latestSync.adherencePct).toFixed(0)}% adherence
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <span className="badge badge-teal">
                  +{boostPct}% boost
                </span>
                <p style={{ margin: "4px 0 0", fontSize: "11px", color: "var(--text-muted)" }}>
                  {latestSync.applied ? "Applied ✓" : "Ready to use"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Recent workouts */}
        {recentWorkouts.length > 0 && (
          <div style={{ marginBottom: "24px" }}>
            <p className="section-title">Recent Workouts</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {recentWorkouts.map((w) => (
                <div
                  key={w.id}
                  className="card"
                  style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                >
                  <div>
                    <p style={{ margin: "0 0 2px", fontSize: "14px", fontWeight: 600 }}>
                      {w.plan?.name ?? "Freestyle Workout"}
                    </p>
                    <p style={{ margin: 0, fontSize: "12px", color: "var(--text-secondary)" }}>
                      {w.durationMins}min · {w.intensity}
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ margin: "0 0 2px", fontSize: "13px", fontWeight: 700 }} className="gradient-text-gold">
                      +{formatTokens(w.tokensEarned)} 💰
                    </p>
                    <p style={{ margin: 0, fontSize: "11px", color: "var(--text-muted)" }}>
                      +{w.xpEarned} XP
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
