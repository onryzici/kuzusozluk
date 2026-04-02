import { NextResponse } from "next/server";
import { hashSync } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const sifreYenileSchema = z.object({
  token: z.string().min(1, "Token gerekli"),
  password: z
    .string()
    .min(6, "Şifre en az 6 karakter olmalı")
    .max(100, "Şifre en fazla 100 karakter olmalı"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = sifreYenileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message || "Geçersiz veri" } },
        { status: 400 }
      );
    }

    const { token, password } = parsed.data;

    const emailToken = await prisma.emailToken.findUnique({
      where: { token },
    });

    if (!emailToken) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_TOKEN", message: "Geçersiz veya süresi dolmuş bağlantı" } },
        { status: 400 }
      );
    }

    if (emailToken.type !== "PASSWORD_RESET") {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_TOKEN", message: "Geçersiz bağlantı" } },
        { status: 400 }
      );
    }

    if (emailToken.expiresAt < new Date()) {
      await prisma.emailToken.delete({ where: { id: emailToken.id } });
      return NextResponse.json(
        { success: false, error: { code: "EXPIRED_TOKEN", message: "Bağlantının süresi dolmuş. Lütfen yeni bir şifre sıfırlama isteği gönderin." } },
        { status: 400 }
      );
    }

    const passwordHash = hashSync(password, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: emailToken.userId },
        data: { passwordHash },
      }),
      prisma.emailToken.delete({ where: { id: emailToken.id } }),
    ]);

    return NextResponse.json({
      success: true,
      data: { message: "Şifreniz başarıyla güncellendi. Yeni şifrenizle giriş yapabilirsiniz." },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Sunucu hatası" } },
      { status: 500 }
    );
  }
}
