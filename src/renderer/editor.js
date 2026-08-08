/** Template open / create / save. */

import {
  wrapSlot,
  DEFAULT_DELIMITER,
  normalizeDelimiter,
  detectDelimiter,
} from '../domain/parse.js';
import { $, setView, showToast } from './dom.js';
import {
  readDelimiterFromUi,
  setDelimiterUi,
  setSlotInsertExpanded,
} from './slots.js';
import { api, actions, state } from './state.js';

export async function openTemplate(id) {
  const t = await api().getTemplate(id);
  if (!t) return;
  state.current = t;
  state.fillValues = {};
  state.activeSlot = null;
  state.selectedHistoryId = null;
  $('#field-title').value = t.title || '';
  $('#field-body').value = t.body || '';
  $('#editor-heading').textContent = t.title || 'Untitled';

  let d = t.slotDelimiter
    ? normalizeDelimiter(t.slotDelimiter)
    : detectDelimiter(t.body || '');
  if (!t.slotDelimiter && !t.body) d = { ...DEFAULT_DELIMITER };
  state.activeDelimiter = d;
  setDelimiterUi(d);
  setSlotInsertExpanded(false);

  setView('editor', state);
  await actions.refreshList();
}

export async function createNew() {
  const d = { ...DEFAULT_DELIMITER };
  const t = await api().createTemplate({
    title: 'Untitled template',
    body: `You are a helpful assistant.\n\nTask: ${wrapSlot('task', d)}\nContext: ${wrapSlot('context', d)}\nConstraints: ${wrapSlot('constraints', d)}`,
    slotDelimiter: d,
  });
  state.showArchived = false;
  actions.syncArchiveToggle();
  await openTemplate(t.id);
  showToast('Template created');
}

export async function saveCurrent() {
  if (!state.current) return;
  const title = $('#field-title').value;
  const body = $('#field-body').value;
  const slotDelimiter = readDelimiterFromUi();
  const updated = await api().updateTemplate(state.current.id, {
    title,
    body,
    slotDelimiter,
  });
  state.current = updated;
  state.activeDelimiter = normalizeDelimiter(updated.slotDelimiter);
  $('#editor-heading').textContent = updated.title || 'Untitled';
  await actions.refreshList();
  showToast('Saved');
}

export function registerEditorActions() {
  actions.openTemplate = openTemplate;
}
