/**
 * Rasterize src/assets/templateit-icon.svg → build/icon.png + build/icon.ico
 * Run: node scripts/generate-icons.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import pngToIco from 'png-to-ico';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const svgPath = path.join(root, 'src', 'assets', 'templateit-icon.svg');
const outDir = path.join(root, 'build');
const svg = fs.readFileSync(svgPath);

fs.mkdirSync(outDir, { recursive: true });

function renderPng(size) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
    background: 'rgba(0,0,0,0)',
  });
  return resvg.render().asPng();
}

function writePng(size, name) {
  const png = renderPng(size);
  const out = path.join(outDir, name);
  fs.writeFileSync(out, png);
  console.log('wrote', out, `(${size}px, ${png.length} bytes)`);
  return out;
}

// electron-builder + BrowserWindow
writePng(512, 'icon.png');
writePng(256, 'icon-256.png');

// NSIS requires true .ico for installer/uninstaller icons
const icoSizes = [16, 32, 48, 64, 128, 256];
const tempPaths = [];
for (const s of icoSizes) {
  const p = path.join(outDir, `_tmp-${s}.png`);
  fs.writeFileSync(p, renderPng(s));
  tempPaths.push(p);
}
const icoBuf = await pngToIco(tempPaths);
const icoOut = path.join(outDir, 'icon.ico');
fs.writeFileSync(icoOut, icoBuf);
console.log('wrote', icoOut, `(${icoBuf.length} bytes)`);
for (const p of tempPaths) fs.unlinkSync(p);

fs.copyFileSync(svgPath, path.join(outDir, 'icon.svg'));
fs.copyFileSync(
  path.join(root, 'src', 'assets', 'templateit-wordmark.svg'),
  path.join(outDir, 'wordmark.svg')
);
console.log('icons ready');
