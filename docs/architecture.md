# Architecture

Web.Serial uses vanilla ES6 modules and a global namespace pattern for simplicity and zero dependencies.

## Core modules

| Module                 | Purpose                                    |
| ---------------------- | ------------------------------------------ |
| `config.js`            | localStorage-backed persistent settings    |
| `serial-manager.js`    | Web Serial API wrapper and read/write loop |
| `terminal-renderer.js` | ANSI parsing and terminal rendering        |
| `input-handler.js`     | Modern and Traditional input modes         |
| `plotter.js`           | Chart-based serial data visualization      |
| `app.js`               | Application orchestration and event wiring |

## Event-driven architecture

Modules communicate through custom DOM events on `window`.

- `serial:connected`
- `serial:data`
- `serial:disconnected`
- `serial:error`
- `serial:stats`
- `config:changed`

Example:

```javascript
window.addEventListener("serial:data", (event) => {
  console.log("RX:", event.detail);
});
```

## Design principles

- No build step.
- No third-party runtime dependencies.
- Persist user preferences automatically.
- Keep modules small and loosely coupled.
- Batch rendering for responsiveness.
