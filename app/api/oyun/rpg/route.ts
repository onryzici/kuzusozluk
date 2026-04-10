import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/oyun/rpg — Karakteri yukle (kendi save'i + leaderboard)
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Giris yapmalisiniz" } },
      { status: 401 }
    );
  }

  const userId = (session.user as any).id as string;

  const [save, leaderboard] = await Promise.all([
    prisma.rpgSave.findUnique({ where: { userId } }),
    prisma.rpgSave.findMany({
      orderBy: [{ bossesKilled: "desc" }, { level: "desc" }, { totalKills: "desc" }],
      take: 20,
      include: { user: { select: { username: true, avatarUrl: true } } },
    }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      save: save ? { ...save, data: save.data } : null,
      leaderboard: leaderboard.map((s) => ({
        username: s.user.username,
        avatarUrl: s.user.avatarUrl,
        charName: s.charName,
        level: s.level,
        bossesKilled: s.bossesKilled,
        totalKills: s.totalKills,
      })),
    },
  });
}

// POST /api/oyun/rpg — Karakteri kaydet (yeni veya guncelle)
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

  const charName = String(body.charName || "kahraman").slice(0, 30);
  const level = Math.max(1, Math.min(99, parseInt(body.level) || 1));
  const bossesKilled = Math.max(0, Math.min(5, parseInt(body.bossesKilled) || 0));
  const totalKills = Math.max(0, Math.min(99999, parseInt(body.totalKills) || 0));
  const data = body.data;

  if (!data || typeof data !== "object") {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_DATA", message: "Gecersiz save verisi" } },
      { status: 400 }
    );
  }

  // JSON boyut limiti (50KB)
  if (JSON.stringify(data).length > 50000) {
    return NextResponse.json(
      { success: false, error: { code: "DATA_TOO_LARGE", message: "Save cok buyuk" } },
      { status: 400 }
    );
  }

  const save = await prisma.rpgSave.upsert({
    where: { userId },
    create: { userId, charName, level, bossesKilled, totalKills, data },
    update: { charName, level, bossesKilled, totalKills, data },
  });

  return NextResponse.json({ success: true, data: { id: save.id } });
}

// DELETE /api/oyun/rpg — Karakteri sil (yeniden basla)
export async function DELETE() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Giris yapmalisiniz" } },
      { status: 401 }
    );
  }

  const userId = (session.user as any).id as string;
  await prisma.rpgSave.deleteMany({ where: { userId } });

  return NextResponse.json({ success: true, data: null });
}
