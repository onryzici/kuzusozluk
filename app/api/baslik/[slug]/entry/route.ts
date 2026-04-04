import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { yeniEntrySchema } from "@/lib/validations/entry";
import { deleteCache } from "@/lib/redis";
import { checkRateLimit, rateLimiters } from "@/lib/ratelimit";
import { sanitizeInput, checkYasakliKelime } from "@/lib/utils/security";
import { processMentions, createNotification } from "@/lib/notifications";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Giriş yapmalısınız" } },
      { status: 401 }
    );
  }

  const { allowed } = await checkRateLimit(rateLimiters.entryYaz, session.user.id);
  if (!allowed) {
    return NextResponse.json(
      { success: false, error: { code: "RATE_LIMITED", message: "Cok fazla istek gonderdiniz" } },
      { status: 429 }
    );
  }

  const { slug } = await params;
  const topic = await prisma.topic.findUnique({ where: { slug } });
  if (!topic) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Başlık bulunamadı" } },
      { status: 404 }
    );
  }

  if (topic.isLocked) {
    return NextResponse.json(
      { success: false, error: { code: "LOCKED", message: "Bu başlık kilitli" } },
      { status: 403 }
    );
  }

  const body = await request.json();
  const parsed = yeniEntrySchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues?.[0]?.message || "Geçersiz veri";
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message } },
      { status: 400 }
    );
  }

  const sanitizedContent = sanitizeInput(parsed.data.content);

  const yasakli = checkYasakliKelime(sanitizedContent.toLowerCase());
  if (yasakli) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN_CONTENT", message: `yasaklı içerik: "${yasakli}"` } },
      { status: 403 }
    );
  }

  const entry = await prisma.entry.create({
    data: {
      content: sanitizedContent,
      authorId: session.user.id,
      topicId: topic.id,
    },
    include: {
      author: { select: { id: true, username: true, avatarUrl: true } },
    },
  });

  // Entry sayılarını güncelle
  await prisma.topic.update({
    where: { id: topic.id },
    data: { entryCount: { increment: 1 }, dayCount: { increment: 1 } },
  });

  await prisma.user.update({
    where: { id: session.user.id },
    data: { entryCount: { increment: 1 } },
  });

  // Cache invalidation
  await deleteCache("gundem:list");
  await deleteCache(`baslik:${slug}`);

  // Process @mentions in entry content
  await processMentions(sanitizedContent, session.user.id, `/entry/${entry.id}`);

  // Notify users who follow this topic
  const topicFollowers = await prisma.topicFollow.findMany({
    where: {
      topicId: topic.id,
      userId: { not: session.user.id },
    },
    select: { userId: true },
  });

  for (const follower of topicFollowers) {
    await createNotification({
      type: "TOPIC_ENTRY",
      content: `"${topic.title}" başlığına yeni entry girildi`,
      link: `/baslik/${slug}`,
      userId: follower.userId,
      actorId: session.user.id,
    });
  }

  return NextResponse.json({ success: true, data: entry }, { status: 201 });
}
