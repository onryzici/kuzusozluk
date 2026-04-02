import { z } from "zod";

export const yeniBaslikSchema = z.object({
  title: z
    .string()
    .min(3, "Başlık en az 3 karakter olmalı")
    .max(200, "Başlık en fazla 200 karakter olmalı"),
  description: z.string().max(500).optional(),
});

export type YeniBaslikInput = z.infer<typeof yeniBaslikSchema>;
