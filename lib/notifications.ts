import { prisma } from "@/lib/prisma";

type CreateNotificationInput = {
  type: "MENTION" | "REPLY" | "VOTE" | "FOLLOW" | "MESSAGE" | "TOPIC_ENTRY";
  content: string;
  link?: string;
  userId: string;  // receiver
  actorId: string; // who triggered it
};

export async function createNotification(input: CreateNotificationInput) {
  // Don't notify yourself
  if (input.userId === input.actorId) return;

  await prisma.notification.create({ data: input });
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
