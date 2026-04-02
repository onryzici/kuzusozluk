import { z } from "zod";

export const mesajSchema = z.object({
  content: z
    .string()
    .min(1, "Mesaj boş olamaz")
    .max(2000, "Mesaj en fazla 2000 karakter olabilir"),
  receiverUsername: z
    .string()
    .min(1, "Alıcı kullanıcı adı gerekli"),
});

export type MesajInput = z.infer<typeof mesajSchema>;
