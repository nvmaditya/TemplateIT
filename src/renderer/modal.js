/** App modal shell. */

import { $ } from './dom.js';

/** @type {(() => boolean|void|Promise<boolean|void>) | null} */
let onConfirm = null;

export function closeModal() {
  $('#modal-root').hidden = true;
  $('#modal-body').innerHTML = '';
  $('#modal-desc').hidden = true;
  onConfirm = null;
}

/**
 * @param {object} opts
 * @param {string} opts.title
 * @param {string} [opts.desc]
 * @param {string|HTMLElement} [opts.bodyHtml]
 * @param {string} [opts.confirmLabel]
 * @param {() => boolean|void|Promise<boolean|void>} opts.onConfirm
 */
export function openModal({ title, desc, bodyHtml = '', confirmLabel = 'Confirm', onConfirm: cb }) {
  $('#modal-title').textContent = title;
  const descEl = $('#modal-desc');
  if (desc) {
    descEl.textContent = desc;
    descEl.hidden = false;
  } else {
    descEl.hidden = true;
  }
  const body = $('#modal-body');
  body.innerHTML = '';
  if (typeof bodyHtml === 'string') body.innerHTML = bodyHtml;
  else if (bodyHtml) body.appendChild(bodyHtml);
  $('#modal-confirm').textContent = confirmLabel;
  onConfirm = cb;
  $('#modal-root').hidden = false;
  body.querySelector('input, textarea, button, select')?.focus();
}

export async function handleModalConfirm() {
  if (!onConfirm) {
    closeModal();
    return;
  }
  const result = await onConfirm();
  if (result === false) return;
  closeModal();
}

export function bindModal() {
  $('#modal-cancel').addEventListener('click', closeModal);
  $('#modal-confirm').addEventListener('click', handleModalConfirm);
  $('#modal-backdrop').addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('#modal-root').hidden) closeModal();
  });
}

