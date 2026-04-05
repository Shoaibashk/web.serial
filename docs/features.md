# Features

Web.Serial is built to stay lightweight while still covering the most common serial workflows.

## Core capabilities

- Browser-based serial access from supported Chromium browsers.
- Modern and traditional terminal interaction modes.
- Configurable serial settings including baud rate, parity, stop bits, and flow control.
- Local echo and line ending controls.
- Quick commands stored in the browser.
- ANSI color rendering for terminal output.
- Light and dark themes.
- Offline-friendly PWA behavior through the service worker.
- Built-in plotter for visualizing incoming serial data.

## Offline support

The app ships with a service worker and manifest so it can be installed and used offline after the first load.

## Security and privacy

The application runs entirely in the browser. There is no backend server, and device data stays on your machine. Settings, theme preferences, and saved commands are stored in local storage.
