/**
 * Validate that content doesn't contain XSS vectors beyond what escapeHtml handles.
 * Strips javascript: URIs, inline event handlers, and script tags.
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/javascript:/gi, "")
    .replace(/on\w+=/gi, "")
    .replace(/<script/gi, "")
    .replace(/<\/script/gi, "");
}
