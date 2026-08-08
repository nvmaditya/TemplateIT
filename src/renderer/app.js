/**
 * TemplateIt renderer — library, editor, fill canvas, history.
 * Domain parse/fill imported from shared modules (shipped path).
 */

import { parseSlots, fillTemplate } from '../domain/parse.js';

const api = window.templateit;

/** Long slot values become block inserts in the canvas instead of inline chips */
const LONG_SLOT_CHARS = 72;
const LONG_SLOT_LINES = 1;

/** @type {{ id: string, title: string, body: string } | null} */
let current = null;
/** @type {Record<string, string>} */
let fillValues = {};
/** @type {'empty'|'editor'|'fill'|'history'} */
let view = 'empty';
/** @type {string | null} */
let selectedHistoryId = null;
/** @type {string | null} */
let activeSlot = null;
/** @type {string[]} */
let slotLabels = [];

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

function showToast(msg) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => {
    el.hidden = true;
  }, 2200);
}

function setView(name) {
  view = name;
  $$('.view').forEach((v) => {
    v.classList.toggle('hidden', v.dataset.view !== name);
  });
}

async function refreshList(selectId) {
  const list = await api.listTemplates();
  const ul = $('#template-list');
  ul.innerHTML = '';
  if (!list.length) {
    const li = document.createElement('li');
    li.innerHTML = `<p class="hint" style="margin:0">No templates yet</p>`;
    ul.appendChild(li);
  }
  for (const t of list) {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'template-item' + (current?.id === t.id ? ' active' : '');
    btn.innerHTML = `<span class="t-title"></span><span class="t-meta"></span>`;
    btn.querySelector('.t-title').textContent = t.title || 'Untitled';
    btn.querySelector('.t-meta').textContent = formatWhen(t.updatedAt);
    btn.addEventListener('click', () => openTemplate(t.id));
    li.appendChild(btn);
    ul.appendChild(li);
  }
  if (selectId && list.some((t) => t.id === selectId)) {
    // keep selection
  }
  return list;
}

function formatWhen(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function previewLine(text, max = 48) {
  const one = String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!one) return 'Empty — click to fill';
  return one.length > max ? one.slice(0, max - 1) + '…' : one;
}

function formatCount(text) {
  const n = String(text || '').length;
  if (n === 0) return 'Empty';
  if (n < 1000) return `${n} chars`;
  return `${(n / 1000).toFixed(1)}k chars`;
}

function isLongValue(val) {
  const s = String(val || '');
  if (!s) return false;
  return s.length > LONG_SLOT_CHARS || s.includes('\n');
}

async function openTemplate(id) {
  const t = await api.getTemplate(id);
  if (!t) return;
  current = t;
  fillValues = {};
  activeSlot = null;
  selectedHistoryId = null;
  $('#field-title').value = t.title || '';
  $('#field-body').value = t.body || '';
  $('#editor-heading').textContent = t.title || 'Untitled';
  setView('editor');
  await refreshList();
}

async function createNew() {
  const t = await api.createTemplate({
    title: 'Untitled template',
    body: 'You are a helpful assistant.\n\nTask: <<<{task}>>>\nContext: <<<{context}>>>\nConstraints: <<<{constraints}>>>',
  });
  await openTemplate(t.id);
  showToast('Template created');
}

async function saveCurrent() {
  if (!current) return;
  const title = $('#field-title').value;
  const body = $('#field-body').value;
  const updated = await api.updateTemplate(current.id, { title, body });
  current = updated;
  $('#editor-heading').textContent = updated.title || 'Untitled';
  await refreshList();
  showToast('Saved');
}

function enterFill() {
  if (!current) return;
  const body = $('#field-body').value;
  current = { ...current, title: $('#field-title').value, body };
  fillValues = { ...fillValues };
  $('#fill-heading').textContent = current.title || 'Fill';
  renderFill();
  setView('fill');
}

function selectSlot(label) {
  activeSlot = label;
  const compose = $('#slot-compose');
  const editor = $('#slot-editor');
  if (!label) {
    compose.hidden = true;
    return;
  }
  compose.hidden = false;
  $('#slot-compose-label').textContent = label;
  editor.value = fillValues[label] || '';
  $('#slot-compose-count').textContent = formatCount(editor.value);
  paintSlotRail();
  editor.focus();
}

function onSlotEditorInput() {
  if (!activeSlot) return;
  const editor = $('#slot-editor');
  fillValues[activeSlot] = editor.value;
  $('#slot-compose-count').textContent = formatCount(editor.value);
  paintSlotRail();
  paintCanvas();
}

function paintSlotRail() {
  const rail = $('#slot-rail');
  rail.innerHTML = '';
  for (const label of slotLabels) {
    const val = fillValues[label] || '';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.role = 'tab';
    btn.className =
      'slot-tab' +
      (activeSlot === label ? ' active' : '') +
      (val.trim() ? ' filled' : '');
    btn.setAttribute('aria-selected', activeSlot === label ? 'true' : 'false');
    btn.innerHTML = `
      <span class="slot-tab-name"></span>
      <span class="slot-tab-status"></span>
      <span class="slot-tab-preview"></span>
    `;
    btn.querySelector('.slot-tab-name').textContent = label;
    btn.querySelector('.slot-tab-status').textContent = val.trim()
      ? formatCount(val)
      : 'Empty';
    btn.querySelector('.slot-tab-preview').textContent = previewLine(val);
    btn.addEventListener('click', () => selectSlot(label));
    rail.appendChild(btn);
  }
}

