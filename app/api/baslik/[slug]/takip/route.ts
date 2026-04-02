import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

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

  const { slug } = await params;
  const topic = await prisma.topic.findUnique({ where: { slug }, select: { id: true } });
  if (!topic) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Başlık bulunamadı" } },
      { status: 404 }
    );
  }

  const userId = (session.user as any).id;

  // Check if already following
  const existing = await prisma.topicFollow.findUnique({
    where: { userId_topicId: { userId, topicId: topic.id } },
  });

  if (existing) {
    return NextResponse.json(
      { success: true, data: { following: true } },
      { status: 200 }
    );
  }

  await prisma.topicFollow.create({
    data: { userId, topicId: topic.id },
  });

  return NextResponse.json(
    { success: true, data: { following: true } },
    { status: 201 }
  );
}

export async function DELETE(
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

  const { slug } = await params;
  const topic = await prisma.topic.findUnique({ where: { slug }, select: { id: true } });
  if (!topic) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Başlık bulunamadı" } },
      { status: 404 }
    );
  }

  const userId = (session.user as any).id;

  await prisma.topicFollow.deleteMany({
    where: { userId, topicId: topic.id },
  });

  return NextResponse.json(
    { success: true, data: { following: false } },
    { status: 200 }
  );
}
