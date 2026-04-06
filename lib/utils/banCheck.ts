import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
