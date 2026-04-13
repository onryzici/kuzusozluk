import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DUSMANLAR, ESYALAR, YETENEKLER } from "@/lib/gladiator/seedData";

// Admin-only: gladyatör katalogunu seed eder.
// Idempotent — upsert ile çalışır. Yeniden çağırmak güvenli.
export async function POST() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "yetkin yok" } },
      { status: 403 }
    );
  }

  // Düşmanlar
  for (const d of DUSMANLAR) {
    await prisma.spotDusman.upsert({
      where: { slug: d.slug },
      create: d,
      update: d,
    });
  }

  // Eşyalar
  for (const e of ESYALAR) {
    await prisma.spotEsya.upsert({
      where: { slug: e.slug },
      create: e,
      update: e,
    });
  }

  // Yetenekler
  for (const y of YETENEKLER) {
    await prisma.spotYetenek.upsert({
      where: { slug: y.slug },
      create: y,
      update: y,
    });
  }

  return NextResponse.json({
    success: true,
    data: {
      dusman: DUSMANLAR.length,
      esya: ESYALAR.length,
      yetenek: YETENEKLER.length,
    },
  });
}
