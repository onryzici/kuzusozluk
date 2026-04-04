import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { checkRateLimit, rateLimiters } from "@/lib/ratelimit";
import { checkYasakliKelime } from "@/lib/utils/security";

const ukdeSchema = z.object({
  title: z.string().min(2, "En az 2 karakter").max(200, "En fazla 200 karakter"),
});

// ukdeleri listele
export async function GET() {
  try {
    const ukdeler = await prisma.ukde.findMany({
      where: { topicSlug: null }, // henüz açılmamış olanlar
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        author: { select: { username: true } },
      },
    });

    return NextResponse.json({ success: true, data: ukdeler });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL", message: "Sunucu hatası" } },
      { status: 500 }
    );
  }
}

// yeni ukde oluştur
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Giriş yapmalısınız" } },
      { status: 401 }
    );
  }

  const { allowed } = await checkRateLimit(rateLimiters.baslikOlustur, (session.user as any).id);
  if (!allowed) {
    return NextResponse.json(
      { success: false, error: { code: "RATE_LIMIT", message: "Çok fazla deneme" } },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const parsed = ukdeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message } },
        { status: 400 }
      );
    }

    const title = parsed.data.title.toLowerCase();

    const yasakli = checkYasakliKelime(title);
    if (yasakli) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN_CONTENT", message: `yasaklı içerik: "${yasakli}"` } },
        { status: 403 }
      );
    }

    // aynı başlık zaten varsa (topic olarak veya ukde olarak)
    const existingTopic = await prisma.topic.findFirst({ where: { title } });
    if (existingTopic) {
      return NextResponse.json(
        { success: false, error: { code: "TITLE_EXISTS", message: "Bu başlık zaten mevcut" } },
        { status: 409 }
      );
    }

    const existingUkde = await prisma.ukde.findFirst({ where: { title, topicSlug: null } });
    if (existingUkde) {
      return NextResponse.json(
        { success: false, error: { code: "UKDE_EXISTS", message: "Bu ukde zaten verilmiş" } },
        { status: 409 }
      );
    }

    const ukde = await prisma.ukde.create({
      data: {
        title,
        authorId: (session.user as any).id,
      },
      include: {
        author: { select: { username: true } },
      },
    });

    return NextResponse.json({ success: true, data: ukde }, { status: 201 });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL", message: "Sunucu hatası" } },
      { status: 500 }
    );
  }
}
