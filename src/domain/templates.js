/**
 * Template record helpers. Pure — no I/O.
 */

/**
 * @typedef {object} Template
 * @property {string} id
 * @property {string} title
 * @property {string} body
 * @property {boolean} archived
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @param {object} opts
 * @param {string} [opts.title]
 * @param {string} [opts.body]
 * @param {boolean} [opts.archived]
 * @param {() => string} [opts.idFactory]
 * @param {() => string} [opts.nowFactory]
 * @returns {Template}
 */
export function createTemplate({
  title = 'Untitled',
  body = '',
  archived = false,
  idFactory = () => crypto.randomUUID(),
  nowFactory = () => new Date().toISOString(),
} = {}) {
  const now = nowFactory();
  return {
    id: idFactory(),
    title: title == null ? 'Untitled' : String(title),
    body: body == null ? '' : String(body),
    archived: Boolean(archived),
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Update title/body/archived; returns a new template. Does not touch history.
 * @param {Template} template
 * @param {{ title?: string, body?: string, archived?: boolean }} patch
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
    updatedAt: nowFactory(),
  };
}

/** Normalize legacy records missing `archived`. */
export function normalizeTemplate(t) {
  if (!t || typeof t !== 'object') return t;
  return { ...t, archived: Boolean(t.archived) };
}
