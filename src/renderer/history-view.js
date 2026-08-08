/** Fill history list / snapshot / delete version. */

import { $, $$, setView, showToast } from './dom.js';
import { formatWhen } from './format.js';
import { openModal } from './modal.js';
import { api, state } from './state.js';

export async function openHistory() {
  if (!state.current) return;
  $('#history-heading').textContent = `${state.current.title || 'Template'} · history`;
  state.selectedHistoryId = null;
  await renderHistoryList();
  setView('history', state);
}

export async function renderHistoryList() {
  const entries = await api().listHistory(state.current.id);
  const ul = $('#history-list');
  ul.innerHTML = '';
  $('#history-empty').hidden = entries.length > 0;
  $('#history-detail').textContent = entries.length
    ? 'Select a version'
    : 'No versions yet';
  $('#history-note').hidden = true;
  $('#btn-copy-history').hidden = true;
  $('#btn-delete-history').hidden = true;

  for (const h of entries) {
    const li = document.createElement('li');
    li.className = 'history-row';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className =
      'history-item' + (state.selectedHistoryId === h.id ? ' active' : '');
    const titleLine = h.note || formatWhen(h.createdAt);
    const metaLine = h.note
      ? formatWhen(h.createdAt)
      : (h.filledText || '').slice(0, 80).replace(/\s+/g, ' ') || '(empty)';
    btn.innerHTML = `<span class="t-title"></span><span class="t-meta"></span>`;
    btn.querySelector('.t-title').textContent = titleLine;
    btn.querySelector('.t-meta').textContent = metaLine;
    btn.addEventListener('click', () => selectHistoryEntry(h));

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'history-delete-btn';
    del.title = 'Delete version';
    del.setAttribute('aria-label', 'Delete version');
    del.innerHTML = '<i class="ph-light ph-trash"></i>';
    del.addEventListener('click', (e) => {
      e.stopPropagation();
      confirmDeleteHistory(h);
    });

    li.append(btn, del);
    ul.appendChild(li);
  }
}

function selectHistoryEntry(h) {
  state.selectedHistoryId = h.id;
  $$('.history-item').forEach((el) => el.classList.remove('active'));
  $('#history-detail').textContent = h.filledText || '';
  const noteEl = $('#history-note');
  if (h.note) {
    noteEl.textContent = h.note;
    noteEl.hidden = false;
  } else {
    noteEl.hidden = true;
  }
  $('#btn-copy-history').hidden = false;
  $('#btn-delete-history').hidden = false;
  state.fillValues = { ...(h.values || {}) };
  $$('.history-item').forEach((el) => {
    const title = el.querySelector('.t-title')?.textContent;
    const isMatch =
      (h.note && title === h.note) ||
      (!h.note && title === formatWhen(h.createdAt));
    el.classList.toggle('active', isMatch);
  });
}

function confirmDeleteHistory(h) {
  const label = h.note || formatWhen(h.createdAt) || 'this version';
  openModal({
    title: 'Delete version?',
    desc: `“${label}” will be removed permanently. The template body is not affected.`,
    bodyHtml: '',
    confirmLabel: 'Delete version',
    onConfirm: async () => {
      await api().deleteHistory(h.id);
      if (state.selectedHistoryId === h.id) {
        state.selectedHistoryId = null;
        $('#history-detail').textContent = 'Select a version';
        $('#history-note').hidden = true;
        $('#btn-copy-history').hidden = true;
        $('#btn-delete-history').hidden = true;
      }
      await renderHistoryList();
      showToast('Version deleted');
    },
  });
}

export function deleteSelectedHistory() {
  if (!state.selectedHistoryId) return;
  api()
    .getHistoryEntry(state.selectedHistoryId)
    .then((h) => {
      if (h) confirmDeleteHistory(h);
    });
}

export async function copyHistory() {
  await api().copyText($('#history-detail').textContent || '');
  showToast('Snapshot copied');
}
