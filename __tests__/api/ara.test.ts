import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { cleanDatabase } from "@/__tests__/helpers";
import { GET } from "@/app/api/ara/route";
import { NextRequest } from "next/server";

beforeEach(async () => {
  await cleanDatabase();
  await prisma.topic.createMany({
    data: [
      { title: "yazılım öğrenmek", slug: "yazilim-ogrenmek", entryCount: 5 },
      { title: "kitap önerileri", slug: "kitap-onerileri", entryCount: 3 },
    ],
  });
});

describe("GET /api/ara", () => {
  it("kısa query ile boş döner", async () => {
    const req = new NextRequest("http://localhost:3000/api/ara?q=a");
    const res = await GET(req);
    const json = await res.json();
    expect(json.data).toHaveLength(0);
  });

  it("başlık araması çalışır", async () => {
    const req = new NextRequest("http://localhost:3000/api/ara?q=yazılım&tip=baslik");
    const res = await GET(req);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.length).toBeGreaterThan(0);
    expect(json.data[0].title).toContain("yazılım");
  });

  it("sonuç bulamadığında boş dizi döner", async () => {
    const req = new NextRequest("http://localhost:3000/api/ara?q=olmayanbir&tip=baslik");
    const res = await GET(req);
    const json = await res.json();
    expect(json.data).toHaveLength(0);
  });
});
