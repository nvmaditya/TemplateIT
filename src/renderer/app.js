/**
 * TemplateIt renderer — library, editor, fill canvas, history.
 */

import { parseSlots, fillTemplate } from '../domain/parse.js';

const api = window.templateit;

const LONG_SLOT_CHARS = 72;

const SLOT_PRESETS = [
  'task',
  'context',
  'constraints',
  'role',
  'code',
  'idea',
  'input',
  'output',
  'jd',
  'resume',
];

/** @type {{ id: string, title: string, body: string, archived?: boolean } | null} */
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
/** @type {boolean} */
let showArchived = false;
/** @type {(() => void) | null} */
let modalOnConfirm = null;
/** @type {string | null} */
let openMenuId = null;

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

/* ── Modal ─────────────────────────────────────────────── */

function closeModal() {
  const root = $('#modal-root');
  root.hidden = true;
  $('#modal-body').innerHTML = '';
  $('#modal-desc').hidden = true;
  modalOnConfirm = null;
}

/**
 * @param {object} opts
 * @param {string} opts.title
 * @param {string} [opts.desc]
 * @param {string|HTMLElement} opts.bodyHtml
 * @param {string} [opts.confirmLabel]
 * @param {boolean} [opts.danger]
 * @param {() => boolean|void|Promise<boolean|void>} opts.onConfirm return false to keep open
 */
function openModal({ title, desc, bodyHtml, confirmLabel = 'Confirm', danger = false, onConfirm }) {
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
  if (typeof bodyHtml === 'string') {
    body.innerHTML = bodyHtml;
  } else if (bodyHtml) {
    body.appendChild(bodyHtml);
  }
  const confirmBtn = $('#modal-confirm');
  confirmBtn.textContent = confirmLabel;
  confirmBtn.classList.toggle('btn-danger', Boolean(danger));
  modalOnConfirm = onConfirm;
  $('#modal-root').hidden = false;
  const focusable = body.querySelector('input, textarea, button');
  if (focusable) focusable.focus();
}

async function handleModalConfirm() {
  if (!modalOnConfirm) {
    closeModal();
    return;
  }
  const result = await modalOnConfirm();
  if (result === false) return;
  closeModal();
}

/* ── Library ───────────────────────────────────────────── */

async function refreshList() {
  const list = await api.listTemplates(
    showArchived ? { onlyArchived: true } : { includeArchived: false }
  );
  const ul = $('#template-list');
  ul.innerHTML = '';
  const hint = $('#lib-mode-hint');
  hint.hidden = !showArchived;

  if (!list.length) {
    const li = document.createElement('li');
    li.innerHTML = `<p class="hint" style="margin:0">${
      showArchived ? 'No archived templates' : 'No templates yet'
    }</p>`;
    ul.appendChild(li);
    return list;
  }

  for (const t of list) {
    const li = document.createElement('li');
    li.className = 'template-row';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'template-item' + (current?.id === t.id ? ' active' : '');
    btn.innerHTML = `<span class="t-title"></span><span class="t-meta"></span>`;
    btn.querySelector('.t-title').textContent = t.title || 'Untitled';
    btn.querySelector('.t-meta').textContent =
      (t.archived ? 'Archived · ' : '') + formatWhen(t.updatedAt);
    btn.addEventListener('click', () => openTemplate(t.id));

    const menuWrap = document.createElement('div');
    menuWrap.className = 'template-menu';
    const menuBtn = document.createElement('button');
    menuBtn.type = 'button';
    menuBtn.className = 'template-menu-btn';
    menuBtn.setAttribute('aria-label', 'Template actions');
    menuBtn.innerHTML = '<i class="ph-light ph-dots-three"></i>';
    const pop = document.createElement('div');
    pop.className = 'template-menu-pop';
    pop.dataset.menuFor = t.id;

    const actions = [
      {
        label: 'Rename',
        icon: 'ph-pencil-simple',
        run: () => renameTemplate(t),
      },
      {
        label: t.archived ? 'Unarchive' : 'Archive',
        icon: t.archived ? 'ph-arrow-u-up-left' : 'ph-archive',
        run: () => toggleArchive(t),
      },
      {
        label: 'Delete',
        icon: 'ph-trash',
        danger: true,
        run: () => deleteTemplateConfirm(t),
      },
    ];

    for (const a of actions) {
      const ab = document.createElement('button');
      ab.type = 'button';
      if (a.danger) ab.className = 'danger';
      ab.innerHTML = `<i class="ph-light ${a.icon}"></i><span></span>`;
      ab.querySelector('span').textContent = a.label;
      ab.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllMenus();
        a.run();
      });
      pop.appendChild(ab);
    }

    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const willOpen = openMenuId !== t.id;
      closeAllMenus();
      if (willOpen) {
        pop.classList.add('open');
        openMenuId = t.id;
      }
    });

    menuWrap.append(menuBtn, pop);
    li.append(btn, menuWrap);
    ul.appendChild(li);
  }
  return list;
}

