# TemplateIt

Local Electron app for saving chatbot prompt templates, filling `<<<{slot}>>>` placeholders, copying the result, and keeping fill history without changing the master template.

## Quick start

```bash
npm install
npm start
```

## Scripts

| Command | Purpose |
|--------|---------|
| `npm start` | Launch the Electron app |
| `npm test` | Domain + persistence unit tests |
| `npm run smoke:main` | Headless smoke (entry files + store) |

## Slot syntax

In a template body, mark fill fields with:

```text
<<<{label}>>>
```

Example:

```text
You are <<<{role}>>>.
Review this: <<<{code}>>>
Focus on: <<<{focus}>>>
```

Same label → one shared field (all occurrences fill together).

## Data

Templates and history are stored as JSON under Electron `userData/templateit/` (override with env `TEMPLATEIT_DATA_DIR`).

## Design

See [docs/superpowers/specs/2026-08-08-templateit-design.md](docs/superpowers/specs/2026-08-08-templateit-design.md).
