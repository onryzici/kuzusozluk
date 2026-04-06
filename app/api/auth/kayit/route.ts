import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { hashSync } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { kayitSchema } from "@/lib/validations/auth";
import { sendEmail, isSmtpConfigured } from "@/lib/email";
import { createNotification } from "@/lib/notifications";
import { checkRateLimit, rateLimiters } from "@/lib/ratelimit";
import { logAction } from "@/lib/auditLog";

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const { allowed } = await checkRateLimit(rateLimiters.kayit, ip);
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: { code: "RATE_LIMIT", message: "Çok fazla deneme. Lütfen daha sonra tekrar deneyin." } },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = kayitSchema.safeParse(body);

    if (!parsed.success) {
      const issues = parsed.error.issues ?? [];
      const message = issues.length > 0 ? issues[0].message : "Geçersiz veri";
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message } },
        { status: 400 }
      );
    }

    const { username, email, password } = parsed.data;

    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return NextResponse.json(
        { success: false, error: { code: "EMAIL_EXISTS", message: "Bu e-posta adresi zaten kullanılıyor" } },
        { status: 409 }
      );
    }

    const existingUsername = await prisma.user.findUnique({ where: { username } });
    if (existingUsername) {
      return NextResponse.json(
        { success: false, error: { code: "USERNAME_EXISTS", message: "Bu kullanıcı adı zaten kullanılıyor" } },
        { status: 409 }
      );
    }

    const passwordHash = hashSync(password, 12);

    // If SMTP is not configured (dev mode), activate immediately
    const smtpReady = isSmtpConfigured();

    // nesil hesapla: her 100 kullanıcıda nesil artar
    const totalUsers = await prisma.user.count();
    const generation = Math.floor(totalUsers / 100) + 1;

    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        isActive: !smtpReady,
        generation,
      },
      select: { id: true, username: true, email: true, createdAt: true },
    });

    // Generate activation token and send email
    const token = randomUUID();
    await prisma.emailToken.create({
      data: {
        token,
        type: "ACTIVATION",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        userId: user.id,
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const activationLink = `${baseUrl}/aktivasyon?token=${token}`;

    await sendEmail(
      email,
      "Hesabınızı Aktifleştirin - Sözlük",
      `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Hoş geldiniz, ${username}!</h2>
        <p>Hesabınızı aktifleştirmek için aşağıdaki bağlantıya tıklayın:</p>
        <p>
          <a href="${activationLink}"
             style="display: inline-block; padding: 12px 24px; background-color: #2d6a4f; color: white; text-decoration: none; border-radius: 6px;">
            Hesabımı Aktifleştir
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">Bu bağlantı 24 saat geçerlidir.</p>
        <p style="color: #666; font-size: 14px;">Bu e-postayı siz istemediyseniz, lütfen dikkate almayın.</p>
      </div>
      `
    );

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || null;
    await logAction("REGISTER", user.id, `yeni kayit: ${username}`, ip);

    // tüm adminlere yeni üye bildirimi
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    });
    for (const admin of admins) {
      await createNotification({
        type: "FOLLOW",
        content: `yeni üye oldu: ${username}`,
        link: `/kullanici/${username}`,
        userId: admin.id,
        actorId: user.id,
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          ...user,
          message: smtpReady
            ? "kayıt başarılı. lütfen e-posta adresinizi kontrol edin."
            : "kayıt başarılı.",
        },
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Sunucu hatası" } },
      { status: 500 }
    );
  }
}
