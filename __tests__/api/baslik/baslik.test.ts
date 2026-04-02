import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { cleanDatabase } from "@/__tests__/helpers";
import { GET } from "@/app/api/baslik/route";
import { GET as GET_DETAIL } from "@/app/api/baslik/[slug]/route";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue(null),
  handlers: { GET: vi.fn(), POST: vi.fn() },
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

beforeEach(async () => {
  await cleanDatabase();
  await prisma.topic.createMany({
    data: [
      { title: "test başlık 1", slug: "test-baslik-1", entryCount: 5, dayCount: 3 },
      { title: "test başlık 2", slug: "test-baslik-2", entryCount: 10, dayCount: 7 },
      { title: "test başlık 3", slug: "test-baslik-3", entryCount: 2, dayCount: 1 },
    ],
  });
});

describe("GET /api/baslik", () => {
  it("başlıkları listeler", async () => {
    const req = new NextRequest("http://localhost:3000/api/baslik");
    const res = await GET(req);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.length).toBe(3);
  });

  it("gündem sıralaması dayCount'a göre", async () => {
    const req = new NextRequest("http://localhost:3000/api/baslik?siralama=gundem");
    const res = await GET(req);
    const json = await res.json();
    expect(json.data[0].slug).toBe("test-baslik-2");
  });

  it("sayfalama çalışır", async () => {
    const req = new NextRequest("http://localhost:3000/api/baslik?boyut=2&sayfa=1");
    const res = await GET(req);
    const json = await res.json();
    expect(json.data.length).toBe(2);
    expect(json.meta.hasMore).toBe(true);
  });
});

describe("GET /api/baslik/[slug]", () => {
  it("mevcut başlığı döner", async () => {
    const req = new NextRequest("http://localhost:3000/api/baslik/test-baslik-1");
    const res = await GET_DETAIL(req, { params: Promise.resolve({ slug: "test-baslik-1" }) });
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.title).toBe("test başlık 1");
  });

  it("olmayan başlık için 404 döner", async () => {
    const req = new NextRequest("http://localhost:3000/api/baslik/yok");
    const res = await GET_DETAIL(req, { params: Promise.resolve({ slug: "yok" }) });
    expect(res.status).toBe(404);
  });
});
