/**
 * Rasterize src/assets/templateit-icon.svg → build/icon.png (+ sizes).
 * Run: node scripts/generate-icons.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const svgPath = path.join(root, 'src', 'assets', 'templateit-icon.svg');
const outDir = path.join(root, 'build');
const svg = fs.readFileSync(svgPath);

fs.mkdirSync(outDir, { recursive: true });

function writePng(size, name) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
    background: 'rgba(0,0,0,0)',
  });
  const png = resvg.render().asPng();
  const out = path.join(outDir, name);
  fs.writeFileSync(out, png);
  console.log('wrote', out, `(${size}px, ${png.length} bytes)`);
}

// electron-builder picks build/icon.png (expects ≥256)
writePng(512, 'icon.png');
writePng(256, 'icon-256.png');
// also copy source SVG into build for reference
fs.copyFileSync(svgPath, path.join(outDir, 'icon.svg'));
fs.copyFileSync(
  path.join(root, 'src', 'assets', 'templateit-wordmark.svg'),
  path.join(outDir, 'wordmark.svg')
);
console.log('icons ready');
