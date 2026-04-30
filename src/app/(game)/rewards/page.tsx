import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "next/navigation";
import { formatTokens } from "@/lib/utils";

export default async function RewardsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const [user, rewards, transactions] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.reward.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  if (!user) redirect("/login");

  const totalEarned = rewards.reduce((s, r) => s + r.totalAmount, BigInt(0));
  const workoutRewards = rewards.filter((r) => r.type === "WORKOUT").length;
  const boostedCount = rewards.filter((r) => Number(r.fitnessBoost) > 0).length;

  const REWARD_ICON: Record<string, string> = {
    WORKOUT: "💪",
    GYM_INCOME: "🏢",
    CHALLENGE: "🏆",
    STREAK_BONUS: "🔥",
    REFERRAL: "👥",
  };

  const TX_ICON: Record<string, string> = {
    EARN: "⬆️",
    SPEND: "⬇️",
    GYM_FEE: "🏢",
    EQUIPMENT_BUY: "🏋️",
    TRANSFER: "↔️",
    ON_CHAIN_CLAIM: "🔗",
  };

  return (
    <div>
      <header className="top-header">
        <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 800 }}>💰 Rewards</h1>
      </header>

      <div className="container" style={{ paddingTop: "20px" }}>
        {/* Balance hero */}
        <div
          className="card"
          style={{
            marginBottom: "20px",
            textAlign: "center",
            background: "linear-gradient(135deg, rgba(245,197,24,0.1), rgba(255,107,53,0.05))",
            border: "1px solid rgba(245,197,24,0.3)",
            padding: "28px 20px",
          }}
        >
          <p style={{ margin: "0 0 4px", fontSize: "13px", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Off-Chain Balance
          </p>
          <p style={{ margin: "0 0 16px", fontSize: "40px", fontWeight: 900 }} className="gradient-text-gold">
            {formatTokens(user.offChainTokens)} GYMFIT
          </p>
          <p style={{ margin: "0 0 16px", fontSize: "12px", color: "var(--text-muted)" }}>
            Connect a wallet to claim on-chain (Base)
          </p>
          <button className="btn btn-secondary btn-sm" id="connect-wallet-btn" style={{ opacity: 0.6 }} disabled>
            🔗 Connect Wallet (Coming Soon)
          </button>
        </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "24px" }}>
          {[
            { label: "Total Earned", value: formatTokens(totalEarned) },
            { label: "Workouts", value: workoutRewards.toString() },
            { label: "Boosted", value: boostedCount.toString() },
          ].map((s) => (
            <div key={s.label} className="stat-pill">
              <span style={{ fontWeight: 800, fontSize: "18px" }}>{s.value}</span>
              <span style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase" }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Tokenomics info */}
        <div className="card" style={{ marginBottom: "20px", padding: "14px 16px" }}>
          <p style={{ margin: "0 0 8px", fontWeight: 700, fontSize: "14px" }}>📊 Token Economics</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {[
              { label: "Daily Cap", value: "200 GYMFIT" },
              { label: "Max Fitness Boost", value: "+30%" },
              { label: "Gym Creation Cost", value: "500 GYMFIT (burned)" },
              { label: "Monthly Gym Fee", value: "10–1000 GYMFIT (sink)" },
            ].map((r) => (
              <div key={r.label} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                <span style={{ color: "var(--text-secondary)" }}>{r.label}</span>
                <span style={{ fontWeight: 600 }}>{r.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Reward history */}
        {rewards.length > 0 && (
          <div style={{ marginBottom: "20px" }}>
            <p className="section-title">Reward History</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {rewards.slice(0, 8).map((r) => (
                <div
                  key={r.id}
                  className="card"
                  style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                >
                  <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    <span style={{ fontSize: "22px" }}>{REWARD_ICON[r.type] ?? "🎁"}</span>
                    <div>
                      <p style={{ margin: "0 0 2px", fontSize: "14px", fontWeight: 600 }}>
                        {r.type.replace("_", " ")}
                      </p>
                      {Number(r.fitnessBoost) > 0 && (
                        <span className="badge badge-teal" style={{ fontSize: "10px" }}>
                          +{Math.round(Number(r.fitnessBoost) * 100)}% boost
                        </span>
                      )}
                    </div>
                  </div>
                  <span style={{ fontWeight: 800, fontSize: "15px" }} className="gradient-text-gold">
                    +{r.totalAmount.toString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transaction log */}
        {transactions.length > 0 && (
          <div style={{ marginBottom: "24px" }}>
            <p className="section-title">Transaction Log</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {transactions.map((t) => (
                <div
                  key={t.id}
                  className="card"
                  style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                >
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <span style={{ fontSize: "16px" }}>{TX_ICON[t.type] ?? "•"}</span>
                    <p style={{ margin: 0, fontSize: "13px", color: "var(--text-secondary)" }}>
                      {t.description ?? t.type}
                    </p>
                  </div>
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: "14px",
                      color: t.type === "EARN" ? "var(--brand-accent)" : "var(--stat-strength)",
                    }}
                  >
                    {t.type === "EARN" ? "+" : "-"}{t.amount.toString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {rewards.length === 0 && (
          <div className="card" style={{ textAlign: "center", padding: "40px 24px" }}>
            <p style={{ fontSize: "40px", margin: "0 0 12px" }}>🌱</p>
            <p style={{ fontWeight: 700, margin: "0 0 4px" }}>No rewards yet</p>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px", margin: 0 }}>
              Complete a workout to earn your first GYMFIT tokens
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
