# Web Serial Terminal

A modern, user-friendly, serverless web-based terminal interface for communicating with devices using the Web Serial API.

## Features

- **Connect from Browser:** Communicate with serial devices directly from Chrome, Edge, or Edge without any additional drivers or software wrappers.
- **Configurable Settings:** Customize baud rate, data bits, parity, stop bits, and flow control.
- **Two Terminal Modes:**
  - **Modern Mode:** Separate input field, built for clarity and easy payload formatting.
  - **Traditional Mode:** Classic prompt style terminal, character-by-character typing with simulated cursor.
- **Data Customization:** Full control over Line Endings (CR, LF, CR+LF) and Local Echo.
- **Quick Commands:** Save and run frequently used commands efficiently (saved in your browser).
- **Themes & Layout:** Toggle between Light and Dark modes. Hideable side panels to focus purely on the terminal output.
- **Control Sequences:** Easily send Ctrl+C and Ctrl+Z commands.
- **ANSI Color Support:** Basic ANSI 16-color code support to render formatted device output.

## Browser Support

Web Serial API is currently supported in Chromium-based browsers on desktop environments:

- Google Chrome (89+)
- Microsoft Edge (89+)
- Opera (75+)

_Note: Safari and Firefox currently do not support the Web Serial API._

## Deployment

This application is completely static and serverless (HTML, CSS, JS).

### Publishing to GitHub Pages

Because there is no build step required, publishing to GitHub Pages is immediate:

1. Push this repository to GitHub.
2. Go to your repository **Settings**.
3. Under the **Pages** menu, select the main branch (or gh-pages branch) as the source.
4. Provide the root `/` folder as the directory.
5. Save. Your application will be live over **HTTPS**, which is securely required for the Web Serial API to operate.

## Local Development

To run this locally, you must serve it over `localhost` or `127.0.0.1` (Web Serial is not allowed on plain `file://` or non-secure contexts except `localhost`).

Using Python (requires Python installed):

```bash
python -m http.server 3000
```

Then visit `http://localhost:3000`

Using Node.js (requires Node/NPM installed):

```bash
npx http-server . -p 3000
```

## Security & Privacy

Everything runs strictly on the client-side. No backend server is involved, and device data never leaves your local browser. All customizable settings and commands are securely stored in your browser's local storage.

## Themes & Appearance

Web Serial Terminal includes built-in light and dark themes that are automatically saved to your browser preferences.

### Switching Themes

Currently, themes are managed via the configuration stored in your browser's local storage. To adjust theme settings:

1. Open **DevTools** (F12 or right-click → Inspect)
2. Go to the **Console** tab
3. Run: `JSON.parse(localStorage.getItem('web_serial_terminal_config')).theme`
4. To view all settings: `JSON.parse(localStorage.getItem('web_serial_terminal_config'))`

**Dark Mode** (default): Easy on the eyes with a dark terminal background and accent colors.  
**Light Mode**: Bright, high-contrast theme for well-lit environments.

Both themes maintain excellent readability and support full ANSI color rendering for device output.

## Architecture & Design

Web Serial Terminal is built with vanilla ES6 modules and a global namespace pattern for simplicity and zero dependencies.

### Core Modules

| Module                   | Purpose                                            |
| ------------------------ | -------------------------------------------------- |
| **config.js**            | Persistent state management via localStorage       |
| **serial-manager.js**    | Web Serial API wrapper with read/write loops       |
| **terminal-renderer.js** | ANSI parser and DOM renderer with 5000-line buffer |
| **input-handler.js**     | Dual-mode input (Modern and Traditional)           |
| **app.js**               | Main orchestration and event coordination          |

### Event-Driven Architecture

Modules communicate via custom DOM events on `window`, ensuring loose coupling:

- `serial:connected` — Device connected
- `serial:data` — Data received from device
- `serial:disconnected` — Device disconnected
- `serial:error` — Read/write errors
- `serial:stats` — Byte count updates
- `config:changed` — Settings persisted

Example listening to device data:

```javascript
window.addEventListener("serial:data", (e) => {
  console.log("Received:", e.detail);
});
```

### Key Design Principles

- **No Build Step**: Pure HTML, CSS, and vanilla JS—serve as-is
- **Performance**: Terminal renderer batches DOM updates (16ms debounce) and caps buffer at 5000 lines
- **Persistence**: All settings and command history auto-save to localStorage
- **Isolation**: Each module is self-contained; UI logic kept in app.js

## Usage Guide

### Modern Terminal Mode

**Best for**: Structured commands, bulk data entry, scripting.

1. Type your command in the input field at the bottom
2. Use **↑/↓** arrow keys to navigate command history
3. Press **Enter** to send
4. Output appears above; input area clears automatically

### Traditional Terminal Mode

**Best for**: Interactive CLI tools, character-by-character navigation, classic terminal experience.

