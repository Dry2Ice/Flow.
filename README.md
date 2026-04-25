# Flow

## Monaco editor local asset hosting

The code editor is configured to load Monaco assets from first-party URLs (`/monaco/vs`) instead of a CDN.

### How it works

- `src/components/CodeEditor.tsx` configures `@monaco-editor/loader` with `paths.vs = "/monaco/vs"` before mounting the editor.
- `scripts/sync-monaco-assets.mjs` copies Monaco runtime files from `node_modules/monaco-editor/min/vs` into `public/monaco/vs`.
- `predev` and `prebuild` run `npm run sync:monaco-assets`, so both local development and production builds serve Monaco workers/CSS from same-origin URLs.

### Upgrade notes

When upgrading `monaco-editor` or `@monaco-editor/react`, keep this local-asset flow in place:

1. Verify `npm run sync:monaco-assets` still copies `node_modules/monaco-editor/min/vs`.
2. Confirm the editor continues to load `/monaco/vs/*` requests (including worker scripts and editor CSS) from the app origin.
3. Keep the Monaco initialization fallback/error state in `CodeEditor` so users see a clear message if assets are missing.
