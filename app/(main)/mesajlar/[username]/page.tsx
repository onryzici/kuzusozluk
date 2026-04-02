import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import MesajBalonu from "@/components/mesaj/MesajBalonu";
import MesajForm from "@/components/mesaj/MesajForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  return { title: `${username} ile mesajlar - Sözlük` };
}

export default async function MesajDetayPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/giris?callbackUrl=/mesajlar");

  const { username } = await params;
  const currentUserId = (session.user as { id: string }).id;

  const otherUser = await prisma.user.findUnique({
    where: { username },
    select: { id: true, username: true, avatarUrl: true },
  });

  if (!otherUser) notFound();

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

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b">
        <Link
          href="/mesajlar"
          className="p-1 rounded-md hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground">
            {otherUser.username[0].toUpperCase()}
          </div>
          <Link
            href={`/kullanici/${otherUser.username}`}
            className="text-sm font-medium text-primary hover:underline"
          >
            {otherUser.username}
          </Link>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            Henüz mesaj yok. İlk mesajı gönderin!
          </p>
        ) : (
          messages.map((msg) => (
            <MesajBalonu
              key={msg.id}
              content={msg.content}
              createdAt={msg.createdAt.toISOString()}
              senderUsername={msg.sender.username}
              isOwn={msg.senderId === currentUserId}
            />
          ))
        )}
      </div>

      {/* Form */}
      <MesajForm receiverUsername={otherUser.username} />
    </div>
  );
}
