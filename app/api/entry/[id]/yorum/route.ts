import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { yorumSchema } from "@/lib/validations/yorum";
import { createNotification, processMentions } from "@/lib/notifications";
import { checkYasakliKelime } from "@/lib/utils/security";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: entryId } = await params;

    const comments = await prisma.comment.findMany({
      where: { entryId },
      orderBy: { createdAt: "asc" },
      include: {
        author: {
          select: {
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: comments });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL", message: "Sunucu hatası" } },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Giriş yapmalısınız" } },
        { status: 401 }
      );
    }

    const { id: entryId } = await params;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (session.user as any).id as string;

    const body = await request.json();
    const parsed = yorumSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION",
            message: parsed.error.issues[0]?.message || "Geçersiz veri",
          },
        },
        { status: 400 }
      );
    }

    parsed.data.content = parsed.data.content.toLowerCase();
    const yasakli = checkYasakliKelime(parsed.data.content);
    if (yasakli) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN_CONTENT", message: "yasaklı içerik tespit edildi" } },
        { status: 403 }
      );
    }

    // Check entry exists
    const entry = await prisma.entry.findUnique({ where: { id: entryId } });
    if (!entry) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Entry bulunamadı" } },
        { status: 404 }
      );
    }

    const comment = await prisma.comment.create({
      data: {
        content: parsed.data.content,
        authorId: userId,
        entryId,
      },
      include: {
        author: {
          select: {
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Notify entry author about the reply
    if (entry.authorId !== userId) {
      await createNotification({
        type: "REPLY",
        content: `entry'nize yorum yapildi`,
        link: `/entry/${entryId}`,
        userId: entry.authorId,
        actorId: userId,
      });
    }

    // Process @mentions in comment text
    await processMentions(parsed.data.content, userId, `/entry/${entryId}`);

    return NextResponse.json({ success: true, data: comment }, { status: 201 });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL", message: "Sunucu hatası" } },
      { status: 500 }
    );
  }
}
