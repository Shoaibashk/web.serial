# Web Serial Terminal

A browser-based terminal for communicating with serial devices through the Web Serial API. The project is static, requires no build step, and is designed to stay simple for new users while still giving contributors enough structure to extend it.

## Quick Start

1. Serve the project from `localhost` or HTTPS. Web Serial will not work from plain `file://` URLs.
2. Open the app in Chrome, Edge, or Opera on desktop.
3. Connect a device, match the serial settings, and start sending data.

```bash
python -m http.server 3000
```

Open `http://localhost:3000` after starting the server.

## What It Includes

- Modern and traditional terminal modes.
- Saved commands and configurable serial settings.
- Plotter support for visualizing incoming data.
- Light and dark themes.
- PWA/offline support after the first load.

## Documentation

- [Installation](docs/installation.md)
- [Usage](docs/usage.md)
- [Features](docs/features.md)
- [Architecture](docs/architecture.md)
- [Contributing](docs/contributing.md)
- [Troubleshooting](docs/troubleshooting.md)

## Support

- Repository: [github.com/Shoaibashk/web.serial](https://github.com/Shoaibashk/web.serial)
- Author: [github.com/shoaibashk](https://github.com/shoaibashk)

## License

This project is licensed under the Apache License 2.0. See [LICENSE](LICENSE) for the full terms.
