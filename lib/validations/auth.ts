import { z } from "zod";

export const kayitSchema = z.object({
  username: z
    .string()
    .min(3, "Kullanıcı adı en az 3 karakter olmalı")
    .max(30, "Kullanıcı adı en fazla 30 karakter olmalı")
    .regex(/^[a-zA-Z0-9_]+$/, "Sadece harf, rakam ve alt çizgi kullanılabilir"),
  email: z.string().email("Geçerli bir e-posta adresi girin"),
  password: z
    .string()
    .min(8, "Şifre en az 8 karakter olmalı")
    .max(100, "Şifre en fazla 100 karakter olmalı")
    .regex(/[A-Z]/, "Şifre en az bir büyük harf içermeli")
    .regex(/[a-z]/, "Şifre en az bir küçük harf içermeli")
    .regex(/[0-9]/, "Şifre en az bir rakam içermeli"),
});

export const girisSchema = z.object({
  email: z.string().email("Geçerli bir e-posta adresi girin"),
  password: z.string().min(1, "Şifre gerekli"),
});

export type KayitInput = z.infer<typeof kayitSchema>;
export type GirisInput = z.infer<typeof girisSchema>;
