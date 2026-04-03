/**
 * XSS koruması
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/javascript:/gi, "")
    .replace(/on\w+=/gi, "")
    .replace(/<script/gi, "")
    .replace(/<\/script/gi, "");
}

/**
 * Yasaklı kelime listesi — runtime'da admin tarafından güncellenebilir
 */
let yasakliKelimeler: string[] = [
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

export function getYasakliKelimeler(): string[] {
  return [...yasakliKelimeler];
}

export function addYasakliKelime(kelime: string): void {
  const lower = kelime.toLowerCase().trim();
  if (lower && !yasakliKelimeler.includes(lower)) {
    yasakliKelimeler.push(lower);
  }
}

export function removeYasakliKelime(kelime: string): void {
  yasakliKelimeler = yasakliKelimeler.filter((k) => k !== kelime.toLowerCase().trim());
}

export function checkYasakliKelime(text: string): string | null {
  const lower = text.toLowerCase();
  for (const kelime of yasakliKelimeler) {
    if (lower.includes(kelime)) {
      return kelime;
    }
  }
  return null;
}
