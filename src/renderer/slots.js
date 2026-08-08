/**
 * Retractable insert-slot control.
 * One custom open/close style per template; default <<<{label}>>>.
 */

import {
  wrapSlot,
  DEFAULT_DELIMITER,
  normalizeDelimiter,
} from '../domain/parse.js';
import { $, showToast } from './dom.js';
import { sanitizeLabel } from './format.js';
import { api, state } from './state.js';

export function currentDelimiter() {
  if (state.current?.slotDelimiter) {
    return normalizeDelimiter(state.current.slotDelimiter);
  }
  return normalizeDelimiter(state.activeDelimiter);
}

export function readDelimiterFromUi() {
  const open = ($('#slot-open')?.value || '').trim();
  const close = ($('#slot-close')?.value || '').trim();
  if (!open || !close) return { ...DEFAULT_DELIMITER };
  return normalizeDelimiter({ id: 'custom', open, close });
}

export function setDelimiterUi(delimiter) {
  const d = normalizeDelimiter(delimiter);
  const openEl = $('#slot-open');
  const closeEl = $('#slot-close');
  if (openEl) openEl.value = d.open;
  if (closeEl) closeEl.value = d.close;
  updateSlotPreview();
}

export function setSlotInsertExpanded(open) {
  state.slotInsertOpen = open;
  const panel = $('#slot-insert-panel');
  const toggle = $('#slot-insert-toggle');
  const card = $('#slot-insert');
  if (panel) panel.hidden = !open;
  if (toggle) toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  if (card) card.classList.toggle('is-open', open);
}

export function updateSlotPreview() {
  const d = readDelimiterFromUi();
  const label = sanitizeLabel($('#slot-label-input')?.value) || 'idea';
  const marker = wrapSlot(label, d);
  const prev = $('#slot-preview');
  if (prev) prev.textContent = marker;
}

function onDelimiterUiChange() {
  updateSlotPreview();
  if (state.current) {
    const d = readDelimiterFromUi();
    state.activeDelimiter = d;
    state.current = { ...state.current, slotDelimiter: d };
  }
}

async function persistDelimiter(d) {
  if (!state.current?.id) return;
  const updated = await api().updateTemplate(state.current.id, {
    slotDelimiter: d,
    title: $('#field-title')?.value ?? state.current.title,
    body: $('#field-body')?.value ?? state.current.body,
  });
  state.current = updated;
  state.activeDelimiter = normalizeDelimiter(updated.slotDelimiter);
}

function insertSlotFromUi() {
  const d = readDelimiterFromUi();
  if (!d.open || !d.close) {
    showToast('Set open and close markers');
    return;
  }
  const label = sanitizeLabel($('#slot-label-input')?.value);
  if (!label) {
    showToast('Enter a slot label');
    $('#slot-label-input')?.focus();
    return;
  }
  insertSlotAtCursor(label, d);
}

async function insertSlotAtCursor(label, delimiter) {
  const d = normalizeDelimiter(delimiter);
  const ta = $('#field-body');
  if (!ta) return;
  const marker = wrapSlot(label, d);
  const start = ta.selectionStart ?? ta.value.length;
  const end = ta.selectionEnd ?? start;
  ta.value = ta.value.slice(0, start) + marker + ta.value.slice(end);
  const pos = start + marker.length;
  ta.focus();
  ta.setSelectionRange(pos, pos);

  state.activeDelimiter = d;
  if (state.current) {
    state.current = { ...state.current, slotDelimiter: d, body: ta.value };
    await persistDelimiter(d);
  }
  updateSlotPreview();
  showToast(`Inserted ${marker}`);
}

export function initSlotInsert() {
  const openEl = $('#slot-open');
  const closeEl = $('#slot-close');
  if (openEl && !openEl.value) openEl.value = DEFAULT_DELIMITER.open;
  if (closeEl && !closeEl.value) closeEl.value = DEFAULT_DELIMITER.close;

  $('#slot-insert-toggle')?.addEventListener('click', () => {
    setSlotInsertExpanded(!state.slotInsertOpen);
  });
  openEl?.addEventListener('input', onDelimiterUiChange);
  closeEl?.addEventListener('input', onDelimiterUiChange);
  $('#slot-label-input')?.addEventListener('input', updateSlotPreview);
  $('#slot-label-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      insertSlotFromUi();
    }
  });
  $('#btn-insert-slot')?.addEventListener('click', insertSlotFromUi);
  setSlotInsertExpanded(false);
  updateSlotPreview();
}
