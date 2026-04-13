import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

const IP_BAN_TTL = 60 * 60 * 24 * 365; // 1 yıl

export function getClientIp(headers: Headers): string | null {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const real = headers.get("x-real-ip");
  if (real) return real.trim();
  return null;
}

export async function isIpBanned(ip: string | null): Promise<boolean> {
  if (!ip) return false;
  const hit = await prisma.bannedIp.findUnique({ where: { ipAddress: ip } });
  return !!hit;
}

async function writeIpCache(ip: string) {
  if (!redis) return;
  try {
    await redis.set(`ipban:${ip}`, 1, { ex: IP_BAN_TTL });
  } catch {}
}

async function removeIpCache(ip: string) {
  if (!redis) return;
  try {
    await redis.del(`ipban:${ip}`);
  } catch {}
}

export async function banIp(
  ip: string,
  adminId: string,
  userId?: string,
  reason?: string
): Promise<void> {
  await prisma.bannedIp.upsert({
    where: { ipAddress: ip },
    create: { ipAddress: ip, bannedBy: adminId, userId, reason },
    update: { bannedBy: adminId, userId, reason },
  });
  await writeIpCache(ip);
}

export async function banIpsForUser(
  userId: string,
  adminId: string,
  reason?: string
): Promise<number> {
  const rows = await prisma.auditLog.findMany({
    where: { userId, ip: { not: null } },
    select: { ip: true },
    distinct: ["ip"],
  });
  const ips = Array.from(
    new Set(rows.map((r) => r.ip).filter((v): v is string => !!v))
  );
  if (ips.length === 0) return 0;

  await prisma.bannedIp.createMany({
    data: ips.map((ip) => ({
      ipAddress: ip,
      bannedBy: adminId,
      userId,
      reason,
    })),
    skipDuplicates: true,
  });
  await Promise.all(ips.map(writeIpCache));
  return ips.length;
}

export async function unbanIpsForUser(userId: string): Promise<number> {
  const rows = await prisma.bannedIp.findMany({
    where: { userId },
    select: { ipAddress: true },
  });
  if (rows.length === 0) return 0;
  await prisma.bannedIp.deleteMany({ where: { userId } });
  await Promise.all(rows.map((r) => removeIpCache(r.ipAddress)));
  return rows.length;
}
