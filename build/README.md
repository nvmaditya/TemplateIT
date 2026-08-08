# Build resources (TemplateIT)

Generated / packaging assets for **electron-builder** (`buildResources`).

| File | Source | Purpose |
|------|--------|---------|
| `icon.png` | `src/assets/templateit-icon.svg` via `npm run icons` | Windows app + installer icon |
| `icon-256.png` | same | Alternate size |
| `icon.svg` | copy of asset | Reference |
| `wordmark.svg` | `src/assets/templateit-wordmark.svg` | Reference |

Do not hand-edit PNGs — regenerate with:

```bash
npm run icons
```
