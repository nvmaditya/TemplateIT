# TemplateIT — Product Design

**Date:** 2026-08-08  
**Status:** Living product model (updated with shipped features)  
**Product name:** TemplateIT

## Problem

Writers reuse long chatbot prompts with a few variable slots. Today that means copy the prompt, hunt for placeholders, paste values by hand, and lose prior fills. **TemplateIT** is a local desktop app for saving those prompt templates, filling slots visually, copying the result, and keeping a history of filled versions without mutating the master template.

## Product model

### Template
- Durable local record: `id`, `title`, `body`, `archived`, `pinned`, `slotDelimiter`, `createdAt`, `updatedAt`.
- Body is plain text. Slots use a **single delimiter style per template**.
- Default delimiter: open `<<<{` + close `}>>>` → `<<<{label}>>>`.
- Custom open/close allowed; stored on the template and used for parse/fill.
- Distinct labels become fill fields. The same label may appear multiple times; all occurrences share one field value.

### Fill session
- Open a template → parse body with that template’s delimiter → ordered segments (literal text + slot references).
- User edits a map of `label → value` (large values via multi-line compose).
- App derives **filled plain text** by substituting every marker (empty string if unset).
- The template body is never rewritten by filling or by saving history.

### History (fill version)
- Belongs to one template: `id`, `templateId`, `values`, `filledText`, `createdAt`, optional `note` (commit message).
- Saving history appends an entry; parent template body stays unchanged.
- Versions can be listed, opened, copied, or **deleted** individually.

### Library & home
- Create / rename / archive / delete templates.
- **Pin** templates to Home for quick open.
- Home shows centered empty state + pinned cards.

### Copy
- From the fill view (or a history detail), user can copy the fully substituted prompt as plain text for a chatbot.

## Scope

**In:** local Electron app, create/list/open/update templates, configurable slot delimiters, parse/fill UI, save/list/open/delete history, pin/archive, clipboard copy, branded premium local UI.

**Out:** cloud sync, accounts, multi-device, LLM APIs, nested/conditional placeholders, OS-store signing as a hard requirement.

## Architecture

```
┌─────────────┐  IPC   ┌──────────────┐
│  Renderer   │◄──────►│  Main        │
│  modular UI │        │  userData    │
│  surfaces   │        │  store I/O   │
└──────┬──────┘        └──────▲───────┘
       │ pure domain          │
       ▼                      │
┌─────────────┐        ┌──────┴───────┐
│ parse/fill  │        │ JSON store   │
│ history API │        │ (injectable  │
└─────────────┘        │  base path)  │
                       └──────────────┘
```

- **Domain** (`src/domain`): pure functions — parse markers, substitute, history, templates.
- **Store**: read/write templates + history as JSON under a base directory.
- **Main:** BrowserWindow (branded icon), IPC handlers, clipboard.
- **Renderer:** multi-module shell (library, home, editor, slots, fill, history-view).

## Branding

- Product display name: **TemplateIT**
- Package name (npm): `templateit`
- Icon source: `src/assets/templateit-icon.svg`
- Wordmark: `src/assets/templateit-wordmark.svg`
- Packaged raster: `build/icon.png` via `npm run icons`

## Persistence layout

```
{userData}/templateit/
  templates.json   // Template[]
  history.json     // HistoryEntry[]
```

## UI surfaces

1. **Home** — empty state + pinned templates
2. **Library** — list; create; open; pin/archive/rename/delete
3. **Editor** — title + body; retractable insert slot; save; fill; history
4. **Fill** — slot rail + compose + canvas; save version; copy
5. **History** — version list; snapshot; copy; delete version

## Visual direction

- **Vibe:** Ethereal Glass (deep OLED, soft mesh glow, glass cards)
- **Icons:** Phosphor Light + TemplateIT brand assets
- **Type:** Plus Jakarta Sans / Instrument Serif

## Testing

- Domain unit tests: multi-slot parse, fill, immutability, store round-trip, archive/pin/history delete
- UI structure tests: surfaces, modular renderer files, layout width rules, brand strings
- Electron: `npm start` / smoke scripts; package with `npm run build:win`

## Success criteria

Parse/fill with template intact; local lifecycle; history versions + delete; pin to home; custom slot style (default `<<<{}>>>`); copy-ready text; launchable Electron app with TemplateIT branding and assets.
