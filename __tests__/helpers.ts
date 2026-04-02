import { prisma } from "@/lib/prisma";

export async function cleanDatabase() {
  await prisma.notification.deleteMany();
  await prisma.topicFollow.deleteMany();
  await prisma.report.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.vote.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.entry.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.message.deleteMany();
  await prisma.emailToken.deleteMany();
  await prisma.topicTag.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.topic.deleteMany();
  await prisma.user.deleteMany();
}
