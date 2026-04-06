import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { entryGuncelleSchema } from "@/lib/validations/entry";
import { lowercasePreserveLinks } from "@/lib/utils/lowercasePreserveLinks";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const entry = await prisma.entry.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, username: true, avatarUrl: true } },
      topic: { select: { id: true, title: true, slug: true } },
    },
  });

  if (!entry) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Entry bulunamadı" } },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: entry });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Giriş yapmalısınız" } },
      { status: 401 }
    );
  }

  const { id } = await params;
  const entry = await prisma.entry.findUnique({ where: { id } });
  if (!entry) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Entry bulunamadı" } },
      { status: 404 }
    );
  }

  if (entry.authorId !== session.user.id && session.user.role !== "ADMIN" && session.user.role !== "MODERATOR") {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Bu işlem için yetkiniz yok" } },
      { status: 403 }
    );
  }

  const body = await request.json();
  const parsed = entryGuncelleSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues?.[0]?.message || "Geçersiz veri";
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message } },
      { status: 400 }
    );
  }

  const updated = await prisma.entry.update({
    where: { id },
    data: { content: lowercasePreserveLinks(parsed.data.content), isEdited: true },
    include: {
      author: { select: { id: true, username: true, avatarUrl: true } },
    },
  });

  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Giriş yapmalısınız" } },
      { status: 401 }
    );
  }

  const { id } = await params;
  const entry = await prisma.entry.findUnique({ where: { id } });
  if (!entry) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Entry bulunamadı" } },
      { status: 404 }
    );
  }

  if (entry.authorId !== session.user.id && session.user.role !== "ADMIN" && session.user.role !== "MODERATOR") {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Bu işlem için yetkiniz yok" } },
      { status: 403 }
    );
  }

  // ilişkili verileri temizle sonra entry'yi sil
  try {
    await prisma.$transaction([
      prisma.vote.deleteMany({ where: { entryId: id } }),
      prisma.favorite.deleteMany({ where: { entryId: id } }),
      prisma.comment.deleteMany({ where: { entryId: id } }),
      prisma.report.deleteMany({ where: { entryId: id } }),
      prisma.entry.delete({ where: { id } }),
    ]);

    const updatedTopic = await prisma.topic.update({
      where: { id: entry.topicId },
      data: { entryCount: { decrement: 1 } },
      select: { id: true, entryCount: true },
    });

    // başlıkta hiç entry kalmadıysa başlığı da sil
    if (updatedTopic.entryCount <= 0) {
      await prisma.topicFollow.deleteMany({ where: { topicId: updatedTopic.id } });
      await prisma.topic.delete({ where: { id: updatedTopic.id } });
    } else {
      // son kalan entry'nin tarihine göre başlığın updatedAt'ini güncelle
      const lastEntry = await prisma.entry.findFirst({
        where: { topicId: entry.topicId },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      });
      if (lastEntry) {
        await prisma.topic.update({
          where: { id: entry.topicId },
          data: { updatedAt: lastEntry.createdAt },
        });
      }
    }

    await prisma.user.update({
      where: { id: entry.authorId },
      data: { entryCount: { decrement: 1 } },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message: "entry silinemedi" } },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data: { id } });
}
