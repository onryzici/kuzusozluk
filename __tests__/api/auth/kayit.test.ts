import { describe, it, expect, beforeEach, vi } from "vitest";
import { cleanDatabase } from "@/__tests__/helpers";
import { POST } from "@/app/api/auth/kayit/route";

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
  isSmtpConfigured: vi.fn().mockReturnValue(false),
}));

function makeRequest(body: Record<string, unknown>) {
  return new Request("http://localhost:3000/api/auth/kayit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(async () => {
  await cleanDatabase();
});

describe("POST /api/auth/kayit", () => {
  it("başarılı kayıt oluşturur", async () => {
    const res = await POST(makeRequest({
      username: "testuser",
      email: "test@example.com",
      password: "Test123!",
    }));
    const json = await res.json();
    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.username).toBe("testuser");
  });

  it("geçersiz e-posta ile 400 döner", async () => {
    const res = await POST(makeRequest({
      username: "testuser",
      email: "invalid",
      password: "Test123!",
    }));
    expect(res.status).toBe(400);
  });

  it("kısa kullanıcı adı ile 400 döner", async () => {
    const res = await POST(makeRequest({
      username: "ab",
      email: "test@example.com",
      password: "Test123!",
    }));
    expect(res.status).toBe(400);
  });

  it("mevcut e-posta ile 409 döner", async () => {
    await POST(makeRequest({ username: "user1", email: "same@example.com", password: "Test123!" }));
    const res = await POST(makeRequest({ username: "user2", email: "same@example.com", password: "Test123!" }));
    const json = await res.json();
    expect(res.status).toBe(409);
    expect(json.error.code).toBe("EMAIL_EXISTS");
  });

  it("mevcut kullanıcı adı ile 409 döner", async () => {
    await POST(makeRequest({ username: "sameuser", email: "u1@example.com", password: "Test123!" }));
    const res = await POST(makeRequest({ username: "sameuser", email: "u2@example.com", password: "Test123!" }));
    const json = await res.json();
    expect(res.status).toBe(409);
    expect(json.error.code).toBe("USERNAME_EXISTS");
  });
});
