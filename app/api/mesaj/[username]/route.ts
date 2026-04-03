import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { decryptMessage } from "@/lib/utils/encryption";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "giriş yapmalısınız" } },
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
      { success: false, error: { code: "USER_NOT_FOUND", message: "kullanıcı bulunamadı" } },
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

  // mesajları decrypt et
  const decryptedMessages = messages.map((msg) => ({
    ...msg,
    content: decryptMessage(msg.content, msg.senderId, msg.receiverId),
  }));

  // okunmamışları okundu yap
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
      messages: decryptedMessages,
    },
  });
}
