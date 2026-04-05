import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;

  const upload = await prisma.upload.findUnique({
    where: { id },
    select: { data: true, mimeType: true },
  });

  if (!upload) {
    return new NextResponse("not found", { status: 404 });
  }

  return new NextResponse(upload.data, {
    headers: {
      "Content-Type": upload.mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
