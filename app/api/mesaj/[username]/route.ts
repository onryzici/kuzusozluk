import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/mesaj/[username] — Get conversation with a specific user
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Giriş yapmalısınız" } },
      { status: 401 }
    );
  }

  const { username } = await params;
  const currentUserId = (session.user as { id: string }).id;

  const otherUser = await prisma.user.findUnique({
    where: { username },
    select: { id: true, username: true, avatarUrl: true },
  });

  if (!otherUser) {
    return NextResponse.json(
      { success: false, error: { code: "USER_NOT_FOUND", message: "Kullanıcı bulunamadı" } },
      { status: 404 }
    );
  }

  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: currentUserId, receiverId: otherUser.id },
        { senderId: otherUser.id, receiverId: currentUserId },
      ],
    },
    orderBy: { createdAt: "asc" },
    include: {
      sender: {
        select: { id: true, username: true, avatarUrl: true },
      },
    },
  });

  // Mark unread messages from the other user as read
  await prisma.message.updateMany({
    where: {
      senderId: otherUser.id,
      receiverId: currentUserId,
      isRead: false,
    },
    data: { isRead: true },
  });

  return NextResponse.json({
    success: true,
    data: {
      otherUser,
      messages,
    },
  });
}
