import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// POST /api/oyun/skor — Skor kaydet
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
  const game = typeof body.game === "string" ? body.game : "dino";

  if (score <= 0 || score > 9999999) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_SCORE", message: "Gecersiz skor" } },
      { status: 400 }
    );
  }

  const existing = await prisma.gameScore.findUnique({
    where: { userId_game: { userId, game } },
  });

  if (!existing) {
    await prisma.gameScore.create({ data: { score, userId, game } });
  } else if (score > existing.score) {
    await prisma.gameScore.update({ where: { id: existing.id }, data: { score } });
  }

  return NextResponse.json({
    success: true,
    data: { score, isNewBest: !existing || score > existing.score },
  });
}

// GET /api/oyun/skor — Skor tablosu
export async function GET(request: NextRequest) {
  const game = request.nextUrl.searchParams.get("game") || "dino";

  const scores = await prisma.gameScore.findMany({
    where: { game },
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
