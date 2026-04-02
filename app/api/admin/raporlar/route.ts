import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["REVIEWED", "DISMISSED"]),
});

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
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("boyut") || "20")));
  const status = searchParams.get("durum") || "PENDING";

  const where = status === "ALL" ? {} : { status: status as "PENDING" | "REVIEWED" | "DISMISSED" };

  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        reporter: { select: { id: true, username: true } },
        entry: {
          select: {
            id: true,
            content: true,
            author: { select: { id: true, username: true } },
            topic: { select: { slug: true, title: true } },
          },
        },
      },
    }),
    prisma.report.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: reports,
    meta: { total, page, pageSize, hasMore: page * pageSize < total },
  });
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Yetkiniz yok" } },
      { status: 403 }
    );
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues?.[0]?.message || "Gecersiz veri";
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message } },
      { status: 400 }
    );
  }

  const report = await prisma.report.findUnique({ where: { id: parsed.data.id } });
  if (!report) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Rapor bulunamadi" } },
      { status: 404 }
    );
  }

  const updated = await prisma.report.update({
    where: { id: parsed.data.id },
    data: { status: parsed.data.status },
  });

  return NextResponse.json({ success: true, data: updated });
}
