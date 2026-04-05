import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  isBanned: z.boolean().optional(),
  role: z.enum(["CAYLAK", "USER", "AUTHOR", "MODERATOR", "ADMIN"]).optional(),
});

type Params = { params: Promise<{ username: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Yetkiniz yok" } },
      { status: 403 }
    );
  }

  const { username } = await params;
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Kullanici bulunamadi" } },
      { status: 404 }
    );
  }

  // Admin kendini banlayamasin
  if (user.id === session.user.id) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Kendinizi duzenleyemezsiniz" } },
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

  const data: { isBanned?: boolean; role?: "CAYLAK" | "USER" | "AUTHOR" | "MODERATOR" | "ADMIN" } = {};
  if (parsed.data.isBanned !== undefined) data.isBanned = parsed.data.isBanned;
  if (parsed.data.role !== undefined) data.role = parsed.data.role;

  const updated = await prisma.user.update({
    where: { username },
    data,
    select: {
      id: true,
      username: true,
      role: true,
      isBanned: true,
    },
  });

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

  const { username } = await params;
  const user = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "kullanıcı bulunamadı" } },
      { status: 404 }
    );
  }

  if (user.id === session.user.id) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "kendinizi silemezsiniz" } },
      { status: 403 }
    );
  }

  // kullanıcının tüm entry id'lerini bul
  const entryIds = (await prisma.entry.findMany({
    where: { authorId: user.id },
    select: { id: true },
  })).map((e) => e.id);

  await prisma.$transaction([
    prisma.notification.deleteMany({ where: { OR: [{ userId: user.id }, { actorId: user.id }] } }),
    prisma.topicDraft.deleteMany({ where: { authorId: user.id } }),
    prisma.pollVote.deleteMany({ where: { userId: user.id } }),
    prisma.poll.deleteMany({ where: { authorId: user.id } }),
    prisma.block.deleteMany({ where: { OR: [{ blockerId: user.id }, { blockedId: user.id }] } }),
    prisma.ukde.deleteMany({ where: { OR: [{ authorId: user.id }, { claimedById: user.id }] } }),
    prisma.topicFollow.deleteMany({ where: { userId: user.id } }),
    prisma.report.deleteMany({ where: { OR: [{ reporterId: user.id }, { entryId: { in: entryIds } }] } }),
    prisma.comment.deleteMany({ where: { OR: [{ authorId: user.id }, { entryId: { in: entryIds } }] } }),
    prisma.vote.deleteMany({ where: { OR: [{ userId: user.id }, { entryId: { in: entryIds } }] } }),
    prisma.favorite.deleteMany({ where: { OR: [{ userId: user.id }, { entryId: { in: entryIds } }] } }),
    prisma.follow.deleteMany({ where: { OR: [{ followerId: user.id }, { followingId: user.id }] } }),
    prisma.message.deleteMany({ where: { OR: [{ senderId: user.id }, { receiverId: user.id }] } }),
    prisma.emailToken.deleteMany({ where: { userId: user.id } }),
    prisma.entry.deleteMany({ where: { authorId: user.id } }),
    prisma.user.delete({ where: { id: user.id } }),
  ]);

  return NextResponse.json({ success: true, data: { deleted: true } });
}
