import { toSlug } from "./slug";

/**
 * Entry içeriğini parse eder:
 * - (bkz: başlık adı) → link
 * - `başlık adı` (backtick) → link
 * - -spoiler-metin--spoiler-- → spoiler
 * - [görsel: url] → resim
 * - [link: url](metin) → link with text
 * - http/https URL → tıklanabilir link
 * - @username → kullanıcı profil linki
 * - **kalın** → bold
 * - *italik* → italic
 */
export function parseEntryContent(content: string): string {
  let result = escapeHtml(content);

  // placeholder sistemi: parse edilen kısımları korumak için
  const placeholders: string[] = [];
  function placeholder(html: string): string {
    const idx = placeholders.length;
    placeholders.push(html);
    return `%%PH${idx}%%`;
  }

  // (bkz: başlık adı) → link
  result = result.replace(
    /\(bkz:\s*([^)]+)\)/g,
    (_, title) => {
      const slug = toSlug(title.trim());
      return placeholder(`<a href="/baslik/${slug}" class="bkz">(bkz: ${title.trim()})</a>`);
    }
  );

  // `başlık adı` → link
  result = result.replace(
    /`([^`]+)`/g,
    (_, title) => {
      const slug = toSlug(title.trim());
      return placeholder(`<a href="/baslik/${slug}" class="bkz">${title.trim()}</a>`);
    }
  );

  // -spoiler-metin--spoiler-- → spoiler
  result = result.replace(
    /-spoiler-([\s\S]*?)--spoiler--/g,
    (_, text) => placeholder(`<span class="spoiler" onclick="this.classList.toggle('revealed')">${text}</span>`)
  );

  // [görsel: url] veya [gorsel: url] → clickable thumbnail that expands/collapses
  result = result.replace(
    /\[g[oö]rsel:\s*(https?:\/\/[^\]\s]+)\]/g,
    (_, url) => placeholder(`<div class="gorsel-wrapper"><a href="javascript:void(0)" class="text-primary text-xs hover:underline" onclick="this.nextElementSibling.classList.toggle('hidden')">[görsel]</a><img src="${url}" alt="görsel" class="hidden max-w-full rounded-md my-2" loading="lazy" /></div>`)
  );

  // [metin](url) → markdown tarzı link
  result = result.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
    (_, text, url) => placeholder(`<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">${text}</a>`)
  );

  // http/https URL → tıklanabilir link (placeholder'ların içindeki URL'leri atla)
  result = result.replace(
    /(https?:\/\/[^\s<]+)/g,
    (url) => {
      // zaten placeholder içindeyse dokunma
      if (url.includes("%%PH")) return url;
      return placeholder(`<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline break-all">${url}</a>`);
    }
  );

  // @username → kullanıcı profil linki
  result = result.replace(
    /@([a-zA-Z0-9_]+)/g,
    (match, username) => placeholder(`<a href="/kullanici/${username}" class="text-primary hover:underline font-medium">@${username}</a>`)
  );

  // **kalın** → bold
  result = result.replace(
    /\*\*([^*]+)\*\*/g,
    (_, text) => `<strong>${text}</strong>`
  );

  // *italik* → italic
  result = result.replace(
    /\*([^*]+)\*/g,
    (_, text) => `<em>${text}</em>`
  );

  // placeholder'ları geri koy
  for (let i = 0; i < placeholders.length; i++) {
    result = result.replace(`%%PH${i}%%`, placeholders[i]);
  }

  return result;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
