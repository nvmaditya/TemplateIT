/**
 * TemplateIt renderer — library, editor, fill canvas, history.
 */

import {
  parseSlots,
  fillTemplate,
  wrapSlot,
  DELIMITER_PRESETS,
  DEFAULT_DELIMITER,
  normalizeDelimiter,
  detectDelimiter,
} from '../domain/parse.js';

const api = window.templateit;

const LONG_SLOT_CHARS = 72;

/** @type {{ id: string, title: string, body: string, archived?: boolean, slotDelimiter?: { open: string, close: string, id?: string } } | null} */
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
/** @type {{ open: string, close: string, id?: string }} */
let activeDelimiter = { ...DEFAULT_DELIMITER };

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

function goHome() {
  current = null;
  fillValues = {};
  activeSlot = null;
  selectedHistoryId = null;
  setView('empty');
  refreshList();
}

function currentDelimiter() {
  if (current?.slotDelimiter) return normalizeDelimiter(current.slotDelimiter);
  return normalizeDelimiter(activeDelimiter);
}

/* ── Modal ─────────────────────────────────────────────── */

function closeModal() {
  $('#modal-root').hidden = true;
  $('#modal-body').innerHTML = '';
  $('#modal-desc').hidden = true;
  modalOnConfirm = null;
}

