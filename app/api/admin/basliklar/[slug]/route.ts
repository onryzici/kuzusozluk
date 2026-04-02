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
      { success: false, error: { code: "FORBIDDEN", message: "yetkiniz yok" } },
      { status: 403 }
    );
  }

  const { slug } = await params;
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "geçersiz veri" } },
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
  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "yetkiniz yok" } },
      { status: 403 }
    );
  }

  const { slug } = await params;
  const topic = await prisma.topic.findUnique({ where: { slug }, select: { id: true } });
  if (!topic) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "başlık bulunamadı" } },
      { status: 404 }
    );
  }

  const entryIds = (await prisma.entry.findMany({
    where: { topicId: topic.id },
    select: { id: true },
  })).map((e) => e.id);

  // tek transaction ile hepsini sil
  await prisma.$transaction([
    prisma.notification.deleteMany({ where: { link: { contains: slug } } }),
    prisma.vote.deleteMany({ where: { entryId: { in: entryIds } } }),
    prisma.favorite.deleteMany({ where: { entryId: { in: entryIds } } }),
    prisma.comment.deleteMany({ where: { entryId: { in: entryIds } } }),
    prisma.report.deleteMany({ where: { entryId: { in: entryIds } } }),
    prisma.entry.deleteMany({ where: { topicId: topic.id } }),
    prisma.topicFollow.deleteMany({ where: { topicId: topic.id } }),
    prisma.topicTag.deleteMany({ where: { topicId: topic.id } }),
    prisma.topic.delete({ where: { id: topic.id } }),
  ]);

  await deleteCache(`baslik:${slug}`);
  await deleteCache("gundem:list");

  return NextResponse.json({ success: true, data: { deleted: true } });
}
