import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { PlanType } from "@prisma/client";

// GET /api/game/plans — list all system workout plans
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

// POST /api/game/plans — look up (or create) a plan by type
// The plan is linked to workouts at workout-time, not stored on the character
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { type, name } = body as { characterId?: string; type?: string; name?: string };

  if (!type) {
    return Response.json({ error: "type is required" }, { status: 400 });
  }

  // Validate enum value
  const validTypes = Object.values(PlanType) as string[];
  if (!validTypes.includes(type)) {
    return Response.json(
      { error: `Invalid plan type. Must be one of: ${validTypes.join(", ")}` },
      { status: 400 }
    );
  }

  const planType = type as PlanType;

  try {
    // Find existing system plan first
    let plan = await prisma.workoutPlan.findFirst({
      where: { type: planType, isSystem: true },
    });

    // Fall back to creating a user-specific plan
    if (!plan) {
      plan = await prisma.workoutPlan.create({
        data: {
          name: name ?? type,
          type: planType,
          isSystem: false,
          createdBy: session.user.id,
        },
      });
    }

    return Response.json({ plan }, { status: 200 });
  } catch (err) {
    console.error("[plans API] Error:", err);
    return Response.json({ error: "Failed to find/create plan" }, { status: 500 });
  }
}
