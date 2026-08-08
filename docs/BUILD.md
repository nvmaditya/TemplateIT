# Building TemplateIt

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

This runs tests, then **electron-builder** and writes artifacts to `dist/`.

| Artifact (Windows) | Description |
|--------------------|-------------|
| `dist/TemplateIt Setup *.exe` | NSIS installer |
| `dist/TemplateIt *.exe` | Portable executable (if configured) |
| `dist/win-unpacked/` | Unpacked app folder for local smoke |

Platform-specific:

```bash
npm run build:win   # Windows only
npm run build:dir   # unpacked dir only (faster smoke)
```

## What gets packaged

- `electron/` main + preload
- `src/` domain + renderer
- Production dependencies (e.g. `@phosphor-icons/web`)

Dev-only tools (`electron` as a runtime is bundled by the builder; test files are excluded).

## CI-friendly checks

```bash
npm test
npm run smoke:main
npm run build:dir
```

`build:dir` produces `dist/win-unpacked` without a full installer (faster).
