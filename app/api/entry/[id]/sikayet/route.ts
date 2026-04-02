import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sikayetSchema } from "@/lib/validations/sikayet";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Giris yapmalisiniz" } },
      { status: 401 }
    );
  }

  const { id } = await params;
  const entry = await prisma.entry.findUnique({ where: { id } });
  if (!entry) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Entry bulunamadi" } },
      { status: 404 }
    );
  }

  const body = await request.json();
  const parsed = sikayetSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues?.[0]?.message || "Gecersiz veri";
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message } },
      { status: 400 }
    );
  }

  // Ayni kullanici ayni entry'yi tekrar sikayet edemesin
  const existing = await prisma.report.findFirst({
    where: { reporterId: session.user.id, entryId: id, status: "PENDING" },
  });
  if (existing) {
    return NextResponse.json(
      { success: false, error: { code: "ALREADY_REPORTED", message: "Bu entry'yi zaten sikayet ettiniz" } },
      { status: 409 }
    );
  }

  const report = await prisma.report.create({
    data: {
      reason: parsed.data.reason,
      reporterId: session.user.id,
      entryId: id,
    },
    select: { id: true, reason: true, status: true, createdAt: true },
  });

  return NextResponse.json({ success: true, data: report }, { status: 201 });
}
