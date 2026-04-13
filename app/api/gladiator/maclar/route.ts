import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "giriş yap" } },
      { status: 401 }
    );
  }
  const g = await prisma.spotGladiator.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!g) {
    return NextResponse.json({ success: true, data: [] });
  }
  const maclar = await prisma.spotGladiatorMac.findMany({
    where: { gladiatorId: g.id },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true,
      opponentName: true,
      opponentType: true,
      result: true,
      roundsElapsed: true,
      goldEarned: true,
      xpEarned: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ success: true, data: maclar });
}
