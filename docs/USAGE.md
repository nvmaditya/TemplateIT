# TemplateIT usage

## Core flow

1. **Home** — Centered empty state; create a template or open a **pinned** one.
2. **New template** — From the sidebar or home CTA.
3. **Edit** — Set a title and paste your prompt body.
4. **Insert slot** — Expand the insert-slot panel; default markers are `<<<{label}>>>`. Custom open/close is saved on that template (one style per template).
5. **Save** — Persist title, body, and slot style to local disk.
6. **Fill** — Slot rail + multi-line compose for large values; live prompt canvas.
7. **Copy filled** — Puts the substituted prompt on the clipboard for a chatbot.
8. **Save version** — Optional commit message; stores values + filled text + time. Master template body is unchanged.
9. **History** — Browse versions, copy a snapshot, or **delete** a version.
10. **Library** — Rename, pin/unpin to home, archive, delete.

## Slot rules

| Rule | Behavior |
|------|----------|
| Default syntax | `<<<{label}>>>` |
| Custom syntax | Open + close strings set in Insert slot (e.g. `{` / `}`, `[[` / `]]`) |
| Per template | One delimiter style only; saved with the template |
| Label | Non-empty (trimmed); spaces become `_` when inserting via UI |
| Reuse | Same label → one shared field; all occurrences fill together |
| Missing value | Substitutes as empty string |
| Empty label | Not treated as a slot |

### Example (default style)

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

Copied plain text:

```text
You are senior reviewer.

Task:
Review this PR for security issues

Constraints:
Be concise
```

## Library actions

| Action | Effect |
|--------|--------|
| **Pin to home** | Shows a card on the Home screen |
| **Archive** | Hides from active library (also unpins) |
| **Rename** | Title only; body/history intact |
| **Delete** | Removes template and all of its history |

## History versions

- **Save version** from the fill view (optional message).
- **Delete version** from the history list (trash) or snapshot panel.
- Deleting a version never rewrites the template body.

## Data location

By default, Electron stores JSON under the app **userData** directory:

```text
{userData}/templateit/templates.json
{userData}/templateit/history.json
```

On Windows this is typically under `%APPDATA%\templateit\…` (product data folder may appear as **TemplateIT**).

For development or tests:

```powershell
$env:TEMPLATEIT_DATA_DIR = "C:\path\to\data"
npm start
```

## What is out of scope

- Cloud sync, accounts, multi-device
- In-app LLM / chatbot
- Nested or conditional placeholders
