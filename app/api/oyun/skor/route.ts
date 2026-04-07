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

  if (score <= 0 || score > 99999) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_SCORE", message: "Gecersiz skor" } },
      { status: 400 }
    );
  }

  await prisma.gameScore.create({
    data: { score, userId },
  });

  return NextResponse.json({ success: true, data: { score } });
}

// GET /api/oyun/skor — Skor tablosu
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tip = url.searchParams.get("tip") || "en-yuksek";

  if (tip === "en-yuksek") {
    // Her kullanıcının en yüksek skoru
    const scores = await prisma.$queryRaw<
      { username: string; avatarUrl: string | null; maxScore: number; playCount: number }[]
    >`
      SELECT u.username, u."avatarUrl",
             MAX(g.score) as "maxScore",
             COUNT(g.id)::int as "playCount"
      FROM "GameScore" g
      JOIN "User" u ON u.id = g."userId"
      GROUP BY u.id, u.username, u."avatarUrl"
      ORDER BY "maxScore" DESC
      LIMIT 20
    `;

    return NextResponse.json({ success: true, data: scores });
  }

  if (tip === "son") {
    // Son oyunlar
    const scores = await prisma.gameScore.findMany({
      orderBy: { createdAt: "desc" },
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
        createdAt: s.createdAt,
      })),
    });
  }

  return NextResponse.json(
    { success: false, error: { code: "INVALID_TIP", message: "Gecersiz tip" } },
    { status: 400 }
  );
}
