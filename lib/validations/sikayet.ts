import { z } from "zod";

export const sikayetSchema = z.object({
  reason: z
    .string()
    .min(5, "Sikayet nedeni en az 5 karakter olmali")
    .max(500, "Sikayet nedeni en fazla 500 karakter olmali"),
});
