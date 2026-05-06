import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatTokens } from "@/lib/utils";
import { GYM_TIERS } from "@/app/api/game/gyms/[id]/upgrade/route";

const TIER_COLORS: Record<number, string> = {
  1: "#6b7280",
  2: "#6c47ff",
  3: "#f59e0b",
  4: "#00d4aa",
  5: "#f72585",
};

const TIER_LABELS: Record<number, string> = {
  1: "T1 Starter",
  2: "T2 Iron",
  3: "T3 Power",
  4: "T4 Elite",
  5: "T5 Champion",
};

function JoinCostBadge({ tier, totalXp, gymfit }: { tier: number; totalXp: number; gymfit: bigint }) {
  const tierData = GYM_TIERS[tier - 1];
  if (!tierData) return null;

  if (tierData.joinXp > 0) {
    const canAfford = totalXp >= tierData.joinXp;
    return (
      <span
        style={{
          fontSize: "10px",
          padding: "2px 7px",
          borderRadius: "99px",
          fontWeight: 700,
          background: canAfford ? "rgba(108,71,255,0.2)" : "rgba(239,68,68,0.15)",
          color: canAfford ? "#a78bfa" : "#f87171",
          border: `1px solid ${canAfford ? "rgba(108,71,255,0.4)" : "rgba(239,68,68,0.3)"}`,
        }}
      >
        ⚡ {tierData.joinXp} XP
      </span>
    );
  }

  if (tierData.joinGymfit > 0) {
    const canAfford = Number(gymfit) >= tierData.joinGymfit;
    return (
      <span
        style={{
          fontSize: "10px",
          padding: "2px 7px",
          borderRadius: "99px",
          fontWeight: 700,
          background: canAfford ? "rgba(0,212,170,0.2)" : "rgba(239,68,68,0.15)",
          color: canAfford ? "#00d4aa" : "#f87171",
          border: `1px solid ${canAfford ? "rgba(0,212,170,0.4)" : "rgba(239,68,68,0.3)"}`,
        }}
      >
        💰 {tierData.joinGymfit.toLocaleString()} GYMFIT
      </span>
    );
  }

  return null;
}

