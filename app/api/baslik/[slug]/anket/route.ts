import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const anketSchema = z.object({
  question: z.string().min(3, "Soru en az 3 karakter olmali").max(300),
  options: z
    .array(z.string().min(1, "Secenekler bos olamaz").max(200))
    .min(2, "En az 2 secenek olmali")
    .max(6, "En fazla 6 secenek olabilir"),
});

type Params = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { slug } = await params;
  const session = await auth();
  const userId = (session?.user as any)?.id || null;

  const topic = await prisma.topic.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!topic) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Baslik bulunamadi" } },
      { status: 404 }
    );
  }

  const polls = await prisma.poll.findMany({
    where: { topicId: topic.id, isActive: true },
    orderBy: { createdAt: "desc" },
    include: {
      author: {
        select: { username: true },
      },
      options: {
        include: {
          _count: { select: { votes: true } },
          votes: userId
            ? { where: { userId }, select: { id: true } }
            : false,
        },
      },
    },
  });

  const data = polls.map((poll) => {
    const totalVotes = poll.options.reduce(
      (sum, opt) => sum + opt._count.votes,
      0
    );
    const userVotedOptionId = userId
      ? poll.options.find((opt) => opt.votes && opt.votes.length > 0)?.id || null
      : null;

    return {
      id: poll.id,
      question: poll.question,
      authorUsername: poll.author.username,
      createdAt: poll.createdAt.toISOString(),
      expiresAt: poll.expiresAt?.toISOString() || null,
      totalVotes,
      userVotedOptionId,
      options: poll.options.map((opt) => ({
        id: opt.id,
        text: opt.text,
        voteCount: opt._count.votes,
      })),
    };
  });

  return NextResponse.json({ success: true, data });
}

export async function POST(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Giris yapmalısiniz" } },
      { status: 401 }
    );
  }

  const { slug } = await params;
  const topic = await prisma.topic.findUnique({
    where: { slug },
    select: { id: true, isLocked: true },
  });

  if (!topic) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Baslik bulunamadi" } },
      { status: 404 }
    );
  }

  if (topic.isLocked) {
    return NextResponse.json(
      { success: false, error: { code: "LOCKED", message: "Bu baslik kilitli" } },
      { status: 403 }
    );
  }

  const body = await request.json();
  const parsed = anketSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: parsed.error.issues?.[0]?.message || "gecersiz veri",
        },
      },
      { status: 400 }
    );
  }

  // her başlıkta max 1 anket
  const existingPoll = await prisma.poll.findFirst({ where: { topicId: topic.id } });
  if (existingPoll) {
    return NextResponse.json(
      { success: false, error: { code: "POLL_EXISTS", message: "bu başlıkta zaten bir anket var" } },
      { status: 409 }
    );
  }

  const { question, options } = parsed.data;
  const userId = (session.user as any).id;

  const poll = await prisma.poll.create({
    data: {
      question,
      authorId: userId,
      topicId: topic.id,
      options: {
        create: options.map((text) => ({ text })),
      },
    },
    include: {
      author: { select: { username: true } },
      options: {
        include: {
          _count: { select: { votes: true } },
        },
      },
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      id: poll.id,
      question: poll.question,
      authorUsername: poll.author.username,
      createdAt: poll.createdAt.toISOString(),
      expiresAt: null,
      totalVotes: 0,
      userVotedOptionId: null,
      options: poll.options.map((opt) => ({
        id: opt.id,
        text: opt.text,
        voteCount: 0,
      })),
    },
  });
}
