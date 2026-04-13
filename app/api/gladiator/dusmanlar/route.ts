import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureCatalog } from "@/lib/gladiator/helpers";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "giriş yap" } },
      { status: 401 }
    );
  }

  await ensureCatalog();

  const g = await prisma.spotGladiator.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!g) {
    return NextResponse.json(
      { success: false, error: { code: "NO_GLADIATOR", message: "önce karakter yarat" } },
      { status: 404 }
    );
  }

  // tüm düşmanlar — kullanıcı kendi seviyesine göre seçer (level gate YOK)
  const dusmanlar = await prisma.spotDusman.findMany({
    orderBy: [{ isBoss: "asc" }, { tier: "asc" }, { levelMin: "asc" }],
  });

  // her rakip için bugünkü dövüş sayısını ekle
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const maclar = await prisma.spotGladiatorMac.groupBy({
    by: ["opponentRef"],
    where: {
      gladiatorId: g.id,
      opponentType: { in: ["ARENA", "BOSS"] },
      createdAt: { gte: start },
    },
    _count: true,
  });
  const countMap = new Map(maclar.map((m) => [m.opponentRef, m._count]));

  const data = dusmanlar.map((d) => ({
    ...d,
    todayCount: countMap.get(d.slug) ?? 0,
    fightsRemaining: Math.max(0, 3 - (countMap.get(d.slug) ?? 0)),
  }));

  return NextResponse.json({ success: true, data });
}
