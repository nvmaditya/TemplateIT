/**
 * Structural checks: core UI surfaces + layout stretch rules + Phosphor.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, 'src', 'renderer', 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(root, 'src', 'renderer', 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src', 'renderer', 'styles.css'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const parseSrc = fs.readFileSync(path.join(root, 'src', 'domain', 'parse.js'), 'utf8');

describe('UI structure (shipped renderer)', () => {
  it('exposes core surfaces, home, retractable slot-insert, pin, history delete', () => {
    assert.match(html, /id="template-list"/);
    assert.match(html, /id="view-editor"/);
    assert.match(html, /id="field-body"/);
    assert.match(html, /id="view-fill"/);
    assert.match(html, /id="prompt-canvas"/);
    assert.match(html, /id="view-history"/);
    assert.match(html, /id="btn-home"/);
    assert.match(html, /id="slot-insert"/);
    assert.match(html, /id="slot-insert-toggle"/);
    assert.match(html, /id="slot-insert-panel"/);
    assert.match(html, /id="slot-open"/);
    assert.match(html, /id="slot-close"/);
    assert.match(html, /id="slot-label-input"/);
    assert.match(html, /id="btn-insert-slot"/);
    assert.match(html, /id="btn-delete-history"/);
    assert.match(html, /id="pinned-grid"/);
    assert.match(html, /Create new template/);
    assert.doesNotMatch(html, /Create first template/);
    assert.doesNotMatch(html, /id="slot-style"/);
  });

  it('uses Phosphor Light icon library', () => {
    assert.ok(pkg.dependencies['@phosphor-icons/web']);
    assert.match(html, /ph-light/);
  });

  it('wires custom delimiter, pin, history delete, home navigation', () => {
    assert.match(appJs, /readDelimiterFromUi|wrapSlot|setSlotInsertExpanded/);
    assert.match(appJs, /deleteHistory|confirmDeleteHistory/);
    assert.match(appJs, /goHome|btn-home|renderPinnedHome|togglePin/);
    assert.match(parseSrc, /triple|<<<\{/);
    assert.match(parseSrc, /DEFAULT_DELIMITER[\s\S]*triple|id: 'triple'/);
  });

  it('forces main column + prose surfaces to consume remaining width', () => {
    assert.match(css, /grid-template-columns:\s*[^;]*1fr/);
    assert.match(css, /\.main\s*\{[^}]*width:\s*100%/s);
    assert.match(css, /\.editor-stack\s*\{[^}]*width:\s*100%/s);
    assert.match(css, /\.field-bezel\s*\{[^}]*width:\s*100%/s);
    assert.match(css, /\.prose-surface\s*\{[^}]*width:\s*100%/s);
    assert.match(css, /view-home|pinned-grid/);
    assert.match(css, /slot-insert-card|slot-insert-toggle/);
  });
});
