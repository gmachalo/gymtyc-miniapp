import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";

// PATCH /api/game/mode — switch between SOLO and SOCIAL
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { mode } = body as { mode: "SOLO" | "SOCIAL" };

  if (!["SOLO", "SOCIAL"].includes(mode))
    return Response.json({ error: "Invalid mode" }, { status: 400 });

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { mode },
    select: { id: true, mode: true },
  });

  return Response.json({ user });
}
