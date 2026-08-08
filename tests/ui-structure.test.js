/**
 * Structural checks: core UI surfaces + Phosphor icon usage in shipped renderer.
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

describe('UI structure (shipped renderer)', () => {
  it('exposes template list, create/edit, fill, history, and copy controls', () => {
    assert.match(html, /id="template-list"/);
    assert.match(html, /id="view-editor"/);
    assert.match(html, /id="field-title"/);
    assert.match(html, /id="field-body"/);
    assert.match(html, /id="view-fill"/);
    assert.match(html, /id="slot-fields"/);
    assert.match(html, /id="slot-rail"/);
    assert.match(html, /id="slot-editor"/);
    assert.match(html, /id="prompt-canvas"/);
    assert.match(html, /id="view-history"/);
    assert.match(html, /id="history-list"/);
    assert.match(html, /id="btn-copy"/);
    assert.match(html, /id="btn-save-version"/);
    // Final plain text panel removed — copy uses fillTemplate, not a third surface
    assert.doesNotMatch(html, /id="filled-output"/);
    assert.doesNotMatch(html, /Final plain text/i);
  });

  it('uses Phosphor Light icon library (package + classes), not Lucide/FA alone', () => {
    assert.ok(pkg.dependencies['@phosphor-icons/web']);
    assert.match(html, /@phosphor-icons\/web/);
    assert.match(html, /ph-light/);
    assert.doesNotMatch(html, /lucide|fontawesome|material-icons/i);
  });

  it('fill path drives shipped parse/fill modules and slot compose UX', () => {
    assert.match(appJs, /from ['"]\.\.\/domain\/parse\.js['"]/);
    assert.match(appJs, /parseSlots|fillTemplate/);
    assert.match(appJs, /copyText|saveHistory/);
    assert.match(appJs, /selectSlot|slot-editor|activeSlot/);
  });

  it('applies Ethereal Glass / premium prose styling (not terminal mono)', () => {
    assert.match(css, /#050505|Ethereal|double-bezel|Plus Jakarta|Instrument Serif/i);
    assert.match(css, /cubic-bezier\(0\.32,\s*0\.72,\s*0,\s*1\)/);
    assert.match(css, /prose-surface/);
    // Prompt body / canvas use UI font, not Cascadia terminal mono as primary
    assert.match(css, /\.textarea\.prose-surface|\.prompt-canvas/);
    assert.doesNotMatch(css, /\.textarea\s*\{[^}]*Cascadia Code/);
  });
});
