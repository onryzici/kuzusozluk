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

  const yetenekler = await prisma.spotYetenek.findMany({
    orderBy: [{ branch: "asc" }, { levelReq: "asc" }],
  });
  return NextResponse.json({ success: true, data: yetenekler });
}
