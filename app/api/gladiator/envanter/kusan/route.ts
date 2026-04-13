import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getEquippedBonuses, syncCurrentVitals } from "@/lib/gladiator/helpers";

const schema = z.object({
  slug: z.string().min(1),
  action: z.enum(["equip", "unequip"]).default("equip"),
});

const slotMap: Record<string, keyof {
  weaponItemId: null;
  armorItemId: null;
  helmetItemId: null;
  shieldItemId: null;
  bootsItemId: null;
}> = {
  WEAPON: "weaponItemId",
  ARMOR: "armorItemId",
  HELMET: "helmetItemId",
  SHIELD: "shieldItemId",
  BOOTS: "bootsItemId",
};

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
    include: { equipped: true },
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
  if (item.type === "POTION_HP" || item.type === "POTION_MANA") {
    return NextResponse.json(
      { success: false, error: { code: "NOT_EQUIPPABLE", message: "iksir kuşanılmaz" } },
      { status: 400 }
    );
  }

  // Envanter kontrolü
  const inv = await prisma.spotGladiatorEnvanter.findUnique({
    where: { gladiatorId_itemId: { gladiatorId: g.id, itemId: item.id } },
  });
  if (!inv) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_OWNED", message: "bu eşya sende yok" } },
      { status: 400 }
    );
  }

  const slotKey = slotMap[item.type];
  if (!slotKey) {
    return NextResponse.json(
      { success: false, error: { code: "BAD_SLOT", message: "geçersiz slot" } },
      { status: 400 }
    );
  }

  // Equipped kaydı
  let equipped = g.equipped;
  if (!equipped) {
    equipped = await prisma.spotGladiatorKusanmis.create({ data: { gladiatorId: g.id } });
  }

  const updateData: Record<string, string | null> = {};
  updateData[slotKey as string] = parsed.data.action === "equip" ? item.id : null;

  await prisma.spotGladiatorKusanmis.update({
    where: { id: equipped.id },
    data: updateData,
  });

  // Güncellenmiş equipment ile vital'ları senkronize et
  const newEquip = await getEquippedBonuses(g.id);
  const vitals = syncCurrentVitals(
    { strength: g.strength, agility: g.agility, vitality: g.vitality, intelligence: g.intelligence },
    newEquip
  );
  const updated = await prisma.spotGladiator.update({
    where: { id: g.id },
    data: vitals,
    include: { equipped: true, envanter: { include: { item: true } } },
  });

  return NextResponse.json({ success: true, data: updated });
}
