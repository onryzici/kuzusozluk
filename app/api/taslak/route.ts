import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { sanitizeInput } from "@/lib/utils/security";

const taslakSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().max(5000).default(""),
});

// GET — kullanıcının taslaklarını listele
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "giriş yapmalısınız" } },
      { status: 401 }
    );
  }

  const drafts = await prisma.topicDraft.findMany({
    where: { authorId: session.user.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, content: true, createdAt: true, updatedAt: true },
  });

  return NextResponse.json({ success: true, data: drafts });
}

// POST — yeni taslak oluştur
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "giriş yapmalısınız" } },
      { status: 401 }
    );
  }

  const body = await request.json();
  const parsed = taslakSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "geçersiz veri" } },
      { status: 400 }
    );
  }

  // max 20 taslak
  const count = await prisma.topicDraft.count({ where: { authorId: session.user.id } });
  if (count >= 20) {
    return NextResponse.json(
      { success: false, error: { code: "LIMIT", message: "en fazla 20 taslak kaydedebilirsiniz" } },
      { status: 400 }
    );
  }

  const draft = await prisma.topicDraft.create({
    data: {
      title: sanitizeInput(parsed.data.title).toLowerCase(),
      content: parsed.data.content,
      authorId: session.user.id,
    },
    select: { id: true, title: true, content: true, createdAt: true, updatedAt: true },
  });

  return NextResponse.json({ success: true, data: draft }, { status: 201 });
}
