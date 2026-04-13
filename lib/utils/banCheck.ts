import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientIp, isIpBanned } from "@/lib/utils/ipBan";

/**
 * Banlı kullanıcı kontrolü — API route'larında kullanılır
 * Session'daki isBanned güncel olmayabilir, DB'den kontrol eder
 */
export async function checkBanned(userId: string): Promise<NextResponse | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isBanned: true },
  });

  if (user?.isBanned) {
    return NextResponse.json(
      { success: false, error: { code: "BANNED", message: "Hesabınız yasaklanmış" } },
      { status: 403 }
    );
  }

  return null;
}

/**
 * IP ban kontrolü — write işlemleri öncesi çağrılır.
 * Middleware edge'de Redis ile bakıyor; bu ise DB'yi kesin kaynak olarak kullanır.
 */
export async function checkIpBanned(headers: Headers): Promise<NextResponse | null> {
  const ip = getClientIp(headers);
  if (await isIpBanned(ip)) {
    return NextResponse.json(
      { success: false, error: { code: "IP_BANNED", message: "bu ip adresinden erişim engellendi" } },
      { status: 403 }
    );
  }
  return null;
}
