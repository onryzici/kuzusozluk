import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { logAction } from "@/lib/auditLog";
import { banIpsForUser, unbanIpsForUser } from "@/lib/utils/ipBan";
import { redis } from "@/lib/redis";

const updateSchema = z.object({
  isBanned: z.boolean().optional(),
  role: z.enum(["CAYLAK", "USER", "AUTHOR", "CO_MOD", "MODERATOR", "ADMIN"]).optional(),
  banIp: z.boolean().optional(),
  purgeContent: z.boolean().optional(),
  banReason: z.string().max(500).optional(),
});

type Params = { params: Promise<{ username: string }> };

async function purgeUserContent(userId: string) {
  const entryIds = (
    await prisma.entry.findMany({ where: { authorId: userId }, select: { id: true } })
  ).map((e) => e.id);

  await prisma.$transaction([
    prisma.notification.deleteMany({ where: { OR: [{ userId }, { actorId: userId }] } }),
    prisma.topicDraft.deleteMany({ where: { authorId: userId } }),
    prisma.pollVote.deleteMany({ where: { userId } }),
    prisma.poll.deleteMany({ where: { authorId: userId } }),
    prisma.ukde.deleteMany({ where: { OR: [{ authorId: userId }, { claimedById: userId }] } }),
    prisma.topicFollow.deleteMany({ where: { userId } }),
    prisma.report.deleteMany({ where: { OR: [{ reporterId: userId }, { entryId: { in: entryIds } }] } }),
    prisma.comment.deleteMany({ where: { OR: [{ authorId: userId }, { entryId: { in: entryIds } }] } }),
    prisma.vote.deleteMany({ where: { OR: [{ userId }, { entryId: { in: entryIds } }] } }),
    prisma.favorite.deleteMany({ where: { OR: [{ userId }, { entryId: { in: entryIds } }] } }),
    prisma.message.deleteMany({ where: { OR: [{ senderId: userId }, { receiverId: userId }] } }),
    prisma.entry.deleteMany({ where: { authorId: userId } }),
  ]);
}

async function setBannedSince(userId: string, ts: number) {
  if (!redis) return;
  try {
    await redis.set(`banned_since:${userId}`, ts, { ex: 60 * 60 * 24 * 365 });
  } catch {}
}

async function clearBannedSince(userId: string) {
  if (!redis) return;
  try {
    await redis.del(`banned_since:${userId}`);
  } catch {}
}

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

  if (isCoMod) {
    if (parsed.data.isBanned !== undefined || parsed.data.banIp || parsed.data.purgeContent) {
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

  const data: {
    isBanned?: boolean;
    bannedAt?: Date | null;
    banReason?: string | null;
    role?: "CAYLAK" | "USER" | "AUTHOR" | "CO_MOD" | "MODERATOR" | "ADMIN";
  } = {};
  if (parsed.data.isBanned !== undefined) {
    data.isBanned = parsed.data.isBanned;
    data.bannedAt = parsed.data.isBanned ? new Date() : null;
    data.banReason = parsed.data.isBanned ? parsed.data.banReason ?? null : null;
  }
  if (parsed.data.role !== undefined) data.role = parsed.data.role;

  const updated = await prisma.user.update({
    where: { username },
    data,
    select: {
      id: true,
      username: true,
      role: true,
      isBanned: true,
      bannedAt: true,
    },
  });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || null;

  // Ban etkileşimi
  if (parsed.data.isBanned === true) {
    // JWT invalidation: o andan önceki token'ları geçersiz yap
    await setBannedSince(user.id, Math.floor(Date.now() / 1000));

    let bannedIpCount = 0;
    if (parsed.data.banIp) {
      bannedIpCount = await banIpsForUser(user.id, session.user.id, parsed.data.banReason);
    }

    let purged = false;
    if (parsed.data.purgeContent) {
      await purgeUserContent(user.id);
      purged = true;
    }

    await logAction(
      "USER_BAN",
      session.user.id,
      `${username} banlandı${parsed.data.banIp ? ` | ${bannedIpCount} ip` : ""}${purged ? " | içerik silindi" : ""}${parsed.data.banReason ? ` | sebep: ${parsed.data.banReason}` : ""}`,
      ip
    );
  } else if (parsed.data.isBanned === false) {
    await clearBannedSince(user.id);
    await unbanIpsForUser(user.id);
    await logAction("USER_UNBAN", session.user.id, `${username} ban kaldırıldı`, ip);
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

  const entryIds = (await prisma.entry.findMany({
    where: { authorId: user.id },
    select: { id: true },
  })).map((e) => e.id);

  try {
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
      prisma.announcement.deleteMany({ where: { authorId: user.id } }),
      prisma.upload.deleteMany({ where: { uploaderId: user.id } }),
      prisma.gameScore.deleteMany({ where: { userId: user.id } }),
      prisma.pushSubscription.deleteMany({ where: { userId: user.id } }),
      prisma.auditLog.deleteMany({ where: { userId: user.id } }),
      prisma.entry.deleteMany({ where: { authorId: user.id } }),
      prisma.user.delete({ where: { id: user.id } }),
    ]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: { code: "DELETE_FAILED", message: `silinemedi: ${msg.slice(0, 200)}` } },
      { status: 500 }
    );
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || null;
  await logAction("USER_DELETE", session.user.id, `${username} hesabi silindi`, ip);

  return NextResponse.json({ success: true, data: { deleted: true } });
}
