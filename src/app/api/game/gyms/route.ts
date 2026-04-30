import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";

// GET /api/game/gyms — list all gyms
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type"); // 'SYSTEM' | 'PLAYER'

  const gyms = await prisma.gym.findMany({
    where: type ? { type: type as "SYSTEM" | "PLAYER" } : undefined,
    include: {
      _count: { select: { members: true } },
      owner: { select: { displayName: true, name: true } },
    },
    orderBy: { reputation: "desc" },
  });

  return Response.json({ gyms });
}

// POST /api/game/gyms — create a player gym
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const body = await req.json();
  const { name, description, monthlyFee } = body as {
    name: string;
    description?: string;
    monthlyFee?: number;
  };

  if (!name || name.trim().length < 3)
    return Response.json({ error: "Gym name must be at least 3 characters" }, { status: 400 });

  // Check user has enough tokens (gym creation costs 500 GYMFIT)
  const GYM_CREATION_COST = BigInt(500);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return Response.json({ error: "User not found" }, { status: 404 });

  if (user.offChainTokens < GYM_CREATION_COST)
    return Response.json({ error: "Insufficient tokens. Need 500 GYMFIT to create a gym." }, { status: 402 });

  // Check they don't already own a gym
  const existing = await prisma.gym.findFirst({ where: { ownerId: userId } });
  if (existing)
    return Response.json({ error: "You already own a gym" }, { status: 409 });

  const gym = await prisma.$transaction(async (tx) => {
    const g = await tx.gym.create({
      data: {
        name: name.trim(),
        description,
        type: "PLAYER",
        ownerId: userId,
        monthlyFee: monthlyFee ? BigInt(monthlyFee) : BigInt(100),
      },
    });

    // Auto-join as owner
    await tx.gymMember.create({
      data: { gymId: g.id, userId, role: "CO_OWNER" },
    });

    // Deduct tokens (sink!)
    await tx.user.update({
      where: { id: userId },
      data: { offChainTokens: user.offChainTokens - GYM_CREATION_COST },
    });

    // Log spend transaction
    await tx.transaction.create({
      data: {
        userId,
        type: "SPEND",
        amount: GYM_CREATION_COST,
        balanceBefore: user.offChainTokens,
        balanceAfter: user.offChainTokens - GYM_CREATION_COST,
        description: `Created gym: ${g.name}`,
      },
    });

    return g;
  });

  return Response.json({ gym }, { status: 201 });
}
