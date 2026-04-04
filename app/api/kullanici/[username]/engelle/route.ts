import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ username: string }> };

// engellenen kullanıcıları listele
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Giriş yapmalısınız" } },
      { status: 401 }
    );
  }

  const blocks = await prisma.block.findMany({
    where: { blockerId: (session.user as any).id },
    include: {
      blocked: { select: { username: true, avatarUrl: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    success: true,
    data: blocks.map((b) => ({
      id: b.id,
      username: b.blocked.username,
      avatarUrl: b.blocked.avatarUrl,
      createdAt: b.createdAt,
    })),
  });
}

// kullanıcıyı engelle
export async function POST(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Giriş yapmalısınız" } },
      { status: 401 }
    );
  }

  const { username } = await params;
  const currentUserId = (session.user as any).id;

  const targetUser = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });

  if (!targetUser) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Kullanıcı bulunamadı" } },
      { status: 404 }
    );
  }

  if (targetUser.id === currentUserId) {
    return NextResponse.json(
      { success: false, error: { code: "SELF_BLOCK", message: "Kendinizi engelleyemezsiniz" } },
      { status: 400 }
    );
  }

  // zaten engellenmişse sessizce başarılı dön
  const existing = await prisma.block.findUnique({
    where: { blockerId_blockedId: { blockerId: currentUserId, blockedId: targetUser.id } },
  });

  if (existing) {
    return NextResponse.json({ success: true, data: { blocked: true } });
  }

  await prisma.block.create({
    data: { blockerId: currentUserId, blockedId: targetUser.id },
  });

  // takibi de kaldır (varsa)
  await prisma.follow.deleteMany({
    where: {
      OR: [
        { followerId: currentUserId, followingId: targetUser.id },
        { followerId: targetUser.id, followingId: currentUserId },
      ],
    },
  });

  return NextResponse.json({ success: true, data: { blocked: true } }, { status: 201 });
}

// engeli kaldır
export async function DELETE(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Giriş yapmalısınız" } },
      { status: 401 }
    );
  }

  const { username } = await params;
  const currentUserId = (session.user as any).id;

  const targetUser = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });

  if (!targetUser) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Kullanıcı bulunamadı" } },
      { status: 404 }
    );
  }

  await prisma.block.deleteMany({
    where: { blockerId: currentUserId, blockedId: targetUser.id },
  });

  return NextResponse.json({ success: true, data: { blocked: false } });
}
