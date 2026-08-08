# Building TemplateIT

## Prerequisites

- Node.js 20+ (22/24 recommended)
- npm 10+
- Windows for the Windows installer target (this repo is developed on Windows)

## Install

```bash
npm install
# If Electron's binary is missing after install:
npm approve-scripts electron
```

## Brand icons

Source SVGs live in `src/assets/`:

- `templateit-icon.svg` — app icon
- `templateit-wordmark.svg` — logo + wordmark

Generate packaging rasters:

```bash
npm run icons
```

This writes `build/icon.png` (512×512) used by **electron-builder** and the BrowserWindow chrome.

`npm run build` / `prebuild` regenerates icons automatically before packaging.

## Development

```bash
npm start          # run Electron against the source tree
npm test           # domain + UI structure tests
npm run smoke:main # headless entry + store smoke
```

## Production package

```bash
npm run build
```

Runs icons → tests → **electron-builder** and writes artifacts to `dist/`.

| Artifact (Windows) | Description |
|--------------------|-------------|
| `dist/TemplateIT-1.x.x-win-x64.exe` | NSIS installer |
| `dist/TemplateIT-1.x.x-portable.exe` | Portable executable |
| `dist/win-unpacked/` | Unpacked app folder for local smoke |

```bash
npm run build:win   # Windows only
npm run build:dir   # unpacked dir only (faster smoke)
```

## What gets packaged

- `electron/` main + preload
- `src/` domain, renderer, assets
- Production dependencies (e.g. `@phosphor-icons/web`)
- App icon from `build/icon.png` (generated from assets)

Dev-only tools are not shipped as app code; Electron runtime is bundled by the builder.

## CI-friendly checks

```bash
npm test
npm run smoke:main
npm run icons
npm run build:dir
```

## Release checklist

1. Bump `version` in `package.json`
2. Update README version badge if present
3. `npm run build:win`
4. Tag and publish GitHub release with installer + portable artifacts
