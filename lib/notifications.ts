import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/web-push";

type CreateNotificationInput = {
  type: "MENTION" | "REPLY" | "VOTE" | "FOLLOW" | "MESSAGE" | "TOPIC_ENTRY";
  content: string;
  link?: string;
  userId: string;  // receiver
  actorId: string; // who triggered it
};

const typeLabels: Record<string, string> = {
  MENTION: "etiketleme",
  REPLY: "yorum",
  VOTE: "begeni",
  FOLLOW: "takip",
  MESSAGE: "mesaj",
  TOPIC_ENTRY: "yeni entry",
};

export async function createNotification(input: CreateNotificationInput) {
  // Don't notify yourself
  if (input.userId === input.actorId) return;

  const [notification, actor] = await Promise.all([
    prisma.notification.create({ data: input }),
    prisma.user.findUnique({ where: { id: input.actorId }, select: { username: true } }),
  ]);

  // Send push notification (fire-and-forget, don't block)
  const label = typeLabels[input.type] || "";
  sendPushToUser(input.userId, {
    title: `kuzu sozluk - ${label}`,
    body: `${actor?.username || "biri"}: ${input.content}`,
    url: input.link || "/bildirimler",
    tag: input.type,
  }).catch(() => {});

  return notification;
}

// Parse @mentions from text and create notifications
export async function processMentions(text: string, actorId: string, link: string) {
  const mentions = text.match(/@([a-zA-Z0-9_]+)/g);
  if (!mentions) return;

  const usernames = [...new Set(mentions.map(m => m.slice(1)))];

  for (const username of usernames) {
    const user = await prisma.user.findUnique({ where: { username }, select: { id: true } });
    if (user && user.id !== actorId) {
      await createNotification({
        type: "MENTION",
        content: `@${username} olarak etiketlendiniz`,
        link,
        userId: user.id,
        actorId,
      });
    }
  }
}
