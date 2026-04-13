import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { deleteCache } from "@/lib/redis";
import { toSlug } from "@/lib/utils/slug";
import { sanitizeInput } from "@/lib/utils/security";

const updateSchema = z.object({
  isLocked: z.boolean().optional(),
  isPinned: z.boolean().optional(),
  title: z.string().min(3).max(200).optional(),
});

type Params = { params: Promise<{ slug: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user || !["ADMIN", "MODERATOR", "CO_MOD"].includes(role as string)) {
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

  const data: { isLocked?: boolean; isPinned?: boolean; title?: string; slug?: string } = {};
  if (parsed.data.isLocked !== undefined) data.isLocked = parsed.data.isLocked;
  if (parsed.data.isPinned !== undefined) data.isPinned = parsed.data.isPinned;

  if (parsed.data.title !== undefined) {
    const newTitle = sanitizeInput(parsed.data.title).toLowerCase();

    // aynı isimde başka başlık var mı kontrol et
    const existingTitle = await prisma.topic.findFirst({
      where: { title: newTitle, slug: { not: slug } },
    });
    if (existingTitle) {
      return NextResponse.json(
        { success: false, error: { code: "TITLE_EXISTS", message: "bu isimde bir başlık zaten var" } },
        { status: 409 }
      );
    }

    let newSlug = toSlug(newTitle);
    let suffix = 1;
    let slugExists = await prisma.topic.findFirst({
      where: { slug: newSlug, id: { not: undefined } },
    });
    // mevcut slug ile aynıysa sorun yok
    if (newSlug !== slug) {
      const currentTopic = await prisma.topic.findUnique({ where: { slug }, select: { id: true } });
      slugExists = await prisma.topic.findFirst({
        where: { slug: newSlug, id: { not: currentTopic?.id } },
      });
      while (slugExists) {
        suffix++;
        newSlug = `${toSlug(newTitle)}-${suffix}`;
        slugExists = await prisma.topic.findFirst({
          where: { slug: newSlug, id: { not: currentTopic?.id } },
        });
      }
    }

    data.title = newTitle;
    data.slug = newSlug;
  }

  const updated = await prisma.topic.update({
    where: { slug },
    data,
    select: { id: true, title: true, slug: true, isLocked: true, isPinned: true },
  });

  await deleteCache(`baslik:${slug}`);
  if (data.slug && data.slug !== slug) {
    await deleteCache(`baslik:${data.slug}`);
    await deleteCache("gundem:list");
  }
  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user || !["ADMIN", "MODERATOR", "CO_MOD"].includes(role as string)) {
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

  // anket id'lerini ve option id'lerini bul
  const pollIds = (await prisma.poll.findMany({
    where: { topicId: topic.id },
    select: { id: true },
  })).map((p) => p.id);

  const optionIds = pollIds.length > 0
    ? (await prisma.pollOption.findMany({
        where: { pollId: { in: pollIds } },
        select: { id: true },
      })).map((o) => o.id)
    : [];

  // tek transaction ile hepsini sil
  await prisma.$transaction([
    prisma.notification.deleteMany({ where: { link: { contains: slug } } }),
    // anket verilerini sil
    ...(optionIds.length > 0 ? [prisma.pollVote.deleteMany({ where: { optionId: { in: optionIds } } })] : []),
    ...(pollIds.length > 0 ? [prisma.pollOption.deleteMany({ where: { pollId: { in: pollIds } } })] : []),
    ...(pollIds.length > 0 ? [prisma.poll.deleteMany({ where: { topicId: topic.id } })] : []),
    // entry verilerini sil
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
