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
