import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { getCache, setCache, deleteCache } from "@/lib/redis";

// GET /api/bildirim — List notifications for current user (son 2 gün)
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Giris yapmalisiniz" } },
      { status: 401 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userId = (session.user as any).id as string;

  // 15 saniye cache
  const cacheKey = `bildirim:${userId}`;
  const cached = await getCache<{ notifications: unknown[]; unreadCount: number }>(cacheKey);
  if (cached) {
    return NextResponse.json({ success: true, data: cached });
  }

  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId, createdAt: { gte: twoDaysAgo } },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        actor: {
          select: { id: true, username: true, avatarUrl: true },
        },
      },
    }),
    prisma.notification.count({
      where: { userId, isRead: false, createdAt: { gte: twoDaysAgo } },
    }),
  ]);

  const result = { notifications, unreadCount };
  await setCache(cacheKey, result, 15);

  // arka planda eski bildirimleri temizle (fire-and-forget)
  prisma.notification.deleteMany({
    where: { userId, createdAt: { lt: twoDaysAgo } },
  }).catch(() => {});

  return NextResponse.json({ success: true, data: result });
}

const patchSchema = z.object({
  ids: z.array(z.string()).optional(),
  markAllRead: z.boolean().optional(),
});

// PATCH /api/bildirim — Mark notifications as read
export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Giris yapmalisiniz" } },
      { status: 401 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userId = (session.user as any).id as string;

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Gecersiz veri" } },
      { status: 400 }
    );
  }

  const { ids, markAllRead } = parsed.data;

  if (markAllRead) {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  } else if (ids && ids.length > 0) {
    await prisma.notification.updateMany({
      where: { id: { in: ids }, userId },
      data: { isRead: true },
    });
  }

  // cache'i temizle
  deleteCache(`bildirim:${userId}`).catch(() => {});

  return NextResponse.json({ success: true, data: { updated: true } });
}
