import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getEquippedBonuses, syncCurrentVitals } from "@/lib/gladiator/helpers";

const schema = z.object({
  stat: z.enum(["strength", "agility", "vitality", "intelligence", "charisma"]),
  amount: z.number().int().min(1).max(10),
});

export async function PATCH(request: NextRequest) {
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
      { success: false, error: { code: "VALIDATION_ERROR", message: "geçersiz veri" } },
      { status: 400 }
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

  if (g.statPoints < parsed.data.amount) {
    return NextResponse.json(
      { success: false, error: { code: "NO_POINTS", message: "yeterli stat puanı yok" } },
      { status: 400 }
    );
  }

  const update: Record<string, number> = { statPoints: g.statPoints - parsed.data.amount };
  update[parsed.data.stat] = g[parsed.data.stat] + parsed.data.amount;

  // Yeni stat ile max vital'ları güncelle, current'ı da doldur
  const newStats = {
    strength: parsed.data.stat === "strength" ? g.strength + parsed.data.amount : g.strength,
    agility: parsed.data.stat === "agility" ? g.agility + parsed.data.amount : g.agility,
    vitality: parsed.data.stat === "vitality" ? g.vitality + parsed.data.amount : g.vitality,
    intelligence: parsed.data.stat === "intelligence" ? g.intelligence + parsed.data.amount : g.intelligence,
  };
  const equip = await getEquippedBonuses(g.id);
  const vitals = syncCurrentVitals(newStats, equip, g.level);
  Object.assign(update, vitals);

  const updated = await prisma.spotGladiator.update({
    where: { id: g.id },
    data: update,
  });

  return NextResponse.json({ success: true, data: updated });
}
