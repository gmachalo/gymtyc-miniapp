import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { getDailyFitnessSummary } from "@/lib/fitness/adapter";

// POST /api/fitness/sync — Pull today's data from mock adapter and save it
export async function POST(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const today = new Date();
  const dateStr = today.toISOString().split("T")[0];

  // Check if already synced today
  const existing = await prisma.fitnessSync.findUnique({
    where: { userId_syncDate: { userId, syncDate: new Date(dateStr) } },
  });
  if (existing?.applied) {
    return Response.json({
      message: "Already synced today",
      sync: existing,
    });
  }

  const summary = await getDailyFitnessSummary(userId, today);

  const sync = await prisma.fitnessSync.upsert({
    where: { userId_syncDate: { userId, syncDate: new Date(dateStr) } },
    create: {
      userId,
      syncDate: new Date(dateStr),
      durationMins: summary.durationMins,
      intensity: summary.intensity,
      adherencePct: summary.adherencePct,
      streakCount: summary.streakCount,
      fitnessBoost: summary.fitnessBoost,
      applied: false,
    },
    update: {
      durationMins: summary.durationMins,
      intensity: summary.intensity,
      adherencePct: summary.adherencePct,
      streakCount: summary.streakCount,
      fitnessBoost: summary.fitnessBoost,
    },
  });

  return Response.json({ sync, summary });
}

// GET /api/fitness/sync — Get last sync status
export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const latestSync = await prisma.fitnessSync.findFirst({
    where: { userId },
    orderBy: { syncDate: "desc" },
  });

  return Response.json({ sync: latestSync });
}
