import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";

// Gym tier upgrade costs and config
export const GYM_TIERS = [
  { tier: 1, name: "Starter Den",       joinXp: 50,   buyXp: 500,   joinGymfit: 0,    buyGymfit: 0,     monthlyFee: BigInt(50),   multiplier: 1.0 },
  { tier: 2, name: "Iron Pit",          joinXp: 150,  buyXp: 2000,  joinGymfit: 0,    buyGymfit: 0,     monthlyFee: BigInt(120),  multiplier: 1.2 },
  { tier: 3, name: "Power House",       joinXp: 300,  buyXp: 5000,  joinGymfit: 0,    buyGymfit: 0,     monthlyFee: BigInt(250),  multiplier: 1.5 },
  { tier: 4, name: "Elite Zone",        joinXp: 0,    buyXp: 0,     joinGymfit: 500,  buyGymfit: 15000, monthlyFee: BigInt(800),  multiplier: 2.0 },
  { tier: 5, name: "Champion's Arena",  joinXp: 0,    buyXp: 0,     joinGymfit: 2000, buyGymfit: 50000, monthlyFee: BigInt(2500), multiplier: 3.0 },
];

// POST /api/game/gyms/[id]/upgrade — upgrade a gym to the next tier
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const gym = await prisma.gym.findUnique({
    where: { id },
    select: { id: true, ownerId: true, tier: true, name: true },
  });

  if (!gym) return Response.json({ error: "Gym not found" }, { status: 404 });
  if (gym.ownerId !== session.user.id)
    return Response.json({ error: "Only the gym owner can upgrade" }, { status: 403 });
  if (gym.tier >= 5)
    return Response.json({ error: "Gym is already at max tier" }, { status: 400 });

  const currentTierData = GYM_TIERS[gym.tier - 1];
  const nextTierData = GYM_TIERS[gym.tier]; // 0-indexed, so gym.tier = next tier index

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { currentXp: true, overflowXp: true, offChainTokens: true },
  });

  if (!user) return Response.json({ error: "User not found" }, { status: 404 });

  const totalXp = user.currentXp + user.overflowXp;

  // Determine upgrade cost based on CURRENT tier → NEXT tier
  // Tiers 1→2, 2→3, 3→4 cost XP; 4→5 costs GYMFIT
  const upgradeCostXp = nextTierData.tier <= 3 ? currentTierData.buyXp : 0;
  const upgradeCostGymfit = nextTierData.tier >= 4 ? BigInt(currentTierData.buyGymfit) : BigInt(0);

  // Check affordability
  if (upgradeCostXp > 0 && totalXp < upgradeCostXp) {
    return Response.json(
      { error: `Need ${upgradeCostXp} XP to upgrade. You have ${totalXp}.` },
      { status: 400 }
    );
  }
  if (upgradeCostGymfit > 0n && user.offChainTokens < upgradeCostGymfit) {
    return Response.json(
      { error: `Need ${upgradeCostGymfit} GYMFIT to upgrade.` },
      { status: 400 }
    );
  }

  // Deduct costs — XP from overflow first, then currentXp
  let newOverflow = user.overflowXp;
  let newCurrent = user.currentXp;

  if (upgradeCostXp > 0) {
    if (newOverflow >= upgradeCostXp) {
      newOverflow -= upgradeCostXp;
    } else {
      const remainder = upgradeCostXp - newOverflow;
      newOverflow = 0;
      newCurrent = Math.max(0, newCurrent - remainder);
    }
  }

  const newTokens = user.offChainTokens - upgradeCostGymfit;

  // Apply upgrade in transaction
  const [updatedGym, updatedUser] = await prisma.$transaction([
    prisma.gym.update({
      where: { id },
      data: {
        tier: gym.tier + 1,
        monthlyFee: nextTierData.monthlyFee,
        reputation: { increment: 15 },
        metadata: { tier: gym.tier + 1, tierName: nextTierData.name },
      },
    }),
    prisma.user.update({
      where: { id: session.user.id },
      data: {
        currentXp: newCurrent,
        overflowXp: newOverflow,
        offChainTokens: newTokens,
      },
      select: { currentXp: true, overflowXp: true, offChainTokens: true },
    }),
  ]);

  return Response.json({
    success: true,
    gym: { id: updatedGym.id, tier: updatedGym.tier, name: updatedGym.name },
    newTierName: nextTierData.name,
    user: {
      currentXp: updatedUser.currentXp,
      overflowXp: updatedUser.overflowXp,
      offChainTokens: updatedUser.offChainTokens.toString(),
    },
  });
}
