import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

// ukde'yi sahiplen — başlık oluşturma sayfasına yönlendirir
export async function POST(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Giriş yapmalısınız" } },
      { status: 401 }
    );
  }

  const { id } = await params;

  const ukde = await prisma.ukde.findUnique({ where: { id } });
  if (!ukde) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Ukde bulunamadı" } },
      { status: 404 }
    );
  }

  if (ukde.topicSlug) {
    return NextResponse.json(
      { success: false, error: { code: "ALREADY_CLAIMED", message: "Bu ukde zaten açılmış" } },
      { status: 409 }
    );
  }

  // ukde'yi sahiplen
  await prisma.ukde.update({
    where: { id },
    data: {
      claimedById: (session.user as any).id,
      claimedAt: new Date(),
    },
  });

  return NextResponse.json({ success: true, data: { title: ukde.title } });
}

// ukde sil (sadece yazar veya admin)
export async function DELETE(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Giriş yapmalısınız" } },
      { status: 401 }
    );
  }

  const { id } = await params;
  const ukde = await prisma.ukde.findUnique({ where: { id } });
  if (!ukde) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Ukde bulunamadı" } },
      { status: 404 }
    );
  }

  const userId = (session.user as any).id;
  const userRole = (session.user as any).role;
  if (ukde.authorId !== userId && userRole !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Yetkiniz yok" } },
      { status: 403 }
    );
  }

  await prisma.ukde.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
