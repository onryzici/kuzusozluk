import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";

const ALGORITHM = "aes-256-gcm";
const SECRET = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "";

/**
 * iki kullanıcı arasındaki konuşma için deterministik anahtar üretir
 * admin dahil kimse DB'den düz metin okuyamaz
 */
function deriveKey(userId1: string, userId2: string): Buffer {
  const sorted = [userId1, userId2].sort().join(":");
  return createHash("sha256").update(SECRET + ":" + sorted).digest();
}

export function encryptMessage(text: string, senderId: string, receiverId: string): string {
  const key = deriveKey(senderId, receiverId);
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  // iv:authTag:encrypted formatında sakla
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

export function decryptMessage(encryptedText: string, senderId: string, receiverId: string): string {
  try {
    const [ivHex, authTagHex, encrypted] = encryptedText.split(":");
    if (!ivHex || !authTagHex || !encrypted) return encryptedText; // şifrelenmemiş eski mesaj

    const key = deriveKey(senderId, receiverId);
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    return encryptedText; // çözülemezse olduğu gibi döndür (eski mesajlar için)
  }
}
