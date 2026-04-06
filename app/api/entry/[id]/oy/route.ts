import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { checkRateLimit, rateLimiters } from "@/lib/ratelimit";
import { createNotification } from "@/lib/notifications";
import { checkBanned } from "@/lib/utils/banCheck";

const oySchema = z.object({
  type: z.enum(["UP", "DOWN"]),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Giriş yapmalısınız" } },
      { status: 401 }
    );
  }

  const banned = await checkBanned(session.user.id);
  if (banned) return banned;

  const { allowed } = await checkRateLimit(rateLimiters.oyVer, session.user.id);
  if (!allowed) {
    return NextResponse.json(
      { success: false, error: { code: "RATE_LIMITED", message: "Cok fazla istek gonderdiniz" } },
      { status: 429 }
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

  const body = await request.json();
  const parsed = oySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Geçersiz oy tipi" } },
      { status: 400 }
    );
  }

  const { type } = parsed.data;
  const existing = await prisma.vote.findUnique({
    where: { userId_entryId: { userId: session.user.id, entryId: id } },
  });

  if (existing) {
    if (existing.type === type) {
      // Aynı oya tıklandı → geri çek
      await prisma.vote.delete({ where: { id: existing.id } });
      const field = type === "UP" ? "upvotes" : "downvotes";
      const updated = await prisma.entry.update({
        where: { id },
        data: { [field]: { decrement: 1 } },
        select: { upvotes: true, downvotes: true },
      });
      // Upvote geri cekildi -> karma -1
      if (type === "UP") {
        await prisma.user.update({
          where: { id: entry.authorId },
          data: { karma: { decrement: 1 } },
        });
      }
      return NextResponse.json({ success: true, data: { ...updated, userVote: null } });
    } else {
      // Oy değiştiriliyor (UP->DOWN veya DOWN->UP)
      const wasUpvote = existing.type === "UP";
      await prisma.vote.update({ where: { id: existing.id }, data: { type } });
      const updated = await prisma.entry.update({
        where: { id },
        data: {
          upvotes: type === "UP" ? { increment: 1 } : { decrement: 1 },
          downvotes: type === "DOWN" ? { increment: 1 } : { decrement: 1 },
        },
        select: { upvotes: true, downvotes: true },
      });
      // Oy degistirme: UP->DOWN ise karma -1, DOWN->UP ise karma +1
      if (wasUpvote) {
        await prisma.user.update({
          where: { id: entry.authorId },
          data: { karma: { decrement: 1 } },
        });
      } else {
        await prisma.user.update({
          where: { id: entry.authorId },
          data: { karma: { increment: 1 } },
        });
      }
      return NextResponse.json({ success: true, data: { ...updated, userVote: type } });
    }
  }

  // Yeni oy
  await prisma.vote.create({
    data: { type, userId: session.user.id, entryId: id },
  });
  const field = type === "UP" ? "upvotes" : "downvotes";
  const updated = await prisma.entry.update({
    where: { id },
    data: { [field]: { increment: 1 } },
    select: { upvotes: true, downvotes: true },
  });
  // Yeni upvote -> karma +1
  if (type === "UP") {
    await prisma.user.update({
      where: { id: entry.authorId },
      data: { karma: { increment: 1 } },
    });
  }

  // Notify entry author on new upvote only
  if (type === "UP" && entry.authorId !== session.user.id) {
    await createNotification({
      type: "VOTE",
      content: "entry'niz begenildi",
      link: `/entry/${id}`,
      userId: entry.authorId,
      actorId: session.user.id,
    });
  }

  return NextResponse.json({ success: true, data: { ...updated, userVote: type } });
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
  const existing = await prisma.vote.findUnique({
    where: { userId_entryId: { userId: session.user.id, entryId: id } },
  });

  if (!existing) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Oy bulunamadı" } },
      { status: 404 }
    );
  }

  await prisma.vote.delete({ where: { id: existing.id } });
  const field = existing.type === "UP" ? "upvotes" : "downvotes";

  const entry = await prisma.entry.update({
    where: { id },
    data: { [field]: { decrement: 1 } },
    select: { upvotes: true, downvotes: true, authorId: true },
  });

  // Upvote kaldirildi -> karma -1
  if (existing.type === "UP") {
    await prisma.user.update({
      where: { id: entry.authorId },
      data: { karma: { decrement: 1 } },
    });
  }

  return NextResponse.json({ success: true, data: { upvotes: entry.upvotes, downvotes: entry.downvotes, userVote: null } });
}