1. Click in the terminal area to focus
2. A blinking cursor appears at the end of output
3. Type characters one at a time; each keystroke sends immediately
4. Use **Backspace** to delete (sends DEL byte, 0x7F)
5. **Ctrl+C** sends interrupt (0x03), **Ctrl+Z** sends suspend (0x1A)

### Quick Commands

Save frequently used commands for quick access:

1. Click **📋 Commands** button in the top bar
2. Press **➕** to add a new command
3. Enter command name and the text to send
4. Click the command name in the panel to send it instantly
5. Click **🗑️** to remove a command

### Settings

Adjust serial communication parameters:

1. Click **⚙️ Settings** to open the settings panel
2. **Serial Configuration:**
   - Baud Rate: 9600, 19200, 38400, 57600, 115200 (configurable via connect button)
   - Data Bits: 7 or 8
   - Stop Bits: 1 or 2
   - Parity: None, Even, Odd
   - Flow Control: None, Hardware

3. **Terminal Behavior:**
   - **Mode**: Switch between Modern and Traditional
   - **Line Ending**: Choose what character(s) append to each sent command (LF, CR+LF, CR, or None)
   - **Local Echo**: Enable/disable echoing of typed characters in the terminal

4. Click **Send Ctrl+C** or **Send Ctrl+Z** buttons to send control sequences

### Keyboard Shortcuts

#### Modern Mode

- **Enter** — Send command
- **↑/↓** — Navigate command history
- **Ctrl+A** — Select all (browser default)

#### Traditional Mode

- **Any character** — Send that character
- **Enter** — Send line ending (configurable)
- **Backspace** — Send DEL (0x7F)
- **Ctrl+C** — Send interrupt
- **Ctrl+Z** — Send suspend
- **Ctrl+X** or highlight → **Ctrl+C** — Copy selected text

#### Both Modes

- **F12** — Open DevTools for debugging

## Troubleshooting

### Browser Shows "Web Serial API Not Supported"

**Cause**: Using an unsupported browser (Safari, Firefox, or older Chrome).  
**Solution**: Use Chrome 89+, Edge 89+, or Opera 75+ on desktop.

### "Permission Denied" When Connecting

**Cause**: Browser has previously blocked serial port access.  
**Solution**:

- Check browser permissions settings
- Try a different USB port
- Clear browser storage: DevTools → Application → Local Storage → Clear All
- Reconnect the device

### Connected But No Data Appears

**Cause**: Wrong baud rate, serial settings, or no data being sent by device.  
**Solution**:

1. Verify the device is actually sending data (test with another terminal app if possible)
2. Confirm all serial settings (baud rate, data bits, parity, stop bits) match your device
3. Check **RX bytes** counter at bottom of terminal—if it's increasing, data is arriving
4. Try enabling **Local Echo** to see characters as you type
5. Open DevTools console and look for error messages

### No RX/TX Byte Count Update

**Cause**: Stats update may be delayed or stats display is off.  
**Solution**:

- Stats appear at the bottom of the terminal output
- Send a test command and verify the byte count increases
- Refresh the page and reconnect

### Device Disconnects Unexpectedly

**Cause**: USB cable issue, power loss, or device reset.  
**Solution**:

- Check USB cable connection
- Try a different USB port
- Verify device power supply
- Re-plug the device and click **Connect** again

### Terminal Output Is Garbled or Missing Characters

**Cause**: Baud rate mismatch, buffer overflow, or corrupted serial data.  
**Solution**:

1. Verify baud rate matches device output speed
2. Try reducing data throughput on the device side (slower updates)
3. Click **Clear** (🗑️) to reset the terminal
4. Reconnect the device

### Settings Don't Save After Refresh

**Cause**: Browser localStorage is disabled or full.  
**Solution**:

- Check browser privacy settings; ensure localStorage is enabled
- Clear old data: DevTools → Application → Local Storage → Select site → Delete All
- Try using incognito/private mode (will start fresh each session)

### Local Echo Shows Duplicates

**Cause**: Device is also echoing typed characters, combined with local echo enabled.  
**Solution**:

- Disable **Local Echo** in settings, or
- Disable echo on the device itself (usually via a configuration command)

### How to Debug Issues

1. **Open DevTools**: F12 or right-click → Inspect
2. **Check Console**: Look for error messages
3. **Monitor Events**: Run in console:
   ```javascript
   window.addEventListener("serial:data", (e) => console.log("RX:", e.detail));
   ```
4. **Check Config**: `JSON.parse(localStorage.getItem('web_serial_terminal_config'))`
5. **Force Render**: `window.Terminal.flushPending()` (forces batched output to render)
6. **Check Connection**: `window.Serial.isConnected` returns true/false
7. **View Stats**: `window.Serial.stats` shows `{rx: ..., tx: ...}`

## License

See [LICENSE](LICENSE) file for details.
