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

  const skill = await prisma.spotYetenek.findUnique({ where: { slug: parsed.data.slug } });
  if (!skill) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "yetenek yok" } },
      { status: 404 }
    );
  }

  if (g.skillPoints < 1) {
    return NextResponse.json(
      { success: false, error: { code: "NO_POINTS", message: "yetenek puanın yok" } },
      { status: 400 }
    );
  }
  // Level gate YOK — sadece stat gereklilikleri
  if (g.strength < skill.strReq || g.agility < skill.agiReq || g.intelligence < skill.intReq) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "STAT_LOW",
          message: `gereken statlar: güç ${skill.strReq}, çeviklik ${skill.agiReq}, zeka ${skill.intReq}`,
        },
      },
      { status: 400 }
    );
  }

  const already = await prisma.spotGladiatorOgrenilen.findUnique({
    where: { gladiatorId_skillId: { gladiatorId: g.id, skillId: skill.id } },
  });
  if (already) {
    return NextResponse.json(
      { success: false, error: { code: "ALREADY", message: "bu yeteneği zaten biliyorsun" } },
      { status: 400 }
    );
  }

  await prisma.$transaction([
    prisma.spotGladiatorOgrenilen.create({
      data: { gladiatorId: g.id, skillId: skill.id },
    }),
    prisma.spotGladiator.update({
      where: { id: g.id },
      data: { skillPoints: { decrement: 1 } },
    }),
  ]);

  return NextResponse.json({ success: true, data: { skill } });
}
