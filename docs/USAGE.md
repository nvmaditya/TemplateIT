# TemplateIt usage

## Core flow

1. **New template** — Create from the sidebar (or empty state).
2. **Edit** — Set a title and paste your prompt body.
3. **Mark slots** — Anywhere values should change per use, write `<<<{label}>>>`.
4. **Save** — Persist title/body to local disk.
5. **Fill** — Opens the fill session: one input per distinct label, live canvas, and final plain text.
6. **Copy filled** — Puts the substituted prompt on the clipboard for a chatbot.
7. **Save version** — Stores a history snapshot (field values + filled text + timestamp). The master template body is not changed.
8. **History** — Browse prior fills for the current template; copy a snapshot or rehydrate values for another edit.

## Slot rules

| Rule | Behavior |
|------|----------|
| Syntax | Exact form `<<<{label}>>>` |
| Label | Non-empty text inside the braces (trimmed) |
| Reuse | Same label → one shared field; all occurrences fill together |
| Missing value | Substitutes as empty string |
| Empty `<<<{}>>>` | Not treated as a slot (left as literal text) |

### Example

Template body:

```text
You are <<<{role}>>>.

Task:
<<<{task}>>>

Constraints:
<<<{constraints}>>>
```

Fill:

- `role` → `senior reviewer`
- `task` → `Review this PR for security issues`
- `constraints` → `Be concise`

Final plain text (what you copy):

```text
You are senior reviewer.

Task:
Review this PR for security issues

Constraints:
Be concise
```

## Data location

By default, Electron stores JSON under the app **userData** directory:

```text
{userData}/templateit/templates.json
{userData}/templateit/history.json
```

On Windows this is typically under `%APPDATA%\templateit\…`.

For development or tests, override with:

```bash
# PowerShell
$env:TEMPLATEIT_DATA_DIR = "C:\path\to\data"
npm start
```

## What is not stored in history

Saving a version does **not**:

- Rewrite the template body
- Fork a new template
- Sync to the cloud

History is a local fill snapshot list only.
