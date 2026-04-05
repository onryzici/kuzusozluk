import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user || !["ADMIN", "CO_MOD"].includes(role as string)) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Yetkiniz yok" } },
      { status: 403 }
    );
  }

  const isCoMod = role === "CO_MOD";

  const { searchParams } = request.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("sayfa") || "1"));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("boyut") || "20")));
  const search = searchParams.get("q") || "";

  // CO_MOD sadece CAYLAK, USER ve AUTHOR görebilir
  const roleFilter = isCoMod
    ? { role: { in: ["CAYLAK" as const, "USER" as const, "AUTHOR" as const] } }
    : {};

  const where = {
    ...roleFilter,
    ...(search
      ? {
          OR: [
            { username: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        isBanned: true,
        karma: true,
        entryCount: true,
        createdAt: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: users,
    meta: { total, page, pageSize, hasMore: page * pageSize < total },
  });
}
