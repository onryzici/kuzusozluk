import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";

type Params = { params: Promise<{ username: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Giriş yapmalısınız" } },
      { status: 401 }
    );
  }

  const { username } = await params;
  const target = await prisma.user.findUnique({ where: { username } });
  if (!target) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Kullanıcı bulunamadı" } },
      { status: 404 }
    );
  }

  if (target.id === session.user.id) {
    return NextResponse.json(
      { success: false, error: { code: "SELF_FOLLOW", message: "Kendinizi takip edemezsiniz" } },
      { status: 400 }
    );
  }

  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: session.user.id, followingId: target.id } },
  });

  if (existing) {
    return NextResponse.json(
      { success: false, error: { code: "ALREADY_FOLLOWING", message: "Zaten takip ediyorsunuz" } },
      { status: 409 }
    );
  }

  await prisma.follow.create({
    data: { followerId: session.user.id, followingId: target.id },
  });

  // Notify the followed user
  await createNotification({
    type: "FOLLOW",
    content: `sizi takip etmeye basladi`,
    link: `/kullanici/${session.user.username}`,
    userId: target.id,
    actorId: session.user.id,
  });

  return NextResponse.json({ success: true, data: { following: true } }, { status: 201 });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Giriş yapmalısınız" } },
      { status: 401 }
    );
  }

  const { username } = await params;
  const target = await prisma.user.findUnique({ where: { username } });
  if (!target) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Kullanıcı bulunamadı" } },
      { status: 404 }
    );
  }

  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: session.user.id, followingId: target.id } },
  });

  if (!existing) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOLLOWING", message: "Takip etmiyorsunuz" } },
      { status: 404 }
    );
  }

  await prisma.follow.delete({ where: { id: existing.id } });

  return NextResponse.json({ success: true, data: { following: false } });
}