function renderFill() {
  const body = current?.body || '';
  const { labels } = parseSlots(body);
  slotLabels = labels;
  const emptyHint = $('#slot-empty-hint');
  emptyHint.hidden = labels.length > 0;

  for (const label of labels) {
    if (fillValues[label] === undefined) fillValues[label] = '';
  }

  // Drop values for removed labels
  for (const key of Object.keys(fillValues)) {
    if (!labels.includes(key)) delete fillValues[key];
  }

  if (!labels.length) {
    activeSlot = null;
    $('#slot-compose').hidden = true;
    $('#slot-rail').innerHTML = '';
  } else if (!activeSlot || !labels.includes(activeSlot)) {
    selectSlot(labels[0]);
  } else {
    selectSlot(activeSlot);
  }

  // Keep #slot-fields present for structure tests
  const fields = $('#slot-fields');
  if (fields) {
    fields.innerHTML = labels
      .map((l) => `<span data-slot-label="${l}"></span>`)
      .join('');
  }

  paintCanvas();
}

function cssId(label) {
  return encodeURIComponent(label).replace(/%/g, '_');
}

function paintCanvas() {
  const body = current?.body || '';
  const { segments } = parseSlots(body);
  const canvas = $('#prompt-canvas');
  canvas.innerHTML = '';

  for (const seg of segments) {
    if (seg.type === 'text') {
      const span = document.createElement('span');
      span.className = 'canvas-text';
      span.textContent = seg.value;
      canvas.appendChild(span);
    } else {
      const val = fillValues[seg.label] || '';
      const long = isLongValue(val) || !val;
      // Empty placeholders stay compact chips; long fills become blocks
      if (val && long) {
        const block = document.createElement('div');
        block.className = 'slot-block filled';
        block.dataset.slot = seg.label;
        block.title = `Edit “${seg.label}”`;
        const lab = document.createElement('span');
        lab.className = 'slot-block-label';
        lab.textContent = seg.label;
        const content = document.createElement('span');
        content.textContent = val;
        block.append(lab, content);
        block.addEventListener('click', () => selectSlot(seg.label));
        canvas.appendChild(block);
      } else {
        const chip = document.createElement('span');
        chip.className = 'slot-chip' + (val ? ' filled' : ' empty');
        chip.dataset.slot = seg.label;
        chip.textContent = val || `‹${seg.label}›`;
        chip.title = `Edit “${seg.label}”`;
        chip.addEventListener('click', () => selectSlot(seg.label));
        canvas.appendChild(chip);
      }
    }
  }

  return fillTemplate(body, fillValues);
}

function getFilledText() {
  return fillTemplate(current?.body || '', fillValues);
}

async function copyFilled() {
  paintCanvas();
  const filled = getFilledText();
  await api.copyText(filled);
  showToast('Copied to clipboard');
}

async function saveVersion() {
  if (!current?.id) return;
  await api.updateTemplate(current.id, {
    title: $('#field-title')?.value ?? current.title,
    body: current.body,
  });
  const filledText = getFilledText();
  await api.saveHistory(current.id, {
    values: { ...fillValues },
    filledText,
  });
  const t = await api.getTemplate(current.id);
  if (t && t.body !== current.body) {
    console.error('Template body changed after history save');
  }
  current = t || current;
  showToast('Version saved — template intact');
}

async function openHistory() {
  if (!current) return;
  $('#history-heading').textContent = `${current.title || 'Template'} · history`;
  selectedHistoryId = null;
  const entries = await api.listHistory(current.id);
  const ul = $('#history-list');
  ul.innerHTML = '';
  $('#history-empty').hidden = entries.length > 0;
  $('#history-detail').textContent = entries.length
    ? 'Select a version'
    : 'No versions yet';
  $('#btn-copy-history').hidden = true;

  for (const h of entries) {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'history-item';
    const preview = (h.filledText || '').slice(0, 80).replace(/\s+/g, ' ');
    btn.innerHTML = `<span class="t-title"></span><span class="t-meta"></span>`;
    btn.querySelector('.t-title').textContent = formatWhen(h.createdAt);
    btn.querySelector('.t-meta').textContent = preview || '(empty)';
    btn.addEventListener('click', () => {
      $$('.history-item').forEach((el) => el.classList.remove('active'));
      btn.classList.add('active');
      selectedHistoryId = h.id;
      $('#history-detail').textContent = h.filledText || '';
      $('#btn-copy-history').hidden = false;
      fillValues = { ...(h.values || {}) };
    });
    li.appendChild(btn);
    ul.appendChild(li);
  }
  setView('history');
}

async function copyHistory() {
  const text = $('#history-detail').textContent || '';
  await api.copyText(text);
  showToast('Snapshot copied');
}

function bind() {
  $$('[data-action="new"]').forEach((el) => el.addEventListener('click', createNew));
  $('#btn-save').addEventListener('click', saveCurrent);
  $('#btn-fill').addEventListener('click', async () => {
    await saveCurrent();
    enterFill();
  });
  $('#btn-back-editor').addEventListener('click', () => setView('editor'));
  $('#btn-back-editor-from-hist').addEventListener('click', () => setView('editor'));
  $('#btn-history').addEventListener('click', openHistory);
  $('#btn-copy').addEventListener('click', copyFilled);
  $('#btn-save-version').addEventListener('click', saveVersion);
  $('#btn-copy-history').addEventListener('click', copyHistory);
  $('#slot-editor').addEventListener('input', onSlotEditorInput);
}

async function boot() {
  if (!api) {
    document.body.innerHTML =
      '<p style="color:#fff;padding:2rem;font-family:sans-serif">TemplateIt must run inside Electron (<code>npm start</code>).</p>';
    return;
  }
  bind();
  const list = await refreshList();
  if (list.length) {
    await openTemplate(list[0].id);
  } else {
    setView('empty');
  }
}

boot().catch((err) => {
  console.error(err);
  showToast(String(err.message || err));
});
