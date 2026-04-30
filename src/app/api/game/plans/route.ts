import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";

// GET /api/game/plans — get all workout plans
export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const plans = await prisma.workoutPlan.findMany({
    where: { isSystem: true },
    orderBy: { name: "asc" },
  });

  return Response.json({ plans });
}

// POST /api/game/plans — assign plan to character
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { characterId, type, name } = body as { characterId: string; type?: string; name?: string };

  if (!characterId) {
    return Response.json({ error: "characterId is required" }, { status: 400 });
  }

  // Verify character belongs to user
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: { userId: true },
  });

  if (!character || character.userId !== session.user.id) {
    return Response.json({ error: "Character not found" }, { status: 404 });
  }

  try {
    // Try to find existing plan or create one
    let plan = null;
    
    if (type) {
      plan = await prisma.workoutPlan.findFirst({
        where: { type, isSystem: true },
      });

      // If not found and we have name, create a custom plan
      if (!plan) {
        plan = await prisma.workoutPlan.create({
          data: {
            name: name || type,
            type,
            isSystem: false,
            userId: session.user.id,
          },
        });
      }
    }

    // Assign plan to character if found
    if (plan) {
      const updated = await prisma.character.update({
        where: { id: characterId },
        data: { activePlanId: plan.id },
      });
      return Response.json({ plan, character: updated }, { status: 200 });
    }

    return Response.json({ message: "Plan assignment skipped" }, { status: 200 });
  } catch (err) {
    console.error("[plans API] Error:", err);
    return Response.json({ error: "Failed to assign plan" }, { status: 500 });
  }
}
