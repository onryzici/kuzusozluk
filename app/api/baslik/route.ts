import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { yeniBaslikSchema } from "@/lib/validations/baslik";
import { toSlug } from "@/lib/utils/slug";
import { getCache, setCache, deleteCache, TTL } from "@/lib/redis";
import { checkRateLimit, rateLimiters } from "@/lib/ratelimit";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("sayfa") || "1"));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("boyut") || "20")));
  const sort = searchParams.get("siralama") || "gundem";

  // Cache gündem listesi
  if (sort === "gundem" && page === 1 && pageSize === 20) {
    const cached = await getCache<string>("gundem:list");
    if (cached) {
      return NextResponse.json(cached);
    }
  }

  const orderBy =
    sort === "yeni" ? { createdAt: "desc" as const } :
    sort === "populer" ? { entryCount: "desc" as const } :
    sort === "son" ? { updatedAt: "desc" as const } :
    { dayCount: "desc" as const };

  const [topics, total] = await Promise.all([
    prisma.topic.findMany({
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        title: true,
        slug: true,
        entryCount: true,
        dayCount: true,
        createdAt: true,
      },
    }),
    prisma.topic.count(),
  ]);

  const response = {
    success: true,
    data: topics,
    meta: { total, page, pageSize, hasMore: page * pageSize < total },
  };

  if (sort === "gundem" && page === 1 && pageSize === 20) {
    await setCache("gundem:list", response, TTL.GUNDEM);
  }

  return NextResponse.json(response);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Giriş yapmalısınız" } },
      { status: 401 }
    );
  }

  const { allowed } = await checkRateLimit(rateLimiters.baslikOlustur, session.user.id);
  if (!allowed) {
    return NextResponse.json(
      { success: false, error: { code: "RATE_LIMITED", message: "Cok fazla istek gonderdiniz" } },
      { status: 429 }
    );
  }

  const body = await request.json();
  const parsed = yeniBaslikSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues?.[0]?.message || "Geçersiz veri";
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message } },
      { status: 400 }
    );
  }

  const { title, description } = parsed.data;
  let slug = toSlug(title);

  // Slug unique kontrolü
  let suffix = 1;
  let existing = await prisma.topic.findUnique({ where: { slug } });
  while (existing) {
    suffix++;
    slug = `${toSlug(title)}-${suffix}`;
    existing = await prisma.topic.findUnique({ where: { slug } });
  }

  // Title unique kontrolü
  const existingTitle = await prisma.topic.findUnique({ where: { title } });
  if (existingTitle) {
    return NextResponse.json(
      { success: false, error: { code: "TITLE_EXISTS", message: "Bu başlık zaten mevcut" } },
      { status: 409 }
    );
  }

  const topic = await prisma.topic.create({
    data: { title, slug, description },
    select: { id: true, title: true, slug: true, createdAt: true },
  });

  return NextResponse.json({ success: true, data: topic }, { status: 201 });
}
