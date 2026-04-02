/**
 * XSS koruması — tehlikeli içerik temizleme
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/javascript:/gi, "")
    .replace(/on\w+=/gi, "")
    .replace(/<script/gi, "")
    .replace(/<\/script/gi, "");
}

/**
 * Yasaklı kelime listesi — bu kelimeleri içeren içerikler engellenir
 */
const YASAKLI_KELIMELER = [
  "kürdistan",
  "kurdistan",
  "abdullah öcalan",
  "abdullah ocalan",
  "apo",
  "fetullah gülen",
  "fetullah gulen",
  "fethullah gülen",
  "fethullah gulen",
  "pkk",
  "fetö",
  "feto",
];

/**
 * İçerikte yasaklı kelime var mı kontrol eder
 * @returns yasaklı kelime varsa kelimeyi döner, yoksa null
 */
export function checkYasakliKelime(text: string): string | null {
  const lower = text.toLowerCase();
  for (const kelime of YASAKLI_KELIMELER) {
    if (lower.includes(kelime)) {
      return kelime;
    }
  }
  return null;
}
