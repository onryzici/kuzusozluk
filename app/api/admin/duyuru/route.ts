import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1, "baslik gerekli").max(200),
  content: z.string().min(1, "icerik gerekli"),
  isPinned: z.boolean().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "yetkiniz yok" } },
      { status: 403 }
    );
  }

  const announcements = await prisma.announcement.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { id: true, username: true } },
    },
  });

  return NextResponse.json({ success: true, data: announcements });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "yetkiniz yok" } },
      { status: 403 }
    );
  }

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues?.[0]?.message || "gecersiz veri";
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message } },
      { status: 400 }
    );
  }

  const announcement = await prisma.announcement.create({
    data: {
      title: parsed.data.title,
      content: parsed.data.content,
      isPinned: parsed.data.isPinned ?? false,
      authorId: session.user.id,
    },
    include: {
      author: { select: { id: true, username: true } },
    },
  });

  return NextResponse.json({ success: true, data: announcement }, { status: 201 });
}
