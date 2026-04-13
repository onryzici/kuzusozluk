import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({ slug: z.string().min(1) });

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "giriş yap" } },
      { status: 401 }
    );
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "geçersiz" } },
      { status: 400 }
    );
  }

  const g = await prisma.spotGladiator.findUnique({
    where: { userId: session.user.id },
  });
  if (!g) {
    return NextResponse.json(
      { success: false, error: { code: "NO_GLADIATOR", message: "karakter yok" } },
      { status: 404 }
    );
  }

  const item = await prisma.spotEsya.findUnique({ where: { slug: parsed.data.slug } });
  if (!item) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "eşya yok" } },
      { status: 404 }
    );
  }

  // Level/stat requirement
  if (g.level < item.levelReq) {
    return NextResponse.json(
      { success: false, error: { code: "LEVEL_LOW", message: `seviye ${item.levelReq} gerekli` } },
      { status: 400 }
    );
  }
  if (g.strength < item.strReq) {
    return NextResponse.json(
      { success: false, error: { code: "STR_LOW", message: `güç ${item.strReq} gerekli` } },
      { status: 400 }
    );
  }
  if (g.agility < item.agiReq) {
    return NextResponse.json(
      { success: false, error: { code: "AGI_LOW", message: `çeviklik ${item.agiReq} gerekli` } },
      { status: 400 }
    );
  }

  // Karizma indirim
  const discountPct = Math.min(20, Math.floor(g.charisma * 0.4));
  const price = Math.round(item.price * (1 - discountPct / 100));

  if (g.gold < price) {
    return NextResponse.json(
      { success: false, error: { code: "NO_GOLD", message: `yeterli altın yok (gerekli: ${price})` } },
      { status: 400 }
    );
  }

  // İksirler birikir; equip parçaları unique envanter kaydı
  const isPotion = item.type === "POTION_HP" || item.type === "POTION_MANA";

  await prisma.$transaction([
    prisma.spotGladiator.update({
      where: { id: g.id },
      data: { gold: { decrement: price } },
    }),
    prisma.spotGladiatorEnvanter.upsert({
      where: { gladiatorId_itemId: { gladiatorId: g.id, itemId: item.id } },
      create: { gladiatorId: g.id, itemId: item.id, count: 1 },
      update: isPotion ? { count: { increment: 1 } } : {},
    }),
  ]);

  return NextResponse.json({
    success: true,
    data: { item, paid: price, discountPct },
  });
}
