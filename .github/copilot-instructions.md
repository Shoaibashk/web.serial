# Web Serial Terminal — Workspace Guidelines

## Project Overview

A modern, serverless, browser-based terminal interface for serial communication using the Web Serial API. **No build step required**—served as static files (HTML, CSS, JS).

- **Supported Browsers**: Chrome 89+, Edge 89+, Opera 75+ (desktop, HTTPS or localhost only)
- **Architecture**: Vanilla ES6 modules, no runtime JS dependencies (Google Fonts loaded via CSS)
- **Deployment**: GitHub Pages or any static host (HTTPS required for Web Serial API)
- **PWA**: Installable as a Progressive Web App (service worker + manifest)

## Code Style

### Vanilla ES6 & Global Namespace Pattern

All modules expose classes on `window` (e.g., `window.Config`, `window.Serial`, `window.Terminal`, `window.Input`, `window.Plotter`):

```javascript
class Config {
  constructor() {
    /* ... */
  }
  get(key) {
    /* ... */
  }
  set(key, value) {
    /* ... */
  }
}
window.Config = new Config();
```

**Conventions:**

- Use `async/await` with `try/catch` error handling
- Avoid third-party dependencies
- Use CSS custom properties for theming (light/dark mode via `data-theme` attribute)
- Performance-critical sections use batching/debouncing (e.g., terminal renderer batches with 16ms debounce)

## Architecture

### Module Structure

| Module                 | Purpose                                 | Key Exports                                                           |
| ---------------------- | --------------------------------------- | --------------------------------------------------------------------- |
| `config.js`            | Persistent state (localStorage-backed)  | `Config` class (singleton)                                            |
| `serial-manager.js`    | Web Serial API wrapper                  | `Serial` class (events: `connected`, `data`, `disconnected`, `error`) |
| `terminal-renderer.js` | ANSI color parsing & DOM rendering      | `Terminal` class (5000-line buffer max)                               |
| `input-handler.js`     | Two UI modes (Modern, Traditional)      | `Input` class (handles mode switching)                                |
| `plotter.js`           | Real-time serial data plotter (canvas)  | `Plotter` class (pan/zoom, multi-channel, CSV parsing)                |
| `app.js`               | Main orchestration & event coordination | App initialization, UI wiring, tab switching                          |

### Inter-Module Communication

All modules communicate via **custom DOM events** dispatched on `window`:

- `serial:connected` — Device connected (detail: `{usbVendorId, usbProductId}`)
- `serial:data` — Data received (`event.detail` is the decoded string directly)
- `serial:disconnected` — Device disconnected
- `serial:error` — Read/write error (detail: `Error` object)
- `serial:stats` — Byte count update (detail: `{rx, tx}`)
- `config:changed` — Config persisted (carries `event.detail.key`, `value`)

Example:

```javascript
window.addEventListener("serial:data", (e) => {
  console.log("Received:", e.detail); // e.detail is the string directly
});
```

### Design Principles

- **No tight coupling**: Modules observe events rather than calling each other directly
- **Persistent state**: All settings auto-save via `Config` → localStorage
- **Buffering & performance**: Terminal renderer caps at 5000 lines, debounced rendering
- **Error resilience**: Serial operations wrapped in try/catch with user feedback

## Build and Test

### Local Development

No build step required. Serve via HTTP (Web Serial API requires HTTPS in production or `localhost` in dev):

**Python:**

```bash
python -m http.server 3000
```

**Node.js:**

```bash
npx http-server . -p 3000
```

Then visit `http://localhost:3000`

### Deployment

Push to GitHub and enable Pages on the repo (HTTPS automatic via GitHub Pages).

### Testing

No formal test framework. Validate manually in supported browsers (Chrome, Edge, Opera):

- Check DevTools LocalStorage for persisted `config_*` and `commands_*` keys
- Verify custom events fire using DevTools console event listener
- Test serial connectivity with an actual device or emulator

## Conventions

### Adding New Features

1. **Create a module** (class-based) if it represents a major component
2. **Emit custom events** for cross-module communication (not direct method calls)
3. **Persist state via `Config`** if the feature has user-defined settings
4. **Keep the UI logic in `app.js`**, module code focused and isolated

### Modifying Styles

- Edit `main.css` for layout/component styles
- Edit `themes.css` for color variables (theme vars use pattern `--ansi-*` for terminal colors, `--bg-base`/`--bg-surface`/`--text-main` etc. for UI, `--plotter-*` for plotter)
- Switch themes dynamically via `document.documentElement.setAttribute('data-theme', 'dark'|'light')`

### Adding a Config Setting

1. Add key + default value to `DEFAULT_CONFIG` in `config.js`
2. Add UI element in `index.html`
3. Initialize UI value from `Config.get()` in `app.js` `initializeUI()`
4. Wire a `change` listener in `app.js` to call `Config.set()`

### Terminal Output Types

`Terminal.print(text, type)` — `type` controls styling:

| type       | appearance                | rendering      |
| ---------- | ------------------------- | -------------- |
| `'normal'` | unstyled, ANSI-parsed     | batched (16ms) |
| `'system'` | `[SYSTEM]` prefix, styled | immediate      |
| `'error'`  | `[ERROR]` prefix, styled  | immediate      |
| `'echo'`   | prompt-styled             | immediate      |

### Common DevTools Tips

- **Check config state**: `JSON.parse(localStorage.getItem('web_serial_terminal_config'))` → full saved config
- **Check serial connection**: `window.Serial.isConnected` → boolean
- **Trigger a data render**: `window.Terminal.flushPending()` → force-flushes batched text
- **Clear all storage**: `localStorage.clear()` → resets saved commands & settings
- **Print to terminal**: `window.Terminal.print('msg', 'system')` → types: `'normal'`, `'system'`, `'error'`, `'echo'`
- **Check RX/TX stats**: `window.Serial.stats` → `{rx, tx}` byte counts
- **Check plotter state**: `window.Plotter.running` → boolean, `window.Plotter.channels` → Map of channel data

## Key Files at a Glance

- **index.html** — Single HTML entry point; includes all JS/CSS
- **js/app.js** — ~340 lines; initialization, event wiring, UI state, tab switching
- **js/serial-manager.js** — Web Serial API wrapper, device read/write loop
- **js/terminal-renderer.js** — ANSI parser, DOM updates, 5000-line buffer
- **js/input-handler.js** — Modern (separate input) vs. Traditional (prompt-style) mode switching
- **js/plotter.js** — ~700 lines; canvas-based serial plotter with pan/zoom, multi-channel CSV parsing
- **js/config.js** — localStorage abstraction with merge defaults
- **styles/main.css** — Layout, components, responsive design (~920 lines)
- **styles/themes.css** — Light/dark mode color definitions + ANSI terminal colors
- **service-worker.js** — PWA offline caching
- **manifest.json** — PWA manifest for installability

See [README.md](../README.md) for feature overview and user guide.
