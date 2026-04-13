import { prisma } from "@/lib/prisma";

export type AuditAction =
  | "ENTRY_CREATE"
  | "ENTRY_DELETE"
  | "ENTRY_EDIT"
  | "TOPIC_CREATE"
  | "TOPIC_DELETE"
  | "TOPIC_LOCK"
  | "TOPIC_PIN"
  | "USER_BAN"
  | "USER_UNBAN"
  | "USER_ROLE_CHANGE"
  | "USER_DELETE"
  | "COMMENT_CREATE"
  | "COMMENT_DELETE"
  | "MESSAGE_SEND"
  | "REPORT_REVIEW"
  | "LOGIN"
  | "REGISTER"
  | "AUTHOR_PURGE"
  | "AVATAR_MIGRATE";

export async function logAction(
  action: AuditAction,
  userId: string,
  detail: string,
  ip?: string | null
) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        userId,
        detail,
        ip: ip || null,
      },
    });
  } catch {
    // log hatası uygulamayı durdurmamalı
  }
}
