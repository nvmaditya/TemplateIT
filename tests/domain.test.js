import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  parseSlots,
  fillTemplate,
  wrapSlot,
  DELIMITER_PRESETS,
  normalizeDelimiter,
} from '../src/domain/parse.js';
import {
  createHistoryEntry,
  appendHistory,
  listHistoryForTemplate,
  removeHistoryEntry,
} from '../src/domain/history.js';
import { createTemplate, updateTemplate } from '../src/domain/templates.js';
import { createStore } from '../src/domain/store.js';

const triple = DELIMITER_PRESETS.find((p) => p.id === 'triple');
const braces = DELIMITER_PRESETS.find((p) => p.id === 'braces');

describe('parseSlots', () => {
  it('extracts multiple distinct labels with default braces style', () => {
    const body = 'You are {role}. Task: {task}. Context: {role}.';
    const { labels, segments } = parseSlots(body, braces);
    assert.deepEqual(labels, ['role', 'task']);
    const slotSegs = segments.filter((s) => s.type === 'slot');
    assert.equal(slotSegs.length, 3);
  });

  it('supports triple legacy delimiter', () => {
    const body =
      'You are <<<{role}>>>. Task: <<<{task}>>>. Context: <<<{role}>>>.';
    const { labels } = parseSlots(body, triple);
    assert.deepEqual(labels, ['role', 'task']);
  });

  it('supports brackets, angles, double angles, parens', () => {
    assert.deepEqual(parseSlots('A [x] B', { open: '[', close: ']' }).labels, [
      'x',
    ]);
    assert.deepEqual(parseSlots('A <x> B', { open: '<', close: '>' }).labels, [
      'x',
    ]);
    assert.deepEqual(
      parseSlots('A <<x>> B', { open: '<<', close: '>>' }).labels,
      ['x']
    );
    assert.deepEqual(parseSlots('A (x) B', { open: '(', close: ')' }).labels, [
      'x',
    ]);
  });

  it('wrapSlot builds markers for each style', () => {
    assert.equal(wrapSlot('idea', braces), '{idea}');
    assert.equal(wrapSlot('idea', { open: '[', close: ']' }), '[idea]');
    assert.equal(wrapSlot('idea', triple), '<<<{idea}>>>');
  });
});

describe('fillTemplate', () => {
  it('produces exact substituted string for multi-slot body', () => {
    const body = 'Role: {role}\nIdea: {idea}\nRole again: {role}';
    const filled = fillTemplate(body, { role: 'critic', idea: 'ship less' }, braces);
    assert.equal(filled, 'Role: critic\nIdea: ship less\nRole again: critic');
  });

  it('uses empty string for missing values', () => {
    assert.equal(fillTemplate('A {x} B', {}, braces), 'A  B');
  });

  it('does not mutate the original body string', () => {
    const body = 'Hello {name}';
    const copy = body;
    fillTemplate(body, { name: 'Ada' }, braces);
    assert.equal(body, copy);
  });
});

describe('history + template immutability', () => {
  it('recording a history entry leaves template body unchanged', () => {
    const template = createTemplate({
      title: 'T',
      body: 'Do {idea} carefully',
      slotDelimiter: braces,
      idFactory: () => 'tmpl-1',
      nowFactory: () => '2026-01-01T00:00:00.000Z',
    });
    const bodyBefore = template.body;

    const entry = createHistoryEntry({
      templateId: template.id,
      values: { idea: 'refactor' },
      filledText: fillTemplate(template.body, { idea: 'refactor' }, braces),
      note: 'after cleanup',
      idFactory: () => 'hist-1',
      nowFactory: () => '2026-01-02T00:00:00.000Z',
    });
    const history = appendHistory([], entry);

    assert.equal(template.body, bodyBefore);
    assert.equal(entry.filledText, 'Do refactor carefully');
    assert.equal(entry.note, 'after cleanup');
    assert.deepEqual(listHistoryForTemplate(history, 'tmpl-1').map((h) => h.id), [
      'hist-1',
    ]);
  });

  it('removeHistoryEntry drops one version', () => {
    const a = createHistoryEntry({
      templateId: 't',
      values: {},
      filledText: 'a',
      idFactory: () => 'h1',
      nowFactory: () => 't1',
    });
    const b = createHistoryEntry({
      templateId: 't',
      values: {},
      filledText: 'b',
      idFactory: () => 'h2',
      nowFactory: () => 't2',
    });
    const next = removeHistoryEntry([a, b], 'h1');
    assert.deepEqual(
      next.map((h) => h.id),
      ['h2']
    );
  });

  it('supports rename and archive without clearing body', () => {
    const t = createTemplate({
      title: 'Old',
      body: 'keep {x}',
      idFactory: () => 'id2',
      nowFactory: () => 't1',
    });
    const renamed = updateTemplate(t, { title: 'New' }, () => 't2');
    assert.equal(renamed.title, 'New');
    assert.equal(renamed.body, 'keep {x}');
    const archived = updateTemplate(renamed, { archived: true }, () => 't3');
    assert.equal(archived.archived, true);
  });
});

describe('store persistence round-trip', () => {
  it('save then load templates and history from on-disk store path', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'templateit-test-'));
    const store = createStore(dir);

    const created = store.createTemplate({
      title: 'Prompt pack',
      body: 'Build {feature} with {constraint}',
      slotDelimiter: braces,
    });
    assert.ok(created.id);
    assert.equal(normalizeDelimiter(created.slotDelimiter).open, '{');

    const store2 = createStore(dir);
    const listed = store2.listTemplates();
    assert.equal(listed.length, 1);

    const values = { feature: 'export', constraint: 'no network' };
    const filledText = fillTemplate(listed[0].body, values, braces);
    const bodyBefore = listed[0].body;

    const entry = store2.saveHistoryEntry(listed[0].id, {
      values,
      filledText,
      note: 'export run',
    });
    assert.equal(entry.filledText, 'Build export with no network');
    assert.equal(entry.note, 'export run');
    assert.equal(store2.getTemplate(listed[0].id).body, bodyBefore);

    assert.equal(store2.deleteHistoryEntry(entry.id), true);
    assert.equal(store2.listHistory(listed[0].id).length, 0);
  });

  it('archives hide from default list; history notes persist', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'templateit-arch-'));
    const store = createStore(dir);
    const t = store.createTemplate({ title: 'Live', body: 'Hi {n}' });
    store.saveHistoryEntry(t.id, {
      values: { n: 'Ada' },
      filledText: 'Hi Ada',
      note: 'first pass',
    });
    assert.equal(store.listHistory(t.id)[0].note, 'first pass');

    store.updateTemplate(t.id, { archived: true, title: 'Live renamed' });
    assert.equal(store.listTemplates().length, 0);
    assert.equal(store.listTemplates({ onlyArchived: true }).length, 1);
    store.deleteTemplate(t.id);
    assert.equal(store.listTemplates({ includeArchived: true }).length, 0);
  });
});
