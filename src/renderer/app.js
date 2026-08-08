/**
 * TemplateIt renderer — library, editor, fill canvas, history.
 * Domain parse/fill imported from shared modules (shipped path).
 */

import { parseSlots, fillTemplate } from '../domain/parse.js';

const api = window.templateit;

/** @type {{ id: string, title: string, body: string } | null} */
let current = null;
/** @type {Record<string, string>} */
let fillValues = {};
/** @type {'empty'|'editor'|'fill'|'history'} */
let view = 'empty';
/** @type {string | null} */
let selectedHistoryId = null;

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

async function openTemplate(id) {
  const t = await api.getTemplate(id);
  if (!t) return;
  current = t;
  fillValues = {};
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
  // use latest editor fields without requiring save — but prefer saved body after save
  const body = $('#field-body').value;
  current = { ...current, title: $('#field-title').value, body };
  fillValues = { ...fillValues };
  $('#fill-heading').textContent = current.title || 'Fill';
  renderFill();
  setView('fill');
}

function renderFill() {
  const body = current?.body || '';
  const { labels, segments } = parseSlots(body);
  const fields = $('#slot-fields');
  const emptyHint = $('#slot-empty-hint');
  fields.innerHTML = '';
  emptyHint.hidden = labels.length > 0;

  for (const label of labels) {
    if (fillValues[label] === undefined) fillValues[label] = '';
    const wrap = document.createElement('div');
    wrap.className = 'slot-field';
    const lab = document.createElement('label');
    lab.htmlFor = `slot-${cssId(label)}`;
    lab.textContent = label;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'slot-input';
    input.id = `slot-${cssId(label)}`;
    input.placeholder = `Value for ${label}`;
    input.value = fillValues[label] || '';
    input.addEventListener('input', () => {
      fillValues[label] = input.value;
      paintCanvasAndOutput();
    });
    wrap.append(lab, input);
    fields.appendChild(wrap);
  }

  paintCanvasAndOutput();
}

function cssId(label) {
  return encodeURIComponent(label).replace(/%/g, '_');
}

function paintCanvasAndOutput() {
  const body = current?.body || '';
  const { segments } = parseSlots(body);
  const canvas = $('#prompt-canvas');
  canvas.innerHTML = '';
  for (const seg of segments) {
    if (seg.type === 'text') {
      canvas.appendChild(document.createTextNode(seg.value));
    } else {
      const chip = document.createElement('span');
      const val = fillValues[seg.label] || '';
      chip.className = 'slot-chip' + (val ? ' filled' : '');
      chip.textContent = val || `‹${seg.label}›`;
      chip.title = seg.label;
      canvas.appendChild(chip);
    }
  }
  const filled = fillTemplate(body, fillValues);
  $('#filled-output').textContent = filled;
  return filled;
}

async function copyFilled() {
  const filled = paintCanvasAndOutput();
  await api.copyText(filled);
  showToast('Copied to clipboard');
}

async function saveVersion() {
  if (!current?.id) return;
  // Persist editor body first so history ties to stable template
  await api.updateTemplate(current.id, {
    title: $('#field-title')?.value ?? current.title,
    body: current.body,
  });
  const filledText = fillTemplate(current.body, fillValues);
  await api.saveHistory(current.id, {
    values: { ...fillValues },
    filledText,
  });
  // Re-fetch template to confirm body intact
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
      // rehydrate values for potential re-fill
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
