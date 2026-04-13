import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/auditLog";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "yetkiniz yok" } },
      { status: 403 }
    );
  }

  const res = await prisma.user.updateMany({
    where: { role: "AUTHOR" },
    data: { role: "USER" },
  });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || null;
  await logAction(
    "AUTHOR_PURGE",
    session.user.id,
    `${res.count} author rolu user'a cevrildi`,
    ip
  );

  return NextResponse.json({ success: true, data: { converted: res.count } });
}
