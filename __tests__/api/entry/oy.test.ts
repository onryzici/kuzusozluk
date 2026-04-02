import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { cleanDatabase } from "@/__tests__/helpers";
import { POST, DELETE } from "@/app/api/entry/[id]/oy/route";
import { NextRequest } from "next/server";
import { hashSync } from "bcryptjs";

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
  handlers: { GET: vi.fn(), POST: vi.fn() },
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

let userId: string;
let entryId: string;

beforeEach(async () => {
  await cleanDatabase();
  const user = await prisma.user.create({
    data: { username: "voter", email: "voter@test.com", passwordHash: hashSync("test", 12), isActive: true },
  });
  userId = user.id;
  const topic = await prisma.topic.create({ data: { title: "oy test", slug: "oy-test" } });
  const entry = await prisma.entry.create({ data: { content: "test", authorId: userId, topicId: topic.id } });
  entryId = entry.id;
  mockAuth.mockResolvedValue({ user: { id: userId, username: "voter", role: "USER", karma: 0 } });
});

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("POST /api/entry/[id]/oy", () => {
  it("upvote yapar", async () => {
    const req = new NextRequest(`http://localhost:3000/api/entry/${entryId}/oy`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "UP" }),
    });
    const res = await POST(req, makeParams(entryId));
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.upvotes).toBe(1);
    expect(json.data.userVote).toBe("UP");
  });

  it("aynı oya tekrar tıklayınca geri çeker", async () => {
    const req1 = new NextRequest(`http://localhost:3000/api/entry/${entryId}/oy`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "UP" }),
    });
    await POST(req1, makeParams(entryId));

    const req2 = new NextRequest(`http://localhost:3000/api/entry/${entryId}/oy`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "UP" }),
    });
    const res = await POST(req2, makeParams(entryId));
    const json = await res.json();
    expect(json.data.upvotes).toBe(0);
    expect(json.data.userVote).toBeNull();
  });

  it("oy değiştirir (UP → DOWN)", async () => {
    const req1 = new NextRequest(`http://localhost:3000/api/entry/${entryId}/oy`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "UP" }),
    });
    await POST(req1, makeParams(entryId));

    const req2 = new NextRequest(`http://localhost:3000/api/entry/${entryId}/oy`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "DOWN" }),
    });
    const res = await POST(req2, makeParams(entryId));
    const json = await res.json();
    expect(json.data.upvotes).toBe(0);
    expect(json.data.downvotes).toBe(1);
    expect(json.data.userVote).toBe("DOWN");
  });
});

describe("DELETE /api/entry/[id]/oy", () => {
  it("oyu siler", async () => {
    const req1 = new NextRequest(`http://localhost:3000/api/entry/${entryId}/oy`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "UP" }),
    });
    await POST(req1, makeParams(entryId));

    const req2 = new NextRequest(`http://localhost:3000/api/entry/${entryId}/oy`, { method: "DELETE" });
    const res = await DELETE(req2, makeParams(entryId));
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.upvotes).toBe(0);
  });
});
