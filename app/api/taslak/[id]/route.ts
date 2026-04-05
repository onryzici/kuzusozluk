import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { sanitizeInput } from "@/lib/utils/security";

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().max(5000).optional(),
});

type Params = { params: Promise<{ id: string }> };

// PATCH — taslağı güncelle
export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "giriş yapmalısınız" } },
      { status: 401 }
    );
  }

  const { id } = await params;
  const draft = await prisma.topicDraft.findUnique({ where: { id }, select: { authorId: true } });
  if (!draft || draft.authorId !== session.user.id) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "taslak bulunamadı" } },
      { status: 404 }
    );
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "geçersiz veri" } },
      { status: 400 }
    );
  }

  const data: { title?: string; content?: string } = {};
  if (parsed.data.title !== undefined) data.title = sanitizeInput(parsed.data.title).toLowerCase();
  if (parsed.data.content !== undefined) data.content = parsed.data.content;

  const updated = await prisma.topicDraft.update({
    where: { id },
    data,
    select: { id: true, title: true, content: true, updatedAt: true },
  });

  return NextResponse.json({ success: true, data: updated });
}

// DELETE — taslağı sil
export async function DELETE(_request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "giriş yapmalısınız" } },
      { status: 401 }
    );
  }

  const { id } = await params;
  const draft = await prisma.topicDraft.findUnique({ where: { id }, select: { authorId: true } });
  if (!draft || draft.authorId !== session.user.id) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "taslak bulunamadı" } },
      { status: 404 }
    );
  }

  await prisma.topicDraft.delete({ where: { id } });
  return NextResponse.json({ success: true, data: { deleted: true } });
}
