import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const count = await prisma.entry.count();
  if (count === 0) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "hic entry yok" } },
      { status: 404 }
    );
  }

  const skip = Math.floor(Math.random() * count);
  const entries = await prisma.entry.findMany({
    skip,
    take: 1,
    include: {
      author: { select: { username: true } },
      topic: { select: { title: true, slug: true } },
    },
  });

  if (entries.length === 0) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "entry bulunamadi" } },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: entries[0] });
}
