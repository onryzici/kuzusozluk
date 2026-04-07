import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// POST /api/oyun/skor — Skor kaydet (sadece kişisel en yüksek skordan yüksekse güncelle)
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Giris yapmalisiniz" } },
      { status: 401 }
    );
  }

  const userId = (session.user as any).id as string;

  const body = await request.json();
  const score = typeof body.score === "number" ? Math.floor(body.score) : 0;

  if (score <= 0 || score > 99999) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_SCORE", message: "Gecersiz skor" } },
      { status: 400 }
    );
  }

  // Mevcut skoru kontrol et, sadece daha yüksekse güncelle
  const existing = await prisma.gameScore.findUnique({ where: { userId } });

  if (!existing) {
    await prisma.gameScore.create({ data: { score, userId } });
  } else if (score > existing.score) {
    await prisma.gameScore.update({ where: { userId }, data: { score } });
  }

  return NextResponse.json({ success: true, data: { score, isNewBest: !existing || score > existing.score } });
}

// GET /api/oyun/skor — Skor tablosu (herkesin en yüksek skoru)
export async function GET() {
  const scores = await prisma.gameScore.findMany({
    orderBy: { score: "desc" },
    take: 20,
    include: {
      user: { select: { username: true, avatarUrl: true } },
    },
  });

  return NextResponse.json({
    success: true,
    data: scores.map((s) => ({
      username: s.user.username,
      avatarUrl: s.user.avatarUrl,
      score: s.score,
      updatedAt: s.updatedAt,
    })),
  });
}
