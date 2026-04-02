import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Giriş yapmalısınız" } },
      { status: 401 }
    );
  }

  const { id } = await params;
  const entry = await prisma.entry.findUnique({ where: { id } });
  if (!entry) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Entry bulunamadı" } },
      { status: 404 }
    );
  }

  const existing = await prisma.favorite.findUnique({
    where: { userId_entryId: { userId: session.user.id, entryId: id } },
  });

  if (existing) {
    return NextResponse.json(
      { success: false, error: { code: "ALREADY_EXISTS", message: "Zaten favorilerde" } },
      { status: 409 }
    );
  }

  await prisma.favorite.create({
    data: { userId: session.user.id, entryId: id },
  });

  return NextResponse.json({ success: true, data: { favorited: true } }, { status: 201 });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Giriş yapmalısınız" } },
      { status: 401 }
    );
  }

  const { id } = await params;
  const existing = await prisma.favorite.findUnique({
    where: { userId_entryId: { userId: session.user.id, entryId: id } },
  });

  if (!existing) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Favori bulunamadı" } },
      { status: 404 }
    );
  }

  await prisma.favorite.delete({ where: { id: existing.id } });

  return NextResponse.json({ success: true, data: { favorited: false } });
}
