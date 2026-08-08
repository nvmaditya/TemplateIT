/** Fill session: slot rail, compose, canvas, copy, save version. */

import { parseSlots, fillTemplate } from '../domain/parse.js';
import { $, setView, showToast } from './dom.js';
import { formatCount, previewLine, isLongValue } from './format.js';
import { openModal } from './modal.js';
import { currentDelimiter, readDelimiterFromUi } from './slots.js';
import { api, state } from './state.js';

export function enterFill() {
  if (!state.current) return;
  const body = $('#field-body').value;
  const slotDelimiter = readDelimiterFromUi();
  state.current = {
    ...state.current,
    title: $('#field-title').value,
    body,
    slotDelimiter,
  };
  state.activeDelimiter = slotDelimiter;
  state.fillValues = { ...state.fillValues };
  $('#fill-heading').textContent = state.current.title || 'Fill';
  renderFill();
  setView('fill', state);
}

export function selectSlot(label) {
  state.activeSlot = label;
  const compose = $('#slot-compose');
  const editor = $('#slot-editor');
  if (!label) {
    compose.hidden = true;
    return;
  }
  compose.hidden = false;
  $('#slot-compose-label').textContent = label;
  editor.value = state.fillValues[label] || '';
  $('#slot-compose-count').textContent = formatCount(editor.value);
  paintSlotRail();
  editor.focus();
}

export function onSlotEditorInput() {
  if (!state.activeSlot) return;
  const editor = $('#slot-editor');
  state.fillValues[state.activeSlot] = editor.value;
  $('#slot-compose-count').textContent = formatCount(editor.value);
  paintSlotRail();
  paintCanvas();
}

function paintSlotRail() {
  const rail = $('#slot-rail');
  rail.innerHTML = '';
  for (const label of state.slotLabels) {
    const val = state.fillValues[label] || '';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.role = 'tab';
    btn.className =
      'slot-tab' +
      (state.activeSlot === label ? ' active' : '') +
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

export function renderFill() {
  const body = state.current?.body || '';
  const d = currentDelimiter();
  const { labels } = parseSlots(body, d);
  state.slotLabels = labels;
  $('#slot-empty-hint').hidden = labels.length > 0;

  for (const label of labels) {
    if (state.fillValues[label] === undefined) state.fillValues[label] = '';
  }
  for (const key of Object.keys(state.fillValues)) {
    if (!labels.includes(key)) delete state.fillValues[key];
  }

  if (!labels.length) {
    state.activeSlot = null;
    $('#slot-compose').hidden = true;
    $('#slot-rail').innerHTML = '';
  } else if (!state.activeSlot || !labels.includes(state.activeSlot)) {
    selectSlot(labels[0]);
  } else {
    selectSlot(state.activeSlot);
  }

  const fields = $('#slot-fields');
  if (fields) {
    fields.innerHTML = labels
      .map((l) => `<span data-slot-label="${l}"></span>`)
      .join('');
  }
  paintCanvas();
}

export function paintCanvas() {
  const body = state.current?.body || '';
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
      const val = state.fillValues[seg.label] || '';
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
  return fillTemplate(body, state.fillValues, d);
}

export function getFilledText() {
  return fillTemplate(
    state.current?.body || '',
    state.fillValues,
    currentDelimiter()
  );
}

export async function copyFilled() {
  paintCanvas();
  await api().copyText(getFilledText());
  showToast('Copied to clipboard');
}

export function saveVersion() {
  if (!state.current?.id) return;
  openModal({
    title: 'Save version',
    desc: 'Optional message describing this fill. Template body stays intact.',
    bodyHtml: `<textarea id="modal-input" placeholder="e.g. Filled for Acme SWE role"></textarea>`,
    confirmLabel: 'Save version',
    onConfirm: async () => {
      const note = ($('#modal-input')?.value || '').trim();
      await api().updateTemplate(state.current.id, {
        title: $('#field-title')?.value ?? state.current.title,
        body: state.current.body,
        slotDelimiter: currentDelimiter(),
      });
      await api().saveHistory(state.current.id, {
        values: { ...state.fillValues },
        filledText: getFilledText(),
        note: note || undefined,
      });
      state.current =
        (await api().getTemplate(state.current.id)) || state.current;
      showToast(note ? 'Version saved with message' : 'Version saved');
    },
  });
}
