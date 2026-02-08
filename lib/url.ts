/**
 * Normalize a website/link value so it can be used as a valid href.
 * Accepts "example.com" or "www.example.com" and returns "https://example.com".
 * If the value already has http:// or https://, returns it unchanged (trimmed).
 */
export function normalizeWebsiteUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.toLowerCase().startsWith('http://') || trimmed.toLowerCase().startsWith('https://')) {
    return trimmed;
  }
  return `https://${trimmed}`;
}
