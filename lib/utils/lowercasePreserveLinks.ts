/**
 * Metni lowercase yapar ama URL'leri (http/https) olduğu gibi bırakır.
 */
export function lowercasePreserveLinks(text: string): string {
  const urlRegex = /https?:\/\/[^\s\])]*/g;
  const urls: { start: number; end: number; value: string }[] = [];

  let match;
  while ((match = urlRegex.exec(text)) !== null) {
    urls.push({ start: match.index, end: match.index + match[0].length, value: match[0] });
  }

  let result = text.toLowerCase();

  // Lowercase'den sonra URL'leri orijinal halleriyle geri koy
  for (const url of urls) {
    result = result.slice(0, url.start) + url.value + result.slice(url.end);
  }

  return result;
}