function closeAllMenus() {
  $$('.template-menu-pop').forEach((p) => p.classList.remove('open'));
  openMenuId = null;
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

function sanitizeLabel(raw) {
  return String(raw || '')
    .trim()
    .replace(/[}{<>]/g, '')
    .replace(/\s+/g, '_');
}

/* ── Template CRUD UI ──────────────────────────────────── */

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
  showArchived = false;
  syncArchiveToggle();
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

function renameTemplate(t) {
  openModal({
    title: 'Rename template',
    desc: 'Update the library title. Body and history stay the same.',
    bodyHtml: `<input type="text" class="input" id="modal-input" value="" autocomplete="off" />`,
    confirmLabel: 'Rename',
    onConfirm: async () => {
      const input = $('#modal-input');
      const title = (input?.value || '').trim();
      if (!title) {
        showToast('Title cannot be empty');
        return false;
      }
      const updated = await api.updateTemplate(t.id, { title });
      if (current?.id === t.id) {
        current = updated;
        $('#field-title').value = updated.title;
        $('#editor-heading').textContent = updated.title;
      }
      await refreshList();
      showToast('Renamed');
    },
  });
  // set value after mount
  queueMicrotask(() => {
    const input = $('#modal-input');
    if (input) {
      input.value = t.title || '';
      input.select();
    }
  });
}

async function toggleArchive(t) {
  const archived = !t.archived;
  const updated = await api.updateTemplate(t.id, { archived });
  if (current?.id === t.id) {
    current = updated;
    if (archived && !showArchived) {
      current = null;
      setView('empty');
    }
  }
  await refreshList();
  showToast(archived ? 'Archived' : 'Restored from archive');
}

function deleteTemplateConfirm(t) {
  openModal({
    title: 'Delete template?',
    desc: `“${t.title || 'Untitled'}” and all of its fill history will be permanently removed.`,
    bodyHtml: '',
    confirmLabel: 'Delete',
    danger: true,
    onConfirm: async () => {
      await api.deleteTemplate(t.id);
      if (current?.id === t.id) {
        current = null;
        setView('empty');
      }
      await refreshList();
      showToast('Deleted');
    },
  });
}

function syncArchiveToggle() {
  const btn = $('#btn-toggle-archived');
  btn.setAttribute('aria-pressed', showArchived ? 'true' : 'false');
  btn.title = showArchived ? 'Show active library' : 'Show archived';
}

/* ── Slot insert ───────────────────────────────────────── */

function renderSlotPresets() {
  const row = $('#slot-preset-row');
  if (!row) return;
  row.innerHTML = '';
  for (const label of SLOT_PRESETS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'slot-preset';
    b.textContent = label;
    b.title = `Insert <<<{${label}}>>>`;
    b.addEventListener('click', () => insertSlotAtCursor(label));
    row.appendChild(b);
  }
}

function insertSlotAtCursor(rawLabel) {
  const label = sanitizeLabel(rawLabel);
  if (!label) {
    showToast('Invalid slot label');
    return;
  }
  const ta = $('#field-body');
  if (!ta) return;
  const marker = `<<<{${label}}>>>`;
  const start = ta.selectionStart ?? ta.value.length;
  const end = ta.selectionEnd ?? start;
  const before = ta.value.slice(0, start);
  const after = ta.value.slice(end);
  ta.value = before + marker + after;
  const pos = start + marker.length;
  ta.focus();
  ta.setSelectionRange(pos, pos);
  showToast(`Inserted <<<{${label}}>>>`);
}

function openCustomSlotModal() {
  openModal({
    title: 'Custom slot label',
    desc: 'Letters, numbers, and underscores work best. Spaces become underscores.',
    bodyHtml: `<input type="text" class="input" id="modal-input" placeholder="e.g. company_name" autocomplete="off" />`,
    confirmLabel: 'Insert',
    onConfirm: () => {
      const val = $('#modal-input')?.value;
      const label = sanitizeLabel(val);
      if (!label) {
        showToast('Enter a label');
        return false;
      }
      insertSlotAtCursor(label);
    },
  });
}

/* ── Fill ──────────────────────────────────────────────── */

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

  const fields = $('#slot-fields');
  if (fields) {
    fields.innerHTML = labels
      .map((l) => `<span data-slot-label="${l}"></span>`)
      .join('');
  }
  paintCanvas();
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
      const long = isLongValue(val);
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
  await api.copyText(getFilledText());
  showToast('Copied to clipboard');
}

