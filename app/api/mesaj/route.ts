import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { mesajSchema } from "@/lib/validations/mesaj";
import { checkYasakliKelime } from "@/lib/utils/security";
import { encryptMessage, decryptMessage } from "@/lib/utils/encryption";

// GET /api/mesaj — List conversations for current user (grouped by other user)
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Giriş yapmalısınız" } },
      { status: 401 }
    );
  }

  const userId = (session.user as { id: string }).id;

  // Get all messages where user is sender or receiver
  const messages = await prisma.message.findMany({
    where: {
      OR: [{ senderId: userId }, { receiverId: userId }],
    },
    orderBy: { createdAt: "desc" },
    include: {
      sender: {
        select: { id: true, username: true, avatarUrl: true },
      },
    },
  });

  // Group by the other user, keeping the latest message per conversation
  const conversationMap = new Map<
    string,
    {
      username: string;
      avatarUrl: string | null;
      lastMessage: string;
      lastMessageAt: Date;
      isOwnMessage: boolean;
      unreadCount: number;
    }
  >();

  for (const msg of messages) {
    const otherUserId = msg.senderId === userId ? msg.receiverId : msg.senderId;

    if (!conversationMap.has(otherUserId)) {
      // We need the other user's info
      const isOwn = msg.senderId === userId;
      let otherUsername: string;
      let otherAvatarUrl: string | null;

      if (isOwn) {
        // The other user is the receiver — we need to fetch them
        const receiver = await prisma.user.findUnique({
          where: { id: msg.receiverId },
          select: { username: true, avatarUrl: true },
        });
        otherUsername = receiver?.username || "silinmiş";
        otherAvatarUrl = receiver?.avatarUrl || null;
      } else {
        otherUsername = msg.sender.username;
        otherAvatarUrl = msg.sender.avatarUrl;
      }

      conversationMap.set(otherUserId, {
        username: otherUsername,
        avatarUrl: otherAvatarUrl,
        lastMessage: decryptMessage(msg.content, msg.senderId, msg.receiverId),
        lastMessageAt: msg.createdAt,
        isOwnMessage: isOwn,
        unreadCount: 0,
      });
    }

    // Count unread messages from the other user
    if (msg.senderId !== userId && !msg.isRead) {
      const conv = conversationMap.get(otherUserId)!;
      conv.unreadCount++;
    }
  }

  const conversations = Array.from(conversationMap.values()).sort(
    (a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime()
  );

  return NextResponse.json({ success: true, data: conversations });
}

// POST /api/mesaj — Send a new message
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Giriş yapmalısınız" } },
      { status: 401 }
    );
  }

  const body = await request.json();
  const parsed = mesajSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues?.[0]?.message || "Geçersiz veri";
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message } },
      { status: 400 }
    );
  }

  const content = parsed.data.content;
  const receiverUsername = parsed.data.receiverUsername;
  const senderId = (session.user as { id: string }).id;
  const senderUsername = (session.user as { username: string }).username;

  if (receiverUsername === senderUsername) {
    return NextResponse.json(
      { success: false, error: { code: "SELF_MESSAGE", message: "Kendinize mesaj gönderemezsiniz" } },
      { status: 400 }
    );
  }

  const yasakli = checkYasakliKelime(content.toLowerCase());
  if (yasakli) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN_CONTENT", message: `yasaklı içerik: "${yasakli}"` } },
      { status: 403 }
    );
  }

  const receiver = await prisma.user.findUnique({
    where: { username: receiverUsername },
    select: { id: true },
  });

  if (!receiver) {
    return NextResponse.json(
      { success: false, error: { code: "USER_NOT_FOUND", message: "Kullanıcı bulunamadı" } },
      { status: 404 }
    );
  }

  const encryptedContent = encryptMessage(content, senderId, receiver.id);

  const mesaj = await prisma.message.create({
    data: {
      content: encryptedContent,
      senderId,
      receiverId: receiver.id,
    },
    include: {
      sender: {
        select: { id: true, username: true, avatarUrl: true },
      },
    },
  });

  return NextResponse.json({ success: true, data: mesaj }, { status: 201 });
}
