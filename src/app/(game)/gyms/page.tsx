import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatTokens } from "@/lib/utils";

export default async function GymsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  const [gyms, myMemberships, user] = await Promise.all([
    prisma.gym.findMany({
      include: { _count: { select: { members: true } } },
      orderBy: { reputation: "desc" },
    }),
    prisma.gymMember.findMany({ where: { userId }, select: { gymId: true } }),
    prisma.user.findUnique({ where: { id: userId } }),
  ]);

  const joinedGymIds = new Set(myMemberships.map((m) => m.gymId));
  const systemGyms = gyms.filter((g) => g.type === "SYSTEM");
  const playerGyms = gyms.filter((g) => g.type === "PLAYER");

  return (
    <div>
      <header className="top-header">
        <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 800 }}>🏢 Gyms</h1>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span className="badge badge-gold">💰 {formatTokens(user?.offChainTokens ?? BigInt(0))}</span>
          <Link href="/gyms/create" className="btn btn-primary btn-sm" id="create-gym-btn">
            + Create
          </Link>
        </div>
      </header>

      <div className="container" style={{ paddingTop: "20px" }}>
        <p className="section-title">🏛️ System Gyms</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "28px" }}>
          {systemGyms.map((gym) => {
            const isMember = joinedGymIds.has(gym.id);
            const fillPct = Math.round((gym.memberCount / gym.maxMembers) * 100);
            return (
              <Link key={gym.id} href={`/gyms/${gym.id}`} id={`gym-${gym.id}`} style={{ textDecoration: "none" }}>
                <div className="card hover-lift">
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    <span className="badge badge-gold">System</span>
                    {isMember && <span className="badge badge-teal">✓ Joined</span>}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: "17px" }}>{gym.name}</p>
                      <p style={{ margin: 0, fontSize: "13px", color: "var(--text-secondary)" }}>{gym.description}</p>
                    </div>
                    <div style={{ textAlign: "right", marginLeft: "12px" }}>
                      <p style={{ margin: "0 0 2px", fontWeight: 700 }}>⭐ {gym.reputation}</p>
                      <p style={{ margin: 0, fontSize: "11px", color: "var(--text-muted)" }}>rep</p>
                    </div>
                  </div>
                  <div style={{ marginTop: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                      <span>{gym._count.members} / {gym.maxMembers} members</span>
                      <span>💰 {gym.monthlyFee.toString()} /mo</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill fill-primary" style={{ width: `${fillPct}%` }} />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <p className="section-title">👥 Player Gyms</p>
        {playerGyms.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "40px 24px", border: "2px dashed var(--border-default)" }}>
            <p style={{ fontSize: "40px", margin: "0 0 12px" }}>🏗️</p>
            <p style={{ fontWeight: 700, margin: "0 0 8px" }}>No Player Gyms Yet</p>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px", margin: "0 0 20px" }}>Be the first! Costs 500 GYMFIT.</p>
            <Link href="/gyms/create" className="btn btn-primary btn-sm" id="first-gym-cta">Create a Gym</Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {playerGyms.map((gym) => (
              <Link key={gym.id} href={`/gyms/${gym.id}`} id={`gym-${gym.id}`} style={{ textDecoration: "none" }}>
                <div className="card hover-lift">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ display: "flex", gap: "8px", marginBottom: "6px" }}>
                        <span className="badge badge-purple">Player</span>
                        {joinedGymIds.has(gym.id) && <span className="badge badge-teal">✓ Joined</span>}
                      </div>
                      <p style={{ margin: "0 0 2px", fontWeight: 700 }}>{gym.name}</p>
                      <p style={{ margin: 0, fontSize: "12px", color: "var(--text-secondary)" }}>
                        {gym._count.members} members · ⭐ {gym.reputation}
                      </p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ margin: "0 0 2px", fontWeight: 700 }}>💰 {gym.monthlyFee.toString()}</p>
                      <p style={{ margin: 0, fontSize: "11px", color: "var(--text-muted)" }}>GYMFIT/mo</p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
