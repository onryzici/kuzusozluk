import { z } from "zod";

export const yeniEntrySchema = z.object({
  content: z
    .string()
    .min(1, "Entry boş olamaz")
    .max(5000, "Entry en fazla 5000 karakter olabilir"),
});

export const entryGuncelleSchema = z.object({
  content: z
    .string()
    .min(1, "Entry boş olamaz")
    .max(5000, "Entry en fazla 5000 karakter olabilir"),
});

export type YeniEntryInput = z.infer<typeof yeniEntrySchema>;
