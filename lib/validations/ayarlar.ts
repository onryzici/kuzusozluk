import { z } from "zod";

export const ayarlarSchema = z
  .object({
    displayName: z
      .string()
      .max(50, "Görünen ad en fazla 50 karakter olabilir")
      .optional()
      .or(z.literal("")),
    bio: z
      .string()
      .max(500, "Biyografi en fazla 500 karakter olabilir")
      .optional()
      .or(z.literal("")),
    currentPassword: z.string().optional().or(z.literal("")),
    newPassword: z
      .string()
      .min(8, "Yeni şifre en az 8 karakter olmalı")
      .max(100, "Yeni şifre en fazla 100 karakter olmalı")
      .optional()
      .or(z.literal("")),
  })
  .refine(
    (data) => {
      // If newPassword is provided, currentPassword must also be provided
      if (data.newPassword && data.newPassword.length > 0) {
        return data.currentPassword && data.currentPassword.length > 0;
      }
      return true;
    },
    {
      message: "Şifre değiştirmek için mevcut şifrenizi girmelisiniz",
      path: ["currentPassword"],
    }
  );

export type AyarlarInput = z.infer<typeof ayarlarSchema>;
