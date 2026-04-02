import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  isBanned: z.boolean().optional(),
  role: z.enum(["USER", "AUTHOR", "MODERATOR", "ADMIN"]).optional(),
});

type Params = { params: Promise<{ username: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Yetkiniz yok" } },
      { status: 403 }
    );
  }

  const { username } = await params;
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Kullanici bulunamadi" } },
      { status: 404 }
    );
  }

  // Admin kendini banlayamasin
  if (user.id === session.user.id) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Kendinizi duzenleyemezsiniz" } },
      { status: 403 }
    );
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues?.[0]?.message || "Gecersiz veri";
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message } },
      { status: 400 }
    );
  }

  const data: { isBanned?: boolean; role?: "USER" | "AUTHOR" | "MODERATOR" | "ADMIN" } = {};
  if (parsed.data.isBanned !== undefined) data.isBanned = parsed.data.isBanned;
  if (parsed.data.role !== undefined) data.role = parsed.data.role;

  const updated = await prisma.user.update({
    where: { username },
    data,
    select: {
      id: true,
      username: true,
      role: true,
      isBanned: true,
    },
  });

  return NextResponse.json({ success: true, data: updated });
}
