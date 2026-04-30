import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";

// GET /api/game/character — Get active character
export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const character = await prisma.character.findFirst({
    where: { userId: session.user.id, isActive: true },
  });

  return Response.json({ character });
}

// POST /api/game/character — Create a character
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, bodyType } = body as { name: string; bodyType: "SKINNY" | "AVERAGE" | "OVERWEIGHT" };

  if (!name || !bodyType)
    return Response.json({ error: "name and bodyType are required" }, { status: 400 });

  const validTypes = ["SKINNY", "AVERAGE", "OVERWEIGHT"];
  if (!validTypes.includes(bodyType))
    return Response.json({ error: "Invalid bodyType" }, { status: 400 });

  // Deactivate any existing characters
  await prisma.character.updateMany({
    where: { userId: session.user.id, isActive: true },
    data: { isActive: false },
  });

  // Random starting stats based on body type
  const baseStats: Record<string, Record<string, number>> = {
    SKINNY:     { strength: 6,  stamina: 12, discipline: 10, metabolism: 14 },
    AVERAGE:    { strength: 10, stamina: 10, discipline: 10, metabolism: 10 },
    OVERWEIGHT: { strength: 14, stamina: 6,  discipline: 8,  metabolism: 6  },
  };
  const stats = baseStats[bodyType];

  const character = await prisma.character.create({
    data: {
      userId: session.user.id,
      name,
      bodyType,
      ...stats,
      isActive: true,
    },
  });

  return Response.json({ character }, { status: 201 });
}
