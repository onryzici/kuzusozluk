import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { syncCurrentVitals } from "@/lib/gladiator/helpers";

const createSchema = z.object({
  name: z.string().min(2).max(40),
  skinTone: z.number().int().min(0).max(3).default(1),
  hairStyle: z.number().int().min(0).max(4).default(0),
  hairColor: z.number().int().min(0).max(5).default(0),
  armorTint: z.number().int().min(0).max(5).default(0),
  weaponTint: z.number().int().min(0).max(5).default(0),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "giriş yap" } },
      { status: 401 }
    );
  }

  const g = await prisma.spotGladiator.findUnique({
    where: { userId: session.user.id },
    include: {
      equipped: true,
      envanter: { include: { item: true } },
      ogrenilen: { include: { skill: true } },
    },
  });

  return NextResponse.json({ success: true, data: g });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "giriş yap" } },
      { status: 401 }
    );
  }

  const existing = await prisma.spotGladiator.findUnique({
    where: { userId: session.user.id },
  });
  if (existing) {
    return NextResponse.json(
      { success: false, error: { code: "EXISTS", message: "zaten gladyatörün var" } },
      { status: 409 }
    );
  }

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message || "geçersiz veri" } },
      { status: 400 }
    );
  }

  const baseStats = { strength: 5, agility: 5, vitality: 5, intelligence: 5 };
  const vitals = syncCurrentVitals(
    baseStats,
    { attackBonus: 0, defenseBonus: 0, hpBonus: 0, manaBonus: 0, critBonus: 0, dodgeBonus: 0 },
    1
  );

  const g = await prisma.spotGladiator.create({
    data: {
      userId: session.user.id,
      name: parsed.data.name.toLowerCase(),
      skinTone: parsed.data.skinTone,
      hairStyle: parsed.data.hairStyle,
      hairColor: parsed.data.hairColor,
      armorTint: parsed.data.armorTint,
      weaponTint: parsed.data.weaponTint,
      ...vitals,
      equipped: { create: {} },
    },
    include: { equipped: true },
  });

  return NextResponse.json({ success: true, data: g }, { status: 201 });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "giriş yap" } },
      { status: 401 }
    );
  }

  const g = await prisma.spotGladiator.findUnique({
    where: { userId: session.user.id },
  });
  if (!g) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "gladyatör yok" } },
      { status: 404 }
    );
  }

  await prisma.spotGladiator.delete({ where: { id: g.id } });
  return NextResponse.json({ success: true });
}
