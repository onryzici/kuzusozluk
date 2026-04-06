import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Yetkiniz yok" } },
      { status: 403 }
    );
  }

  const { searchParams } = request.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("sayfa") || "1"));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("boyut") || "50")));
  const action = searchParams.get("action") || undefined;
  const username = searchParams.get("username") || undefined;

  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

  const where: Record<string, unknown> = {
    createdAt: { gte: twoDaysAgo },
  };
  if (action) where.action = action;
  if (username) where.user = { username };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: {
          select: { username: true, role: true },
        },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  // arka planda 2 günden eski logları temizle
  prisma.auditLog.deleteMany({
    where: { createdAt: { lt: twoDaysAgo } },
  }).catch(() => {});

  return NextResponse.json({
    success: true,
    data: logs,
    meta: { total, page, pageSize, hasMore: page * pageSize < total },
  });
}
