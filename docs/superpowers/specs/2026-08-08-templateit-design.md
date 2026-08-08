# TemplateIt — Product Design

**Date:** 2026-08-08  
**Status:** Frozen for implementation (goal harness)

## Problem

Writers reuse long chatbot prompts with a few variable slots. Today that means copy the prompt, hunt for placeholders, paste values by hand, and lose prior fills. TemplateIt is a local desktop app for saving those prompt templates, filling slots visually, copying the result, and keeping a history of filled versions without mutating the master template.

## Product model

### Template
- Durable local record: `id`, `title`, `body`, `createdAt`, `updatedAt`.
- Body is plain text. Optional slots use the exact syntax `<<<{label}>>>` where `label` is a non-empty string without nested `>>>`.
- Distinct labels become fill fields. The same label may appear multiple times; all occurrences share one field value.

### Fill session
- Open a template → parse body into ordered segments (literal text + slot references).
- User edits a map of `label → value`.
- App derives **filled plain text** by substituting every marker with its value (empty string if unset).
- The template body is never rewritten by filling or by saving history.

### History (fill version)
- Belongs to one template: `id`, `templateId`, `values` (label→string), `filledText` (rendered snapshot), `createdAt`, optional `note`.
- Saving history appends an entry; parent template body/title stay unchanged.
- Opening a history entry shows saved filled text and can rehydrate field values for re-edit/copy.

### Copy
- From the fill view (or a history detail), user can copy the fully substituted prompt as plain text for a chatbot.

## Scope

**In:** local Electron app, create/list/open/update templates, parse/fill UI, save/list/open history, clipboard copy, premium local UI with light-line icons.

**Out:** cloud sync, accounts, LLM APIs, nested/conditional placeholders, other marker syntaxes, OS-store packaging, tags/folders/search ranking.

## Architecture

```
┌─────────────┐  IPC   ┌──────────────┐
│  Renderer   │◄──────►│  Main        │
│  list/edit  │        │  userData    │
│  fill/hist  │        │  store I/O   │
└──────┬──────┘        └──────▲───────┘
       │ pure domain          │
       ▼                      │
┌─────────────┐        ┌──────┴───────┐
│ parse/fill  │        │ JSON store   │
│ history API │        │ (injectable  │
└─────────────┘        │  base path)  │
                       └──────────────┘
```

- **Domain** (`src/domain`): pure functions — parse markers, substitute, append history records. Unit-tested without Electron.
- **Store** (`src/domain/store`): read/write templates + history as JSON under a base directory (Electron `userData` in production; temp dir in tests).
- **Main:** BrowserWindow, IPC handlers for store CRUD, clipboard write.
- **Preload:** contextBridge exposing a narrow API.
- **Renderer:** multi-view shell (list → editor → fill → history) with Ethereal Glass visual treatment and Phosphor Light icons.

## Placeholder syntax

- Pattern: `<<<{label}>>>` (literal angle brackets and braces).
- Label: trimmed interior; empty labels ignored as non-slots.
- Parse is left-to-right; no escaping in v1.
- Fill replaces each full marker substring with the value for that label.

## Persistence layout

```
{userData}/templateit/
  templates.json   // Template[]
  history.json     // HistoryEntry[]
```

## UI surfaces

1. **Library** — list templates; create new; open; delete optional if simple.
2. **Editor** — title + body; save; “Fill” to open fill view.
3. **Fill** — body rendered with inline slot fields (or sidebar fields + preview); Save version; Copy filled text.
4. **History** — list entries for current template; open detail (filled text + values).

## Visual direction

- **Vibe:** Ethereal Glass (deep OLED, soft mesh glow, glass cards, white hairlines).
- **Layout:** Editorial split / focused work surface (sidebar library + main pane).
- **Icons:** Phosphor Light (not Lucide/FA/Material thick defaults).
- **Type:** Plus Jakarta Sans / Geist-style grotesk (no Inter/Roboto/Arial).

## Testing

- Domain unit tests: multi-slot parse, exact fill string, body immutable after history append, store save/load round-trip with injectable path.
- Electron: `npm start` / documented script; smoke require of main if GUI unavailable.
- UI structure: assert views and icon imports in source.

## Success criteria

Matches goal acceptance: parse/fill with template intact; local lifecycle; history versions; copy-ready text; launchable Electron + premium UI with icon library.
