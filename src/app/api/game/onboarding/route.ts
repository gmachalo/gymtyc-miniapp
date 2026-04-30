import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";

// POST /api/game/onboarding — mark onboarding complete
export async function POST(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { onboardingDone: true },
    select: { id: true, onboardingDone: true },
  });

  return Response.json({ user });
}
