import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

const sifreSifirlaSchema = z.object({
  email: z.string().email("Geçerli bir e-posta adresi girin"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = sifreSifirlaSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message || "Geçersiz veri" } },
        { status: 400 }
      );
    }

    const { email } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        success: true,
        data: { message: "Eğer bu e-posta adresine kayıtlı bir hesap varsa, şifre sıfırlama bağlantısı gönderildi." },
      });
    }

    // Delete any existing password reset tokens for this user
    await prisma.emailToken.deleteMany({
      where: { userId: user.id, type: "PASSWORD_RESET" },
    });

    const token = randomUUID();
    await prisma.emailToken.create({
      data: {
        token,
        type: "PASSWORD_RESET",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        userId: user.id,
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const resetLink = `${baseUrl}/sifre-sifirla?token=${token}`;

    await sendEmail(
      email,
      "Şifre Sıfırlama - Sözlük",
      `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Şifre Sıfırlama İsteği</h2>
        <p>Şifrenizi sıfırlamak için aşağıdaki bağlantıya tıklayın:</p>
        <p>
          <a href="${resetLink}"
             style="display: inline-block; padding: 12px 24px; background-color: #2d6a4f; color: white; text-decoration: none; border-radius: 6px;">
            Şifremi Sıfırla
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">Bu bağlantı 1 saat geçerlidir.</p>
        <p style="color: #666; font-size: 14px;">Bu e-postayı siz istemediyseniz, lütfen dikkate almayın.</p>
      </div>
      `
    );

    return NextResponse.json({
      success: true,
      data: { message: "Eğer bu e-posta adresine kayıtlı bir hesap varsa, şifre sıfırlama bağlantısı gönderildi." },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Sunucu hatası" } },
      { status: 500 }
    );
  }
}
