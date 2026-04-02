import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import MesajListesi from "@/components/mesaj/MesajListesi";
import Link from "next/link";
import { Mail } from "lucide-react";

export const metadata = {
  title: "Mesajlar - Sözlük",
};

export default async function MesajlarPage() {
  const session = await auth();
  if (!session?.user) redirect("/giris?callbackUrl=/mesajlar");

  const userId = (session.user as { id: string }).id;

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

  // Group conversations by the other user
  const conversationMap = new Map<
    string,
    {
      username: string;
      avatarUrl: string | null;
      lastMessage: string;
      lastMessageAt: string;
      isOwnMessage: boolean;
      unreadCount: number;
    }
  >();

  for (const msg of messages) {
    const otherUserId =
      msg.senderId === userId ? msg.receiverId : msg.senderId;

    if (!conversationMap.has(otherUserId)) {
      const isOwn = msg.senderId === userId;
      let otherUsername: string;
      let otherAvatarUrl: string | null;

      if (isOwn) {
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
        lastMessage: msg.content,
        lastMessageAt: msg.createdAt.toISOString(),
        isOwnMessage: isOwn,
        unreadCount: 0,
      });
    }

    if (msg.senderId !== userId && !msg.isRead) {
      const conv = conversationMap.get(otherUserId)!;
      conv.unreadCount++;
    }
  }

  const conversations = Array.from(conversationMap.values()).sort(
    (a, b) =>
      new Date(b.lastMessageAt).getTime() -
      new Date(a.lastMessageAt).getTime()
  );

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Mesajlar
        </h1>
        <Link
          href="/mesajlar/yeni"
          className="text-sm text-primary hover:underline"
        >
          {/* Placeholder for future "new message" feature */}
        </Link>
      </div>
      <div className="border rounded-lg bg-card">
        <MesajListesi conversations={conversations} />
      </div>
    </div>
  );
}
