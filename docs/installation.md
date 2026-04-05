# Installation

Web.Serial is a static site. There is no build step and no package install required.

## Browser support

Web Serial is supported on desktop Chromium-based browsers:

- Google Chrome 89+
- Microsoft Edge 89+
- Opera 75+

Safari and Firefox do not currently support the Web Serial API.

## Run locally

The app must be served from `localhost` or HTTPS. It will not work from a plain `file://` URL.

Using Python:

```bash
python -m http.server 3000
```

Open `http://localhost:3000` in a supported browser.

Using Node.js:

```bash
npx http-server . -p 3000
```

## Deploy

Because the project is just HTML, CSS, and JavaScript, you can publish it directly to GitHub Pages or any HTTPS-enabled static host.
