import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { compareSync, hashSync } from "bcryptjs";
import { ayarlarSchema } from "@/lib/validations/ayarlar";

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Giriş yapmalısınız" } },
      { status: 401 }
    );
  }

  const body = await request.json();
  const parsed = ayarlarSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message || "Geçersiz veri";
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: firstError } },
      { status: 400 }
    );
  }

  const { displayName, bio, currentPassword, newPassword } = parsed.data;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = {};

  if (displayName !== undefined) {
    updateData.displayName = displayName || null;
  }

  if (bio !== undefined) {
    updateData.bio = bio || null;
  }

  // Password change
  if (newPassword && newPassword.length > 0) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { passwordHash: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Kullanıcı bulunamadı" } },
        { status: 404 }
      );
    }

    const isValid = compareSync(currentPassword || "", user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_PASSWORD", message: "Mevcut şifre yanlış" } },
        { status: 400 }
      );
    }

    updateData.passwordHash = hashSync(newPassword, 12);
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { success: false, error: { code: "NO_CHANGES", message: "Değişiklik yapılmadı" } },
      { status: 400 }
    );
  }

  const updatedUser = await prisma.user.update({
    where: { id: session.user.id },
    data: updateData,
    select: {
      id: true,
      username: true,
      displayName: true,
      bio: true,
      email: true,
      avatarUrl: true,
      role: true,
      karma: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ success: true, data: updatedUser });
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Giriş yapmalısınız" } },
      { status: 401 }
    );
  }

  const body = await request.json();
  const { confirmUsername } = body;

  if (!confirmUsername || confirmUsername !== session.user.username) {
    return NextResponse.json(
      { success: false, error: { code: "CONFIRMATION_FAILED", message: "Kullanıcı adı eşleşmiyor" } },
      { status: 400 }
    );
  }

  const userId = session.user.id;

  // Delete all related data in correct order, then delete user
  await prisma.$transaction([
    prisma.vote.deleteMany({ where: { userId } }),
    prisma.favorite.deleteMany({ where: { userId } }),
    prisma.follow.deleteMany({ where: { OR: [{ followerId: userId }, { followingId: userId }] } }),
    prisma.message.deleteMany({ where: { OR: [{ senderId: userId }, { receiverId: userId }] } }),
    prisma.entry.deleteMany({ where: { authorId: userId } }),
    prisma.user.delete({ where: { id: userId } }),
  ]);

  return NextResponse.json({ success: true, data: { deleted: true } });
}
