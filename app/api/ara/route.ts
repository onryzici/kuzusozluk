import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { meili } from "@/lib/meilisearch";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q")?.trim();
  const tip = searchParams.get("tip") || "baslik";

  if (!q || q.length < 2) {
    return NextResponse.json({
      success: true,
      data: [],
      meta: { total: 0, page: 1, pageSize: 20, hasMore: false },
    });
  }

  // Meilisearch varsa onu kullan, yoksa DB LIKE fallback
  if (meili) {
    try {
      if (tip === "baslik") {
        const result = await meili.index("topics").search(q, { limit: 20 });
        return NextResponse.json({
          success: true,
          data: result.hits,
          meta: { total: result.estimatedTotalHits || 0, page: 1, pageSize: 20, hasMore: false },
        });
      }
      if (tip === "entry") {
        const result = await meili.index("entries").search(q, { limit: 20 });
        return NextResponse.json({
          success: true,
          data: result.hits,
          meta: { total: result.estimatedTotalHits || 0, page: 1, pageSize: 20, hasMore: false },
        });
      }
    } catch {
      // Meilisearch'e bağlanılamazsa DB fallback'e düş
    }
  }

  // DB fallback
  if (tip === "baslik") {
    const topics = await prisma.topic.findMany({
      where: { title: { contains: q, mode: "insensitive" } },
      take: 20,
      select: { id: true, title: true, slug: true, entryCount: true, dayCount: true },
    });
    return NextResponse.json({
      success: true,
      data: topics,
      meta: { total: topics.length, page: 1, pageSize: 20, hasMore: false },
    });
  }

  if (tip === "entry") {
    const entries = await prisma.entry.findMany({
      where: { content: { contains: q, mode: "insensitive" } },
      take: 20,
      include: {
        author: { select: { username: true } },
        topic: { select: { title: true, slug: true } },
      },
    });
    return NextResponse.json({
      success: true,
      data: entries,
      meta: { total: entries.length, page: 1, pageSize: 20, hasMore: false },
    });
  }

  if (tip === "kullanici") {
    const users = await prisma.user.findMany({
      where: { username: { contains: q, mode: "insensitive" } },
      take: 20,
      select: { id: true, username: true, displayName: true, avatarUrl: true, entryCount: true },
    });
    return NextResponse.json({
      success: true,
      data: users,
      meta: { total: users.length, page: 1, pageSize: 20, hasMore: false },
    });
  }

  return NextResponse.json({ success: true, data: [] });
}