export default async function GymsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  const [gyms, myMemberships, user] = await Promise.all([
    prisma.gym.findMany({
      include: { _count: { select: { members: true } } },
      orderBy: [{ tier: "asc" }, { reputation: "desc" }],
    }),
    prisma.gymMember.findMany({ where: { userId }, select: { gymId: true } }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { offChainTokens: true, currentXp: true, overflowXp: true },
    }),
  ]);

  const joinedGymIds = new Set(myMemberships.map((m) => m.gymId));
  const systemGyms = gyms.filter((g) => g.type === "SYSTEM");
  const playerGyms = gyms.filter((g) => g.type === "PLAYER");
  const totalXp = (user?.currentXp ?? 0) + (user?.overflowXp ?? 0);

  const GymCard = ({ gym, isMember }: { gym: typeof gyms[0]; isMember: boolean }) => {
    const fillPct = Math.round((gym.memberCount / gym.maxMembers) * 100);
    const tier = gym.tier ?? 1;
    const tierColor = TIER_COLORS[tier] ?? "#6b7280";

    return (
      <Link key={gym.id} href={`/gyms/${gym.id}`} id={`gym-${gym.id}`} style={{ textDecoration: "none" }}>
        <div
          className="card hover-lift"
          style={{ borderLeft: `3px solid ${tierColor}` }}
        >
          {/* Top badges */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", flexWrap: "wrap", gap: "6px" }}>
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <span
                style={{
                  fontSize: "10px",
                  padding: "2px 7px",
                  borderRadius: "99px",
                  fontWeight: 700,
                  background: `${tierColor}22`,
                  color: tierColor,
                  border: `1px solid ${tierColor}55`,
                }}
              >
                {TIER_LABELS[tier]}
              </span>
              {gym.type === "SYSTEM" && (
                <span className="badge badge-gold" style={{ fontSize: "10px" }}>Official</span>
              )}
            </div>
            <div style={{ display: "flex", gap: "6px" }}>
              {isMember
                ? <span className="badge badge-teal" style={{ fontSize: "10px" }}>✓ Member</span>
                : <JoinCostBadge tier={tier} totalXp={totalXp} gymfit={user?.offChainTokens ?? BigInt(0)} />
              }
            </div>
          </div>

          {/* Gym info */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: "16px" }}>{gym.name}</p>
              <p style={{ margin: "0 0 10px", fontSize: "12px", color: "var(--text-secondary)" }}>
                {gym.description}
              </p>
              {/* Member fill bar */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ flex: 1, height: "4px", background: "var(--bg-elevated)", borderRadius: "99px" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${fillPct}%`,
                      background: fillPct > 80 ? "#ef4444" : tierColor,
                      borderRadius: "99px",
                      transition: "width 0.4s ease",
                    }}
                  />
                </div>
                <span style={{ fontSize: "10px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                  {gym.memberCount}/{gym.maxMembers}
                </span>
              </div>
            </div>
            <div style={{ textAlign: "right", marginLeft: "12px" }}>
              <p style={{ margin: "0 0 2px", fontWeight: 700 }}>⭐ {gym.reputation}</p>
              <p style={{ margin: "0 0 6px", fontSize: "11px", color: "var(--text-muted)" }}>rep</p>
              <p style={{ margin: 0, fontSize: "11px", color: "var(--text-muted)" }}>
                💰 {formatTokens(gym.monthlyFee)}/mo
              </p>
            </div>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <div>
      <header className="top-header">
        <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 800 }}>🏢 Gyms</h1>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <div style={{ display: "flex", gap: "6px" }}>
            <span className="badge badge-purple" style={{ fontSize: "11px" }}>⚡ {totalXp} XP</span>
            <span className="badge badge-gold" style={{ fontSize: "11px" }}>
              💰 {formatTokens(user?.offChainTokens ?? BigInt(0))}
            </span>
          </div>
          <Link href="/gyms/create" className="btn btn-primary btn-sm" id="create-gym-btn">
            + Buy Gym
          </Link>
        </div>
      </header>

      <div className="container" style={{ paddingTop: "20px" }}>
        {/* Tier legend */}
        <div
          style={{
            display: "flex",
            gap: "6px",
            flexWrap: "wrap",
            marginBottom: "20px",
            padding: "10px 12px",
            background: "var(--bg-card)",
            borderRadius: "10px",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <span style={{ fontSize: "11px", color: "var(--text-muted)", marginRight: "4px" }}>Tiers:</span>
          {GYM_TIERS.map((t) => (
            <span
              key={t.tier}
              style={{
                fontSize: "10px",
                padding: "2px 7px",
                borderRadius: "99px",
                background: `${TIER_COLORS[t.tier]}22`,
                color: TIER_COLORS[t.tier],
                border: `1px solid ${TIER_COLORS[t.tier]}55`,
                fontWeight: 600,
              }}
            >
              T{t.tier} · {t.tier <= 3 ? `${t.joinXp} XP` : `${t.joinGymfit.toLocaleString()} GYMFIT`}
            </span>
          ))}
        </div>

        {/* System gyms */}
        <p className="section-title">🏛️ Official Gyms</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "28px" }}>
          {systemGyms.map((gym) => (
            <GymCard key={gym.id} gym={gym} isMember={joinedGymIds.has(gym.id)} />
          ))}
        </div>

        {/* Player gyms */}
        {playerGyms.length > 0 && (
          <>
            <p className="section-title">🏗️ Player Gyms</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "28px" }}>
              {playerGyms.map((gym) => (
                <GymCard key={gym.id} gym={gym} isMember={joinedGymIds.has(gym.id)} />
              ))}
            </div>
          </>
        )}

        {playerGyms.length === 0 && (
          <div
            className="card"
            style={{ textAlign: "center", padding: "28px", border: "2px dashed var(--border-subtle)", marginBottom: "24px" }}
          >
            <p style={{ fontSize: "32px", margin: "0 0 8px" }}>🏗️</p>
            <p style={{ fontWeight: 700, margin: "0 0 4px" }}>No Player Gyms Yet</p>
            <p style={{ color: "var(--text-secondary)", fontSize: "13px", margin: "0 0 16px" }}>
              Buy a Tier 1 gym for 500 XP and start building your empire.
            </p>
            <Link href="/gyms/create" className="btn btn-primary btn-sm">
              Buy a Gym (500 XP)
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
