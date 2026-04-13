import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureCatalog } from "@/lib/gladiator/helpers";

// Bugünün turnuva rakipleri — 8 rakip seç, seviyeye göre progresif
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
    select: { level: true },
  });
  if (!g) {
    return NextResponse.json(
      { success: false, error: { code: "NO_GLADIATOR", message: "karakter yok" } },
      { status: 404 }
    );
  }

  // Seed: gün + userId → aynı gün aynı rakipler
  const today = new Date().toISOString().slice(0, 10);
  let seed = 0;
  const seedStr = today + session.user.id;
  for (let i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) | 0;
  seed = Math.abs(seed);

  // Havuzdan 8 rakip çek, son olanı boss olsun
  const pool = await prisma.spotDusman.findMany({
    where: {
      isBoss: false,
      levelMin: { lte: g.level + 3 },
      levelMax: { gte: Math.max(1, g.level - 2) },
    },
  });
  const bossPool = await prisma.spotDusman.findMany({
    where: {
      isBoss: true,
      levelMin: { lte: g.level + 3 },
    },
  });

  // deterministic shuffle
  const rng = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const shuffled = [...pool].sort(() => rng() - 0.5);
  const first7 = shuffled.slice(0, 7);
  const finalBoss = bossPool[Math.floor(rng() * bossPool.length)] || shuffled[7];

  const bracket = [...first7, finalBoss].filter(Boolean);

  return NextResponse.json({
    success: true,
    data: {
      bracket,
      rewardGold: 500 + g.level * 50,
      rewardXp: 500 + g.level * 80,
    },
  });
}
