import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";

// POST /api/game/gyms/[id]/join
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id: gymId } = await params;
  const userId = session.user.id;

  const [gym, user, existingMembership] = await Promise.all([
    prisma.gym.findUnique({ where: { id: gymId } }),
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.gymMember.findUnique({
      where: { gymId_userId: { gymId, userId } },
    }),
  ]);

  if (!gym) return Response.json({ error: "Gym not found" }, { status: 404 });
  if (!user) return Response.json({ error: "User not found" }, { status: 404 });
  if (existingMembership)
    return Response.json({ error: "Already a member" }, { status: 409 });
  if (gym.memberCount >= gym.maxMembers)
    return Response.json({ error: "Gym is full" }, { status: 400 });

  // Monthly fee deducted on join (token sink)
  const fee = gym.monthlyFee;
  if (user.offChainTokens < fee)
    return Response.json({ error: `Need ${fee} GYMFIT to join` }, { status: 402 });

  await prisma.$transaction(async (tx) => {
    await tx.gymMember.create({ data: { gymId, userId, role: "MEMBER" } });
    await tx.gym.update({
      where: { id: gymId },
      data: { memberCount: { increment: 1 } },
    });
    await tx.user.update({
      where: { id: userId },
      data: { offChainTokens: { decrement: fee } },
    });
    await tx.transaction.create({
      data: {
        userId,
        type: "GYM_FEE",
        amount: fee,
        balanceBefore: user.offChainTokens,
        balanceAfter: user.offChainTokens - fee,
        description: `Joined gym: ${gym.name}`,
      },
    });
  });

  return Response.json({ success: true, gym });
}
