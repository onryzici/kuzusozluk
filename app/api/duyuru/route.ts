import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const announcements = await prisma.announcement.findMany({
    where: { isActive: true },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    include: {
      author: { select: { id: true, username: true } },
    },
  });

  return NextResponse.json({ success: true, data: announcements });
}
