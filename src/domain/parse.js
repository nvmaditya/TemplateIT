/**
 * Parse prompt bodies containing <<<{label}>>> slot markers.
 * Same label may appear multiple times; fill fields are keyed by distinct labels.
 */

const SLOT_RE = /<<<\{([^}]*)\}>>>/g;

/**
 * @param {string} body
 * @returns {{ labels: string[], segments: Array<{ type: 'text', value: string } | { type: 'slot', label: string }> }}
 */
export function parseSlots(body) {
  const text = body == null ? '' : String(body);
  const segments = [];
  const labels = [];
  const seen = new Set();
  let lastIndex = 0;
  SLOT_RE.lastIndex = 0;
  let match;
  while ((match = SLOT_RE.exec(text)) !== null) {
    const rawLabel = match[1];
    const label = rawLabel.trim();
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    if (label.length === 0) {
      // Empty label is not a slot — keep literal marker text
      segments.push({ type: 'text', value: match[0] });
    } else {
      segments.push({ type: 'slot', label });
      if (!seen.has(label)) {
        seen.add(label);
        labels.push(label);
      }
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) });
  }
  if (segments.length === 0 && text.length === 0) {
    // empty body
  }
  return { labels, segments };
}

/**
 * Substitute slot values into the body. Template body string is not mutated.
 * @param {string} body
 * @param {Record<string, string>} values
 * @returns {string}
 */
export function fillTemplate(body, values = {}) {
  const { segments } = parseSlots(body);
  let out = '';
  for (const seg of segments) {
    if (seg.type === 'text') {
      out += seg.value;
    } else {
      const v = values[seg.label];
      out += v == null ? '' : String(v);
    }
  }
  return out;
}
