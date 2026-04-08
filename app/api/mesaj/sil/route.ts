import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DELETE /api/mesaj/sil — Delete conversation with a specific user
export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Giriş yapmalısınız" } },
      { status: 401 }
    );
  }

  const userId = (session.user as { id: string }).id;
  const body = await request.json();
  const { username } = body;

  if (!username || typeof username !== "string") {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Kullanıcı adı gerekli" } },
      { status: 400 }
    );
  }

  const otherUser = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });

  if (!otherUser) {
    return NextResponse.json(
      { success: false, error: { code: "USER_NOT_FOUND", message: "Kullanıcı bulunamadı" } },
      { status: 404 }
    );
  }

  // Delete all messages between the two users
  await prisma.message.deleteMany({
    where: {
      OR: [
        { senderId: userId, receiverId: otherUser.id },
        { senderId: otherUser.id, receiverId: userId },
      ],
    },
  });

  return NextResponse.json({ success: true });
}
