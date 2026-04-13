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
    select: { level: true },
  });
  if (!g) {
    return NextResponse.json(
      { success: false, error: { code: "NO_GLADIATOR", message: "önce karakter yarat" } },
      { status: 404 }
    );
  }

  const dusmanlar = await prisma.spotDusman.findMany({
    where: {
      levelMin: { lte: g.level + 2 },
      levelMax: { gte: Math.max(1, g.level - 2) },
    },
    orderBy: [{ isBoss: "asc" }, { tier: "asc" }, { levelMin: "asc" }],
  });

  return NextResponse.json({ success: true, data: dusmanlar });
}
