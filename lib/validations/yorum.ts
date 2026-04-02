import { z } from "zod";

export const yorumSchema = z.object({
  content: z
    .string()
    .min(1, "Yorum boş olamaz")
    .max(1000, "Yorum en fazla 1000 karakter olabilir"),
});

export type YorumInput = z.infer<typeof yorumSchema>;
