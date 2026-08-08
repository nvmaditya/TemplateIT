/**
 * Fill history: snapshots of filled values + rendered text.
 * Never mutates the parent template body.
 */

/**
 * @typedef {object} HistoryEntry
 * @property {string} id
 * @property {string} templateId
 * @property {Record<string, string>} values
 * @property {string} filledText
 * @property {string} createdAt ISO timestamp
 * @property {string} [note]
 */

/**
 * @param {object} opts
 * @param {string} opts.templateId
 * @param {Record<string, string>} opts.values
 * @param {string} opts.filledText
 * @param {string} [opts.note]
 * @param {() => string} [opts.idFactory]
 * @param {() => string} [opts.nowFactory]
 * @returns {HistoryEntry}
 */
export function createHistoryEntry({
  templateId,
  values,
  filledText,
  note,
  idFactory = () => crypto.randomUUID(),
  nowFactory = () => new Date().toISOString(),
}) {
  if (!templateId) {
    throw new Error('templateId is required');
  }
  return {
    id: idFactory(),
    templateId,
    values: { ...(values || {}) },
    filledText: filledText == null ? '' : String(filledText),
    createdAt: nowFactory(),
    ...(note != null && note !== '' ? { note: String(note) } : {}),
  };
}

/**
 * Append a history entry without touching the template object.
 * @param {HistoryEntry[]} history
 * @param {HistoryEntry} entry
 * @returns {HistoryEntry[]} new array (immutable append)
 */
export function appendHistory(history, entry) {
  return [...(history || []), entry];
}

/**
 * @param {HistoryEntry[]} history
 * @param {string} templateId
 * @returns {HistoryEntry[]}
 */
export function listHistoryForTemplate(history, templateId) {
  return (history || [])
    .filter((h) => h.templateId === templateId)
    .slice()
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
}
