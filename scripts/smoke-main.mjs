/**
 * Smoke: load domain store + ensure main entry file exists and is valid CJS.
 * Does not open a BrowserWindow (headless-safe).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStore } from '../src/domain/store.js';
import os from 'node:os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const mainPath = path.join(root, 'electron', 'main.cjs');
const preloadPath = path.join(root, 'electron', 'preload.cjs');
const rendererPath = path.join(root, 'src', 'renderer', 'index.html');

for (const p of [mainPath, preloadPath, rendererPath]) {
  if (!fs.existsSync(p)) {
    console.error('MISSING', p);
    process.exit(1);
  }
}

const mainSrc = fs.readFileSync(mainPath, 'utf8');
if (!mainSrc.includes('BrowserWindow') || !mainSrc.includes('createWindow')) {
  console.error('main.cjs does not look like Electron shell');
  process.exit(1);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'templateit-smoke-'));
const store = createStore(tmp);
const t = store.createTemplate({ title: 'Smoke', body: 'Hi <<<{name}>>>' });
if (!t.id) {
  console.error('store create failed');
  process.exit(1);
}

console.log('SMOKE_OK', {
  main: mainPath,
  dataDir: tmp,
  templateId: t.id,
});
