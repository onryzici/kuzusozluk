import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_TOKEN", message: "Aktivasyon tokeni gerekli" } },
        { status: 400 }
      );
    }

    const emailToken = await prisma.emailToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!emailToken) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_TOKEN", message: "Geçersiz aktivasyon bağlantısı" } },
        { status: 400 }
      );
    }

    if (emailToken.type !== "ACTIVATION") {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_TOKEN", message: "Geçersiz aktivasyon bağlantısı" } },
        { status: 400 }
      );
    }

    if (emailToken.expiresAt < new Date()) {
      await prisma.emailToken.delete({ where: { id: emailToken.id } });
      return NextResponse.json(
        { success: false, error: { code: "EXPIRED_TOKEN", message: "Aktivasyon bağlantısının süresi dolmuş" } },
        { status: 400 }
      );
    }

    if (emailToken.user.isActive) {
      await prisma.emailToken.delete({ where: { id: emailToken.id } });
      return NextResponse.json(
        { success: true, data: { message: "Hesabınız zaten aktif" } }
      );
    }

    // Activate user and delete token
    await prisma.$transaction([
      prisma.user.update({
        where: { id: emailToken.userId },
        data: { isActive: true },
      }),
      prisma.emailToken.delete({ where: { id: emailToken.id } }),
    ]);

    return NextResponse.json({
      success: true,
      data: { message: "Hesabınız başarıyla aktifleştirildi" },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Sunucu hatası" } },
      { status: 500 }
    );
  }
}
