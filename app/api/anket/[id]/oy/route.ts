import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const oySchema = z.object({
  optionId: z.string().min(1, "Secenek secilmeli"),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Oy vermek icin giris yapmalisiniz" } },
      { status: 401 }
    );
  }

  const { id: pollId } = await params;
  const userId = (session.user as any).id;

  const body = await request.json();
  const parsed = oySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Gecersiz secenek" } },
      { status: 400 }
    );
  }

  const { optionId } = parsed.data;

  // Check poll exists and is active
  const poll = await prisma.poll.findUnique({
    where: { id: pollId },
    include: {
      options: {
        include: {
          votes: { where: { userId }, select: { id: true } },
        },
      },
    },
  });

  if (!poll) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Anket bulunamadi" } },
      { status: 404 }
    );
  }

  if (!poll.isActive) {
    return NextResponse.json(
      { success: false, error: { code: "INACTIVE", message: "Bu anket kapanmis" } },
      { status: 400 }
    );
  }

  if (poll.expiresAt && poll.expiresAt < new Date()) {
    return NextResponse.json(
      { success: false, error: { code: "EXPIRED", message: "Bu anketin suresi dolmus" } },
      { status: 400 }
    );
  }

  // Check if user already voted on any option of this poll
  const alreadyVoted = poll.options.some((opt) => opt.votes.length > 0);
  if (alreadyVoted) {
    return NextResponse.json(
      { success: false, error: { code: "ALREADY_VOTED", message: "Bu ankete zaten oy verdiniz" } },
      { status: 400 }
    );
  }

  // Check if optionId belongs to this poll
  const validOption = poll.options.find((opt) => opt.id === optionId);
  if (!validOption) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_OPTION", message: "Bu secenek bu ankete ait degil" } },
      { status: 400 }
    );
  }

  await prisma.pollVote.create({
    data: {
      userId,
      optionId,
    },
  });

  // Return updated poll data
  const updatedPoll = await prisma.poll.findUnique({
    where: { id: pollId },
    include: {
      options: {
        include: {
          _count: { select: { votes: true } },
        },
      },
    },
  });

  const totalVotes = updatedPoll!.options.reduce(
    (sum, opt) => sum + opt._count.votes,
    0
  );

  return NextResponse.json({
    success: true,
    data: {
      totalVotes,
      userVotedOptionId: optionId,
      options: updatedPoll!.options.map((opt) => ({
        id: opt.id,
        text: opt.text,
        voteCount: opt._count.votes,
      })),
    },
  });
}