function openModal({ title, desc, bodyHtml, confirmLabel = 'Confirm', onConfirm }) {
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
  modalOnConfirm = onConfirm;
  $('#modal-root').hidden = false;
  body.querySelector('input, textarea, button, select')?.focus();
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
  $('#lib-mode-hint').hidden = !showArchived;

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

    const actions = [
      { label: 'Rename', icon: 'ph-pencil-simple', run: () => renameTemplate(t) },
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
    return new Date(iso).toLocaleString(undefined, {
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
  return Boolean(s) && (s.length > LONG_SLOT_CHARS || s.includes('\n'));
}

function sanitizeLabel(raw) {
  return String(raw || '')
    .trim()
    .replace(/\s+/g, '_');
}

/* ── Slot insert component ─────────────────────────────── */

function initSlotInsert() {
  const select = $('#slot-style');
  select.innerHTML = '';
  for (const p of DELIMITER_PRESETS) {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.label;
    select.appendChild(opt);
  }
  const custom = document.createElement('option');
  custom.value = 'custom';
  custom.textContent = 'Custom…';
  select.appendChild(custom);

  select.value = DEFAULT_DELIMITER.id;
  select.addEventListener('change', onDelimiterUiChange);
  $('#slot-open')?.addEventListener('input', updateSlotPreview);
  $('#slot-close')?.addEventListener('input', updateSlotPreview);
  $('#slot-label-input')?.addEventListener('input', updateSlotPreview);
  $('#slot-label-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      insertSlotFromUi();
    }
  });
  $('#btn-insert-slot')?.addEventListener('click', insertSlotFromUi);
  updateSlotPreview();
  syncCustomFields();
}

function onDelimiterUiChange() {
  syncCustomFields();
  updateSlotPreview();
  // Persist delimiter choice on current template
  if (current) {
    const d = readDelimiterFromUi();
    activeDelimiter = d;
    current = { ...current, slotDelimiter: d };
  }
}

function syncCustomFields() {
  const isCustom = $('#slot-style').value === 'custom';
  $('#custom-delim-fields').hidden = !isCustom;
  $('#custom-delim-fields-close').hidden = !isCustom;
  $('#slot-insert-row')?.classList.toggle('has-custom', isCustom);
  const row = $('.slot-insert-row');
  if (row) row.classList.toggle('has-custom', isCustom);
}

function readDelimiterFromUi() {
  const style = $('#slot-style').value;
  if (style === 'custom') {
    const open = ($('#slot-open').value || '').trim();
    const close = ($('#slot-close').value || '').trim();
    if (!open || !close) return { ...DEFAULT_DELIMITER };
    return normalizeDelimiter({ id: 'custom', open, close });
  }
  const preset = DELIMITER_PRESETS.find((p) => p.id === style);
  return normalizeDelimiter(preset || DEFAULT_DELIMITER);
}

function setDelimiterUi(delimiter) {
  const d = normalizeDelimiter(delimiter);
  const select = $('#slot-style');
  const preset = DELIMITER_PRESETS.find(
    (p) => p.open === d.open && p.close === d.close
  );
  if (preset) {
    select.value = preset.id;
  } else {
    select.value = 'custom';
    $('#slot-open').value = d.open;
    $('#slot-close').value = d.close;
  }
  syncCustomFields();
  updateSlotPreview();
}

function updateSlotPreview() {
  const d = readDelimiterFromUi();
  const label = sanitizeLabel($('#slot-label-input')?.value) || 'idea';
  const marker = wrapSlot(label, d);
  const prev = $('#slot-preview');
  if (prev) prev.textContent = marker;
}

function insertSlotFromUi() {
  const d = readDelimiterFromUi();
  if ($('#slot-style').value === 'custom' && (!d.open || !d.close)) {
    showToast('Set custom open and close');
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

function insertSlotAtCursor(label, delimiter) {
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

  activeDelimiter = d;
  if (current) {
    current = { ...current, slotDelimiter: d, body: ta.value };
  }
  updateSlotPreview();
  showToast(`Inserted ${marker}`);
}

/* ── Template CRUD ─────────────────────────────────────── */

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

  // Delimiter: stored → detect from body → default
  let d = t.slotDelimiter
    ? normalizeDelimiter(t.slotDelimiter)
    : detectDelimiter(t.body);
  // If body has no slots yet, keep stored/default
  if (!t.body) d = normalizeDelimiter(t.slotDelimiter || DEFAULT_DELIMITER);
  activeDelimiter = d;
  setDelimiterUi(d);

  setView('editor');
  await refreshList();
}

async function createNew() {
  const d = { ...DEFAULT_DELIMITER };
  const t = await api.createTemplate({
    title: 'Untitled template',
    body: `You are a helpful assistant.\n\nTask: ${wrapSlot('task', d)}\nContext: ${wrapSlot('context', d)}\nConstraints: ${wrapSlot('constraints', d)}`,
    slotDelimiter: d,
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
  const slotDelimiter = readDelimiterFromUi();
  const updated = await api.updateTemplate(current.id, {
    title,
    body,
    slotDelimiter,
  });
  current = updated;
  activeDelimiter = normalizeDelimiter(updated.slotDelimiter);
  $('#editor-heading').textContent = updated.title || 'Untitled';
  await refreshList();
  showToast('Saved');
}

function renameTemplate(t) {
  openModal({
    title: 'Rename template',
    desc: 'Update the library title. Body and history stay the same.',
    bodyHtml: `<input type="text" class="input" id="modal-input" autocomplete="off" />`,
    confirmLabel: 'Rename',
    onConfirm: async () => {
      const title = ($('#modal-input')?.value || '').trim();
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
    if (archived && !showArchived) goHome();
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
    onConfirm: async () => {
      await api.deleteTemplate(t.id);
      if (current?.id === t.id) goHome();
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

/* ── Fill ──────────────────────────────────────────────── */

function enterFill() {
  if (!current) return;
  const body = $('#field-body').value;
  const slotDelimiter = readDelimiterFromUi();
  current = {
    ...current,
    title: $('#field-title').value,
    body,
    slotDelimiter,
  };
  activeDelimiter = slotDelimiter;
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
  const d = currentDelimiter();
  const { labels } = parseSlots(body, d);
  slotLabels = labels;
  $('#slot-empty-hint').hidden = labels.length > 0;

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
  const d = currentDelimiter();
  const { segments } = parseSlots(body, d);
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
      if (val && isLongValue(val)) {
        const block = document.createElement('div');
        block.className = 'slot-block filled';
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
        chip.textContent = val || `‹${seg.label}›`;
        chip.addEventListener('click', () => selectSlot(seg.label));
        canvas.appendChild(chip);
      }
    }
  }
  return fillTemplate(body, fillValues, d);
}

function getFilledText() {
  return fillTemplate(current?.body || '', fillValues, currentDelimiter());
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
    desc: 'Optional message describing this fill. Template body stays intact.',
    bodyHtml: `<textarea id="modal-input" placeholder="e.g. Filled for Acme SWE role"></textarea>`,
    confirmLabel: 'Save version',
    onConfirm: async () => {
      const note = ($('#modal-input')?.value || '').trim();
      await api.updateTemplate(current.id, {
        title: $('#field-title')?.value ?? current.title,
        body: current.body,
        slotDelimiter: currentDelimiter(),
      });
      await api.saveHistory(current.id, {
        values: { ...fillValues },
        filledText: getFilledText(),
        note: note || undefined,
      });
      current = (await api.getTemplate(current.id)) || current;
      showToast(note ? 'Version saved with message' : 'Version saved');
    },
  });
}

/* ── History ───────────────────────────────────────────── */

async function openHistory() {
  if (!current) return;
  $('#history-heading').textContent = `${current.title || 'Template'} · history`;
  selectedHistoryId = null;
  await renderHistoryList();
  setView('history');
}

async function renderHistoryList() {
  const entries = await api.listHistory(current.id);
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
      'history-item' + (selectedHistoryId === h.id ? ' active' : '');
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
  selectedHistoryId = h.id;
  $$('.history-item').forEach((el) => el.classList.remove('active'));
  // re-mark active via re-query after list paint is complex; set text now
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
  fillValues = { ...(h.values || {}) };
  // highlight selected row
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
      await api.deleteHistory(h.id);
      if (selectedHistoryId === h.id) {
        selectedHistoryId = null;
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

function deleteSelectedHistory() {
  if (!selectedHistoryId) return;
  // find from current list via get
  api.getHistoryEntry(selectedHistoryId).then((h) => {
    if (h) confirmDeleteHistory(h);
  });
}

async function copyHistory() {
  await api.copyText($('#history-detail').textContent || '');
  showToast('Snapshot copied');
}

/* ── Bind ──────────────────────────────────────────────── */

function bind() {
  $$('[data-action="new"]').forEach((el) => el.addEventListener('click', createNew));
  $('#btn-home').addEventListener('click', goHome);
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
  $('#btn-delete-history').addEventListener('click', deleteSelectedHistory);
  $('#slot-editor').addEventListener('input', onSlotEditorInput);
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
  initSlotInsert();
  syncArchiveToggle();
}

async function boot() {
  if (!api) {
    document.body.innerHTML =
      '<p style="color:#fff;padding:2rem;font-family:sans-serif">TemplateIt must run inside Electron (<code>npm start</code>).</p>';
    return;
  }
  bind();
  await refreshList();
  // Land on home (centered empty) rather than auto-opening first template
  goHome();
}

boot().catch((err) => {
  console.error(err);
  showToast(String(err.message || err));
});
