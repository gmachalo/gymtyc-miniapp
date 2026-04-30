import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { calculateGymDailyIncome } from "@/lib/game/engine";

// GET /api/game/gyms/[id] — gym detail
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id: gymId } = await params;

  const gym = await prisma.gym.findUnique({
    where: { id: gymId },
    include: {
      owner: { select: { id: true, name: true, displayName: true, image: true } },
      members: {
        take: 20,
        include: { user: { select: { id: true, name: true, image: true, level: true } } },
      },
      equipment: true,
      npcClients: { where: { active: true } },
      _count: { select: { members: true } },
    },
  });

  if (!gym) return Response.json({ error: "Gym not found" }, { status: 404 });

  const avgSatisfaction =
    gym.npcClients.length > 0
      ? Math.floor(
          gym.npcClients.reduce((s, n) => s + n.satisfaction, 0) /
            gym.npcClients.length
        )
      : 50;

  const avgEquipLevel =
    gym.equipment.length > 0
      ? gym.equipment.reduce((s, e) => s + e.level, 0) / gym.equipment.length
      : 1;

  const dailyIncome = calculateGymDailyIncome(
    gym._count.members,
    avgSatisfaction,
    avgEquipLevel,
    gym.monthlyFee
  );

  const isMember = gym.members.some((m) => m.userId === session.user!.id);
  const isOwner = gym.ownerId === session.user.id;

  return Response.json({ gym, dailyIncome: dailyIncome.toString(), isMember, isOwner });
}
