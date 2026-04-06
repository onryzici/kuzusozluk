import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { logAction } from "@/lib/auditLog";

const updateSchema = z.object({
  isBanned: z.boolean().optional(),
  role: z.enum(["CAYLAK", "USER", "AUTHOR", "CO_MOD", "MODERATOR", "ADMIN"]).optional(),
});

type Params = { params: Promise<{ username: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await auth();
  const sessionRole = session?.user?.role;
  if (!session?.user || !["ADMIN", "CO_MOD"].includes(sessionRole as string)) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Yetkiniz yok" } },
      { status: 403 }
    );
  }

  const isCoMod = sessionRole === "CO_MOD";

  const { username } = await params;
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Kullanici bulunamadi" } },
      { status: 404 }
    );
  }

  if (user.id === session.user.id) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Kendinizi duzenleyemezsiniz" } },
      { status: 403 }
    );
  }

  // CO_MOD sadece CAYLAK, USER ve AUTHOR kullanıcıları düzenleyebilir
  if (isCoMod && !["CAYLAK", "USER", "AUTHOR"].includes(user.role)) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "bu kullanıcıyı düzenleme yetkiniz yok" } },
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

  // CO_MOD banlama yapamaz, sadece CAYLAK/AUTHOR arası rol değiştirebilir
  if (isCoMod) {
    if (parsed.data.isBanned !== undefined) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "banlama yetkiniz yok" } },
        { status: 403 }
      );
    }
    if (parsed.data.role && !["CAYLAK", "USER", "AUTHOR"].includes(parsed.data.role)) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "sadece çaylak ve yazar rolleri atayabilirsiniz" } },
        { status: 403 }
      );
    }
  }

  const data: { isBanned?: boolean; role?: "CAYLAK" | "USER" | "AUTHOR" | "CO_MOD" | "MODERATOR" | "ADMIN" } = {};
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

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || null;
  if (parsed.data.isBanned !== undefined) {
    await logAction(parsed.data.isBanned ? "USER_BAN" : "USER_UNBAN", session.user.id, `${username} ${parsed.data.isBanned ? "banlandi" : "ban kaldirildi"}`, ip);
  }
  if (parsed.data.role) {
    await logAction("USER_ROLE_CHANGE", session.user.id, `${username} rolu degistirildi: ${parsed.data.role}`, ip);
  }

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

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || null;
  await logAction("USER_DELETE", session.user.id, `${username} hesabi silindi`, ip);

  return NextResponse.json({ success: true, data: { deleted: true } });
}
