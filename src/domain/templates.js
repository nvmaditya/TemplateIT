/**
 * Template record helpers. Pure — no I/O.
 */

import { DEFAULT_DELIMITER, normalizeDelimiter } from './parse.js';

/**
 * @typedef {object} Template
 * @property {string} id
 * @property {string} title
 * @property {string} body
 * @property {boolean} archived
 * @property {{ open: string, close: string, id?: string }} slotDelimiter
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @param {object} opts
 * @param {string} [opts.title]
 * @param {string} [opts.body]
 * @param {boolean} [opts.archived]
 * @param {{ open: string, close: string, id?: string }} [opts.slotDelimiter]
 * @param {() => string} [opts.idFactory]
 * @param {() => string} [opts.nowFactory]
 * @returns {Template}
 */
export function createTemplate({
  title = 'Untitled',
  body = '',
  archived = false,
  slotDelimiter,
  idFactory = () => crypto.randomUUID(),
  nowFactory = () => new Date().toISOString(),
} = {}) {
  const now = nowFactory();
  return {
    id: idFactory(),
    title: title == null ? 'Untitled' : String(title),
    body: body == null ? '' : String(body),
    archived: Boolean(archived),
    slotDelimiter: normalizeDelimiter(slotDelimiter || DEFAULT_DELIMITER),
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Update title/body/archived/delimiter; returns a new template. Does not touch history.
 * @param {Template} template
 * @param {{ title?: string, body?: string, archived?: boolean, slotDelimiter?: { open: string, close: string } }} patch
 * @param {() => string} [nowFactory]
 * @returns {Template}
 */
export function updateTemplate(template, patch, nowFactory = () => new Date().toISOString()) {
  return {
    ...template,
    title: patch.title !== undefined ? String(patch.title) : template.title,
    body: patch.body !== undefined ? String(patch.body) : template.body,
    archived:
      patch.archived !== undefined
        ? Boolean(patch.archived)
        : Boolean(template.archived),
    slotDelimiter:
      patch.slotDelimiter !== undefined
        ? normalizeDelimiter(patch.slotDelimiter)
        : normalizeDelimiter(template.slotDelimiter || DEFAULT_DELIMITER),
    updatedAt: nowFactory(),
  };
}

/** Normalize legacy records missing archived / slotDelimiter. */
export function normalizeTemplate(t) {
  if (!t || typeof t !== 'object') return t;
  return {
    ...t,
    archived: Boolean(t.archived),
    slotDelimiter: normalizeDelimiter(t.slotDelimiter || DEFAULT_DELIMITER),
  };
}
