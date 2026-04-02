import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { cleanDatabase } from "@/__tests__/helpers";
import { GET, PATCH, DELETE } from "@/app/api/entry/[id]/route";
import { NextRequest } from "next/server";
import { hashSync } from "bcryptjs";

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
  handlers: { GET: vi.fn(), POST: vi.fn() },
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

let testUser: { id: string };
let testEntry: { id: string };

beforeEach(async () => {
  await cleanDatabase();
  testUser = await prisma.user.create({
    data: { username: "testuser", email: "test@test.com", passwordHash: hashSync("test123", 12), isActive: true, role: "AUTHOR" },
  });
  const testTopic = await prisma.topic.create({
    data: { title: "test başlık", slug: "test-baslik", entryCount: 1 },
  });
  testEntry = await prisma.entry.create({
    data: { content: "Test entry içeriği", authorId: testUser.id, topicId: testTopic.id },
  });
});

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/entry/[id]", () => {
  it("entry döner", async () => {
    const req = new NextRequest(`http://localhost:3000/api/entry/${testEntry.id}`);
    const res = await GET(req, makeParams(testEntry.id));
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.content).toBe("Test entry içeriği");
  });

  it("olmayan entry için 404 döner", async () => {
    const req = new NextRequest("http://localhost:3000/api/entry/nonexistent");
    const res = await GET(req, makeParams("nonexistent"));
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/entry/[id]", () => {
  it("kendi entrysini günceller", async () => {
    mockAuth.mockResolvedValue({ user: { id: testUser.id, username: "testuser", role: "AUTHOR", karma: 0 } });
    const req = new NextRequest(`http://localhost:3000/api/entry/${testEntry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "Güncellenmiş" }),
    });
    const res = await PATCH(req, makeParams(testEntry.id));
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.content).toBe("Güncellenmiş");
    expect(json.data.isEdited).toBe(true);
  });

  it("auth olmadan 401 döner", async () => {
    mockAuth.mockResolvedValue(null);
    const req = new NextRequest(`http://localhost:3000/api/entry/${testEntry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "test" }),
    });
    const res = await PATCH(req, makeParams(testEntry.id));
    expect(res.status).toBe(401);
  });
});

describe("DELETE /api/entry/[id]", () => {
  it("kendi entrysini siler", async () => {
    mockAuth.mockResolvedValue({ user: { id: testUser.id, username: "testuser", role: "AUTHOR", karma: 0 } });
    const req = new NextRequest(`http://localhost:3000/api/entry/${testEntry.id}`, { method: "DELETE" });
    const res = await DELETE(req, makeParams(testEntry.id));
    expect((await res.json()).success).toBe(true);
  });

  it("başkasının entrysini silemez", async () => {
    const other = await prisma.user.create({
      data: { username: "other", email: "other@test.com", passwordHash: hashSync("test123", 12), isActive: true },
    });
    mockAuth.mockResolvedValue({ user: { id: other.id, username: "other", role: "USER", karma: 0 } });
    const req = new NextRequest(`http://localhost:3000/api/entry/${testEntry.id}`, { method: "DELETE" });
    const res = await DELETE(req, makeParams(testEntry.id));
    expect(res.status).toBe(403);
  });
});
