/** Small pure display helpers. */

export const LONG_SLOT_CHARS = 72;

export function formatWhen(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function previewLine(text, max = 48) {
  const one = String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!one) return 'Empty — click to fill';
  return one.length > max ? one.slice(0, max - 1) + '…' : one;
}

export function formatCount(text) {
  const n = String(text || '').length;
  if (n === 0) return 'Empty';
  if (n < 1000) return `${n} chars`;
  return `${(n / 1000).toFixed(1)}k chars`;
}

export function isLongValue(val) {
  const s = String(val || '');
  return Boolean(s) && (s.length > LONG_SLOT_CHARS || s.includes('\n'));
}

export function sanitizeLabel(raw) {
  return String(raw || '')
    .trim()
    .replace(/\s+/g, '_');
}