function saveVersion() {
  if (!current?.id) return;
  openModal({
    title: 'Save version',
    desc: 'Optional message describing this fill (like a commit message). Template body stays intact.',
    bodyHtml: `<textarea id="modal-input" placeholder="e.g. Filled for Acme SWE role"></textarea>`,
    confirmLabel: 'Save version',
    onConfirm: async () => {
      const note = ($('#modal-input')?.value || '').trim();
      await api.updateTemplate(current.id, {
        title: $('#field-title')?.value ?? current.title,
        body: current.body,
      });
      const filledText = getFilledText();
      await api.saveHistory(current.id, {
        values: { ...fillValues },
        filledText,
        note: note || undefined,
      });
      const t = await api.getTemplate(current.id);
      current = t || current;
      showToast(note ? 'Version saved with message' : 'Version saved');
    },
  });
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
  $('#history-note').hidden = true;
  $('#btn-copy-history').hidden = true;

  for (const h of entries) {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'history-item';
    const titleLine = h.note
      ? h.note
      : formatWhen(h.createdAt);
    const metaLine = h.note
      ? formatWhen(h.createdAt)
      : (h.filledText || '').slice(0, 80).replace(/\s+/g, ' ') || '(empty)';
    btn.innerHTML = `<span class="t-title"></span><span class="t-meta"></span>`;
    btn.querySelector('.t-title').textContent = titleLine;
    btn.querySelector('.t-meta').textContent = metaLine;
    btn.addEventListener('click', () => {
      $$('.history-item').forEach((el) => el.classList.remove('active'));
      btn.classList.add('active');
      selectedHistoryId = h.id;
      $('#history-detail').textContent = h.filledText || '';
      const noteEl = $('#history-note');
      if (h.note) {
        noteEl.textContent = h.note;
        noteEl.hidden = false;
      } else {
        noteEl.hidden = true;
      }
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
  $('#btn-slot-custom').addEventListener('click', openCustomSlotModal);
  $('#btn-toggle-archived').addEventListener('click', async () => {
    showArchived = !showArchived;
    syncArchiveToggle();
    await refreshList();
  });
  $('#modal-cancel').addEventListener('click', closeModal);
  $('#modal-confirm').addEventListener('click', handleModalConfirm);
  $('#modal-backdrop').addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!$('#modal-root').hidden) closeModal();
      else closeAllMenus();
    }
  });
  document.addEventListener('click', () => closeAllMenus());
  renderSlotPresets();
  syncArchiveToggle();
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
