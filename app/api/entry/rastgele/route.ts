import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { caylakEntryWhere } from "@/lib/utils/caylakFilter";

export async function GET() {
  const session = await auth();
  const viewer = { id: (session?.user as any)?.id, role: (session?.user as any)?.role };
  const where = caylakEntryWhere(viewer);
  const count = await prisma.entry.count({ where });
  if (count === 0) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "hic entry yok" } },
      { status: 404 }
    );
  }

  const skip = Math.floor(Math.random() * count);
  const entries = await prisma.entry.findMany({
    where,
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
