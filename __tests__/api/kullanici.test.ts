import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { cleanDatabase } from "@/__tests__/helpers";
import { GET } from "@/app/api/kullanici/[username]/route";
import { POST, DELETE } from "@/app/api/kullanici/[username]/takip/route";
import { NextRequest } from "next/server";
import { hashSync } from "bcryptjs";

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
  handlers: { GET: vi.fn(), POST: vi.fn() },
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

let user1Id: string;
let user2Id: string;

beforeEach(async () => {
  await cleanDatabase();
  const u1 = await prisma.user.create({
    data: { username: "user1", email: "u1@test.com", passwordHash: hashSync("test", 12), isActive: true, karma: 50, entryCount: 5 },
  });
  const u2 = await prisma.user.create({
    data: { username: "user2", email: "u2@test.com", passwordHash: hashSync("test", 12), isActive: true },
  });
  user1Id = u1.id;
  user2Id = u2.id;
});

function makeParams(username: string) {
  return { params: Promise.resolve({ username }) };
}

describe("GET /api/kullanici/[username]", () => {
  it("kullanıcı bilgisini döner", async () => {
    const req = new NextRequest("http://localhost:3000/api/kullanici/user1");
    const res = await GET(req, makeParams("user1"));
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.username).toBe("user1");
    expect(json.data.karma).toBe(50);
  });

  it("olmayan kullanıcı için 404", async () => {
    const req = new NextRequest("http://localhost:3000/api/kullanici/yok");
    const res = await GET(req, makeParams("yok"));
    expect(res.status).toBe(404);
  });
});

describe("POST /api/kullanici/[username]/takip", () => {
  it("takip eder", async () => {
    mockAuth.mockResolvedValue({ user: { id: user1Id, username: "user1", role: "USER", karma: 0 } });
    const req = new NextRequest("http://localhost:3000/api/kullanici/user2/takip", { method: "POST" });
    const res = await POST(req, makeParams("user2"));
    const json = await res.json();
    expect(res.status).toBe(201);
    expect(json.data.following).toBe(true);
  });

  it("kendini takip edemez", async () => {
    mockAuth.mockResolvedValue({ user: { id: user1Id, username: "user1", role: "USER", karma: 0 } });
    const req = new NextRequest("http://localhost:3000/api/kullanici/user1/takip", { method: "POST" });
    const res = await POST(req, makeParams("user1"));
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/kullanici/[username]/takip", () => {
  it("takipten çıkar", async () => {
    mockAuth.mockResolvedValue({ user: { id: user1Id, username: "user1", role: "USER", karma: 0 } });
    // Önce takip et
    await prisma.follow.create({ data: { followerId: user1Id, followingId: user2Id } });

    const req = new NextRequest("http://localhost:3000/api/kullanici/user2/takip", { method: "DELETE" });
    const res = await DELETE(req, makeParams("user2"));
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.following).toBe(false);
  });
});
