import { toSlug } from "./slug";

/**
 * Entry icerigini parse eder:
 * - (bkz: baslik adi) -> link
 * - http/https URL'leri -> link
 * - `baslik adi` (backtick) -> link
 * - **bold** -> strong
 * - *italic* -> italic
 * - -spoiler-text--spoiler-- -> spoiler span
 * - [gorsel: url] -> img tag
 * - @username -> kullanici profil linki
 */
export function parseEntryContent(content: string): string {
  let result = escapeHtml(content);

  // (bkz: baslik adi) -> link
  result = result.replace(
    /\(bkz:\s*([^)]+)\)/g,
    (_, title) => {
      const slug = toSlug(title.trim());
      return `<a href="/baslik/${slug}" class="bkz">(bkz: ${title.trim()})</a>`;
    }
  );

  // `baslik adi` -> link (Eksi tarzi)
  result = result.replace(
    /`([^`]+)`/g,
    (_, title) => {
      const slug = toSlug(title.trim());
      return `<a href="/baslik/${slug}" class="bkz">${title.trim()}</a>`;
    }
  );

  // -spoiler-text--spoiler-- -> spoiler (must come before URL and bold parsing)
  result = result.replace(
    /-spoiler-([\s\S]*?)--spoiler--/g,
    (_, text) =>
      `<span class="spoiler" onclick="this.classList.toggle('revealed')">${text}</span>`
  );

  // [gorsel: url] -> img tag (sanitize: only allow http/https URLs)
  result = result.replace(
    /\[gorsel:\s*(https?:\/\/[^\]\s]+)\]/g,
    (_, url) =>
      `<img src="${url}" alt="gorsel" class="max-w-full rounded-md my-2" loading="lazy" />`
  );

  // http/https URL -> link
  result = result.replace(
    /(https?:\/\/[^\s<]+)/g,
    (url) =>
      `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline break-all">${url}</a>`
  );

  // @username -> kullanici profil linki
  result = result.replace(
    /@([a-zA-Z0-9_]+)/g,
    '<a href="/kullanici/$1" class="text-primary hover:underline font-medium">@$1</a>'
  );

  // **bold** -> strong (must come before single * italic)
  result = result.replace(
    /\*\*([^*]+)\*\*/g,
    (_, text) => `<strong>${text}</strong>`
  );

  // *text* -> italic
  result = result.replace(
    /\*([^*]+)\*/g,
    (_, text) => `<em>${text}</em>`
  );

  return result;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
