import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseSlots, fillTemplate } from '../src/domain/parse.js';
import {
  createHistoryEntry,
  appendHistory,
  listHistoryForTemplate,
} from '../src/domain/history.js';
import { createTemplate, updateTemplate } from '../src/domain/templates.js';
import { createStore } from '../src/domain/store.js';

describe('parseSlots', () => {
  it('extracts multiple distinct labels in order of first appearance', () => {
    const body =
      'You are <<<{role}>>>. Task: <<<{task}>>>. Context: <<<{role}>>>.';
    const { labels, segments } = parseSlots(body);
    assert.deepEqual(labels, ['role', 'task']);
    const slotSegs = segments.filter((s) => s.type === 'slot');
    assert.equal(slotSegs.length, 3);
    assert.equal(slotSegs[0].label, 'role');
    assert.equal(slotSegs[1].label, 'task');
    assert.equal(slotSegs[2].label, 'role');
  });

  it('handles body with no slots', () => {
    const { labels, segments } = parseSlots('plain prompt');
    assert.deepEqual(labels, []);
    assert.equal(segments.length, 1);
    assert.equal(segments[0].value, 'plain prompt');
  });
});

describe('fillTemplate', () => {
  it('produces exact substituted string for multi-slot body', () => {
    const body =
      'Role: <<<{role}>>>\nIdea: <<<{idea}>>>\nRole again: <<<{role}>>>';
    const filled = fillTemplate(body, { role: 'critic', idea: 'ship less' });
    assert.equal(
      filled,
      'Role: critic\nIdea: ship less\nRole again: critic'
    );
  });

  it('uses empty string for missing values', () => {
    assert.equal(fillTemplate('A <<<{x}>>> B', {}), 'A  B');
  });

  it('does not mutate the original body string', () => {
    const body = 'Hello <<<{name}>>>';
    const copy = body;
    fillTemplate(body, { name: 'Ada' });
    assert.equal(body, copy);
    assert.equal(body, 'Hello <<<{name}>>>');
  });
});

describe('history + template immutability', () => {
  it('recording a history entry leaves template body unchanged', () => {
    const template = createTemplate({
      title: 'T',
      body: 'Do <<<{idea}>>> carefully',
      idFactory: () => 'tmpl-1',
      nowFactory: () => '2026-01-01T00:00:00.000Z',
    });
    const bodyBefore = template.body;

    const entry = createHistoryEntry({
      templateId: template.id,
      values: { idea: 'refactor' },
      filledText: fillTemplate(template.body, { idea: 'refactor' }),
      idFactory: () => 'hist-1',
      nowFactory: () => '2026-01-02T00:00:00.000Z',
    });
    const history = appendHistory([], entry);

    assert.equal(template.body, bodyBefore);
    assert.equal(template.body, 'Do <<<{idea}>>> carefully');
    assert.equal(entry.filledText, 'Do refactor carefully');
    assert.deepEqual(listHistoryForTemplate(history, 'tmpl-1').map((h) => h.id), [
      'hist-1',
    ]);
  });

  it('updateTemplate changes body on a new object without touching history concept', () => {
    const t = createTemplate({
      title: 'A',
      body: 'x',
      idFactory: () => 'id',
      nowFactory: () => 't1',
    });
    const u = updateTemplate(t, { body: 'y' }, () => 't2');
    assert.equal(t.body, 'x');
    assert.equal(u.body, 'y');
    assert.equal(u.updatedAt, 't2');
  });
});

describe('store persistence round-trip', () => {
  it('save then load templates and history from on-disk store path', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'templateit-test-'));
    const store = createStore(dir);

    const created = store.createTemplate({
      title: 'Prompt pack',
      body: 'Build <<<{feature}>>> with <<<{constraint}>>>',
    });
    assert.ok(created.id);
    assert.equal(created.title, 'Prompt pack');

    // New store instance = reload from disk
    const store2 = createStore(dir);
    const listed = store2.listTemplates();
    assert.equal(listed.length, 1);
    assert.equal(listed[0].body, created.body);
    assert.equal(listed[0].title, 'Prompt pack');

    const values = { feature: 'export', constraint: 'no network' };
    const filledText = fillTemplate(listed[0].body, values);
    const bodyBefore = listed[0].body;

    const entry = store2.saveHistoryEntry(listed[0].id, { values, filledText });
    assert.equal(entry.filledText, 'Build export with no network');

    const after = store2.getTemplate(listed[0].id);
    assert.equal(after.body, bodyBefore);

    const store3 = createStore(dir);
    const hist = store3.listHistory(listed[0].id);
    assert.equal(hist.length, 1);
    assert.equal(hist[0].filledText, 'Build export with no network');
    assert.deepEqual(hist[0].values, values);

    // files exist on disk
    assert.ok(fs.existsSync(path.join(dir, 'templates.json')));
    assert.ok(fs.existsSync(path.join(dir, 'history.json')));
  });
});
