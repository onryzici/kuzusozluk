import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { deleteCache } from "@/lib/redis";

const updateSchema = z.object({
  isLocked: z.boolean().optional(),
  isPinned: z.boolean().optional(),
});

type Params = { params: Promise<{ slug: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Yetkiniz yok" } },
      { status: 403 }
    );
  }

  const { slug } = await params;
  const topic = await prisma.topic.findUnique({ where: { slug } });
  if (!topic) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Baslik bulunamadi" } },
      { status: 404 }
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

  const data: { isLocked?: boolean; isPinned?: boolean } = {};
  if (parsed.data.isLocked !== undefined) data.isLocked = parsed.data.isLocked;
  if (parsed.data.isPinned !== undefined) data.isPinned = parsed.data.isPinned;

  const updated = await prisma.topic.update({
    where: { slug },
    data,
    select: { id: true, title: true, slug: true, isLocked: true, isPinned: true },
  });

  await deleteCache(`baslik:${slug}`);
  await deleteCache("gundem:list");

  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Yetkiniz yok" } },
      { status: 403 }
    );
  }

  const { slug } = await params;
  const topic = await prisma.topic.findUnique({ where: { slug } });
  if (!topic) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Baslik bulunamadi" } },
      { status: 404 }
    );
  }

  // Iliskili entryleri ve oylarini sil
  const entries = await prisma.entry.findMany({
    where: { topicId: topic.id },
    select: { id: true },
  });
  const entryIds = entries.map((e) => e.id);

  await prisma.vote.deleteMany({ where: { entryId: { in: entryIds } } });
  await prisma.favorite.deleteMany({ where: { entryId: { in: entryIds } } });
  await prisma.comment.deleteMany({ where: { entryId: { in: entryIds } } });
  await prisma.report.deleteMany({ where: { entryId: { in: entryIds } } });
  await prisma.entry.deleteMany({ where: { topicId: topic.id } });
  await prisma.topicTag.deleteMany({ where: { topicId: topic.id } });
  await prisma.topic.delete({ where: { slug } });

  await deleteCache(`baslik:${slug}`);
  await deleteCache("gundem:list");

  return NextResponse.json({ success: true, data: { deleted: true } });
}
