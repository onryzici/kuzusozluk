import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "giriş yap" } },
      { status: 401 }
    );
  }

  const items = await prisma.spotEsya.findMany({
    orderBy: [{ type: "asc" }, { levelReq: "asc" }, { price: "asc" }],
  });

  return NextResponse.json({ success: true, data: items });
}
