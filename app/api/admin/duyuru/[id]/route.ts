import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
  isPinned: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "yetkiniz yok" } },
      { status: 403 }
    );
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues?.[0]?.message || "gecersiz veri";
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message } },
      { status: 400 }
    );
  }

  const existing = await prisma.announcement.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "duyuru bulunamadi" } },
      { status: 404 }
    );
  }

  const updated = await prisma.announcement.update({
    where: { id },
    data: parsed.data,
    include: {
      author: { select: { id: true, username: true } },
    },
  });

  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "yetkiniz yok" } },
      { status: 403 }
    );
  }

  const { id } = await params;

  const existing = await prisma.announcement.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "duyuru bulunamadi" } },
      { status: 404 }
    );
  }

  await prisma.announcement.delete({ where: { id } });

  return NextResponse.json({ success: true, data: { id } });
}
