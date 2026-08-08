/**
 * Parse/fill prompt bodies with configurable slot delimiters.
 * Presets: { }, [ ], < >, << >>, ( ), and legacy <<<{ }>>> .
 */

/** @typedef {{ id: string, label: string, open: string, close: string }} Delimiter */

/** @type {Delimiter[]} */
export const DELIMITER_PRESETS = [
  { id: 'braces', label: '{ label }', open: '{', close: '}' },
  { id: 'brackets', label: '[ label ]', open: '[', close: ']' },
  { id: 'angles', label: '< label >', open: '<', close: '>' },
  { id: 'doubleAngles', label: '<< label >>', open: '<<', close: '>>' },
  { id: 'parens', label: '( label )', open: '(', close: ')' },
  { id: 'triple', label: '<<<{ label }>>>', open: '<<<{', close: '}>>>' },
];

/** Default slot style: <<<{label}>>> */
export const DEFAULT_DELIMITER = DELIMITER_PRESETS.find((p) => p.id === 'triple') || {
  id: 'triple',
  label: '<<<{ label }>>>',
  open: '<<<{',
  close: '}>>>',
};

/**
 * @param {string} s
 */
export function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Normalize a delimiter pair.
 * @param {{ open?: string, close?: string, id?: string } | null | undefined} d
 * @returns {Delimiter}
 */
export function normalizeDelimiter(d) {
  if (!d || !d.open || !d.close) {
    return { ...DEFAULT_DELIMITER };
  }
  const open = String(d.open);
  const close = String(d.close);
  const preset = DELIMITER_PRESETS.find((p) => p.open === open && p.close === close);
  return {
    id: preset?.id || d.id || 'custom',
    label: preset?.label || `${open} label ${close}`,
    open,
    close,
  };
}

/**
 * Build marker around a label.
 * @param {string} label
 * @param {{ open: string, close: string }} delimiter
 */
export function wrapSlot(label, delimiter = DEFAULT_DELIMITER) {
  const d = normalizeDelimiter(delimiter);
  const clean = String(label ?? '').trim();
  return `${d.open}${clean}${d.close}`;
}

/**
 * @param {{ open: string, close: string }} delimiter
 */
export function buildSlotRegex(delimiter) {
  const d = normalizeDelimiter(delimiter);
  // Label: anything non-greedy that does not start the close sequence
  return new RegExp(
    `${escapeRegExp(d.open)}([\\s\\S]*?)${escapeRegExp(d.close)}`,
    'g'
  );
}

/**
 * @param {string} body
 * @param {{ open: string, close: string }} [delimiter]
 * @returns {{ labels: string[], segments: Array<{ type: 'text', value: string } | { type: 'slot', label: string }>, delimiter: Delimiter }}
 */
export function parseSlots(body, delimiter = DEFAULT_DELIMITER) {
  const d = normalizeDelimiter(delimiter);
  const text = body == null ? '' : String(body);
  const re = buildSlotRegex(d);
  const segments = [];
  const labels = [];
  const seen = new Set();
  let lastIndex = 0;
  let match;
  while ((match = re.exec(text)) !== null) {
    const rawLabel = match[1];
    const label = rawLabel.trim();
    // Avoid zero-width infinite loops
    if (match[0].length === 0) {
      re.lastIndex += 1;
      continue;
    }
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    if (label.length === 0) {
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
  return { labels, segments, delimiter: d };
}

/**
 * @param {string} body
 * @param {Record<string, string>} values
 * @param {{ open: string, close: string }} [delimiter]
 */
export function fillTemplate(body, values = {}, delimiter = DEFAULT_DELIMITER) {
  const { segments } = parseSlots(body, delimiter);
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

/**
 * Guess delimiter from body content (legacy triple first, then presets).
 * @param {string} body
 * @returns {Delimiter}
 */
export function detectDelimiter(body) {
  const text = body == null ? '' : String(body);
  // Prefer longer open sequences first so <<<{ wins over {
  const ordered = [...DELIMITER_PRESETS].sort(
    (a, b) => b.open.length - a.open.length
  );
  for (const p of ordered) {
    const re = buildSlotRegex(p);
    if (re.test(text)) return { ...p };
  }
  return { ...DEFAULT_DELIMITER };
}
