import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

// GET /api/bildirim — List notifications for current user
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

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        actor: {
          select: { id: true, username: true, avatarUrl: true },
        },
      },
    }),
    prisma.notification.count({
      where: { userId, isRead: false },
    }),
  ]);

  return NextResponse.json({
    success: true,
    data: { notifications, unreadCount },
  });
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

  return NextResponse.json({ success: true, data: { updated: true } });
}
