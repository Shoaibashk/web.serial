# Web.Serial Agent Instructions

Use this repository as a static web app. There is no build step, no package manifest, and no runtime framework.

## Start Here

- Read [README.md](../README.md) for the product overview.
- Read [docs/architecture.md](../docs/architecture.md) before changing module boundaries or event flow.
- Read [docs/contributing.md](../docs/contributing.md) for contribution and manual validation expectations.
- Read [DESIGN.md](../DESIGN.md) for UI design system and component guidelines.
- Use [docs/troubleshooting.md](../docs/troubleshooting.md) and [docs/usage.md](../docs/usage.md) instead of re-documenting behavior.

## Development Model

- Serve the repo as static files: `python -m http.server 3000` or `npx http-server . -p 3000`.
- Web Serial only works on Chromium-based desktop browsers and requires `localhost` or HTTPS.
- There is no automated test suite in the repo. Validate changes manually in-browser.

## Architecture Rules

- `index.html` is the main app entry and loads CSS/JS directly.
- Core modules live in `js/` and expose singleton instances on `window`.
- `js/app.js` wires UI and event listeners inside a single `DOMContentLoaded` block; keep orchestration there.
- Cross-module communication uses `window` `CustomEvent`s such as `serial:data`, not direct coupling.
- Persist user-facing settings through `window.Config` in `js/config.js`.

## Editing Conventions

- Stay in vanilla ES modules and browser APIs. Avoid adding dependencies or introducing a build step unless explicitly requested.
- Use `async/await` with `try/catch` around serial operations.
- Keep theme work in `styles/themes.css`; keep layout and component styling in `styles/main.css`.
- If you add a config-backed setting: update `DEFAULT_CONFIG`, add the UI control in `index.html`, initialize it in `js/app.js`, and persist via `Config.set()`.

## Non-Obvious Gotchas

- `window.Config.getAll()` does not exist.
- `window.Terminal.flushPending()` exists; `flush()` does not.
- `js/app.js` is smaller than older docs implied; trust the current file, not stale size references.
- `js/plotter.js` must tolerate the first chunk after connect/disconnect starting mid-line.
- The line ending UI uses escaped select values, but config stores real `"\n"`, `"\r"`, or `"\r\n"` characters.

## Manual Validation

- Verify the app still loads from a static server.
- Test the affected flow in the terminal and, if relevant, the plotter tab.
- Recheck persisted settings, quick commands, theme toggle, and local echo when touching config or UI wiring.
- Watch the browser console for Web Serial or rendering errors.
