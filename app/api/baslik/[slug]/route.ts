import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const topic = await prisma.topic.findUnique({
    where: { slug },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      entryCount: true,
      dayCount: true,
      isPinned: true,
      isLocked: true,
      createdAt: true,
    },
  });

  if (!topic) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Başlık bulunamadı" } },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: topic });
}
