/**
 * Template record helpers. Pure — no I/O.
 */

/**
 * @typedef {object} Template
 * @property {string} id
 * @property {string} title
 * @property {string} body
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @param {object} opts
 * @param {string} [opts.title]
 * @param {string} [opts.body]
 * @param {() => string} [opts.idFactory]
 * @param {() => string} [opts.nowFactory]
 * @returns {Template}
 */
export function createTemplate({
  title = 'Untitled',
  body = '',
  idFactory = () => crypto.randomUUID(),
  nowFactory = () => new Date().toISOString(),
} = {}) {
  const now = nowFactory();
  return {
    id: idFactory(),
    title: title == null ? 'Untitled' : String(title),
    body: body == null ? '' : String(body),
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Update title/body; returns a new template. Does not touch history.
 * @param {Template} template
 * @param {{ title?: string, body?: string }} patch
 * @param {() => string} [nowFactory]
 * @returns {Template}
 */
export function updateTemplate(template, patch, nowFactory = () => new Date().toISOString()) {
  return {
    ...template,
    title: patch.title !== undefined ? String(patch.title) : template.title,
    body: patch.body !== undefined ? String(patch.body) : template.body,
    updatedAt: nowFactory(),
  };
}
