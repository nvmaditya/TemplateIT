# TemplateIT

**Local desktop app for prompt templates.** Save reusable chatbot prompts, fill `<<<{slot}>>>` fields in a clean UI, copy the result, and keep fill history — without ever mutating the master template.

![Platform](https://img.shields.io/badge/platform-Windows-0078D4?logo=windows)
![Electron](https://img.shields.io/badge/Electron-37-47848F?logo=electron)
![License](https://img.shields.io/badge/license-MIT-green)

## Why

Long system prompts often need a few variables (role, task, code snippet, constraints). Copy-paste hunting is slow and error-prone. TemplateIt turns markers into fields, previews the final text, and versions each fill locally.

## Features

- **Templates** — title + body, stored as local JSON
- **Slots** — `<<<{label}>>>` syntax; same label shares one field
- **Fill session** — slot inputs, visual canvas, final plain-text preview
- **Copy** — one click to clipboard for any chatbot
- **History** — save fill versions (values + rendered text); template body stays intact
- **Offline** — no accounts, no cloud, no LLM API
- **Premium UI** — Ethereal Glass treatment + Phosphor Light icons

## Quick start (development)

```bash
npm install
npm approve-scripts electron   # once if the Electron binary is missing
npm start
```

```bash
npm test              # unit + structure tests
npm run smoke:main    # headless smoke
```

## Build installers

```bash
npm run build         # test + package → dist/
npm run build:win     # Windows NSIS installer
npm run build:dir     # unpacked app only (fast)
```

See [docs/BUILD.md](docs/BUILD.md) for details.

## Slot syntax

```text
You are <<<{role}>>>.
Review this: <<<{code}>>>
Focus on: <<<{focus}>>>
```

| Rule | Detail |
|------|--------|
| Form | `<<<{label}>>>` exactly |
| Shared labels | One input fills every occurrence |
| Missing values | Empty string in the final text |

Full walkthrough: [docs/USAGE.md](docs/USAGE.md).

## Project layout

```text
electron/           Main process + preload (IPC)
src/domain/         Parse, fill, history, JSON store (unit-tested)
src/renderer/       UI (list / editor / fill / history)
docs/               Spec, usage, build notes
tests/              Domain + UI structure tests
```

## Architecture (short)

- **Domain** is pure JS — parse/fill/history/store work without Electron.
- **Main** owns `userData` paths and IPC (CRUD + clipboard).
- **Renderer** talks only through `window.templateit` (preload bridge).

Design freeze: [docs/superpowers/specs/2026-08-08-templateit-design.md](docs/superpowers/specs/2026-08-08-templateit-design.md).

## Data

```text
{userData}/templateit/templates.json
{userData}/templateit/history.json
```

Override for dev/tests:

```powershell
$env:TEMPLATEIT_DATA_DIR = "C:\path\to\data"
npm start
```

## Scripts

| Script | Purpose |
|--------|---------|
| `npm start` | Run Electron in dev |
| `npm test` | Domain + UI structure tests |
| `npm run smoke:main` | Headless entry/store smoke |
| `npm run build` | Test + full package |
| `npm run build:win` | Windows installer |
| `npm run build:dir` | Unpacked directory only |

## License

[MIT](LICENSE)
