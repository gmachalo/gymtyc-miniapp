import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";

// GET /api/game/dashboard — all data needed for main dashboard in one call
export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  const [user, character, streak, recentWorkouts, gymMembership, latestSync] =
    await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.character.findFirst({ where: { userId, isActive: true } }),
      prisma.streak.findUnique({ where: { userId } }),
      prisma.workout.findMany({
        where: { userId },
        orderBy: { completedAt: "desc" },
        take: 5,
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

  if (!user) return Response.json({ error: "User not found" }, { status: 404 });

  return Response.json({
    user: {
      id: user.id,
      name: user.name,
      displayName: user.displayName,
      image: user.image,
      level: user.level,
      totalXp: user.totalXp.toString(),
      offChainTokens: user.offChainTokens.toString(),
      mode: user.mode,
      onboardingDone: user.onboardingDone,
    },
    character,
    streak,
    recentWorkouts,
    gym: gymMembership?.gym ?? null,
    latestSync,
  });
}
