# Usage

## Connect a device

1. Open the app in Chrome, Edge, or Opera on desktop.
2. Click the connect button and choose your serial device.
3. Match the baud rate and other serial settings to your device.
4. Start sending commands or reading data.

## Modern mode

Modern mode is best for commands, scripts, and bulk payloads.

1. Type the command into the input field.
2. Press Enter to send it.
3. Use the Up and Down arrows to browse command history.

Example:

```text
AT+VERSION?
```

## Traditional mode

Traditional mode behaves more like a classic terminal.

1. Click in the terminal area to focus it.
2. Type characters to send them one by one.
3. Press Backspace to send DEL.
4. Press Ctrl+C or Ctrl+Z to send control sequences.

## Quick commands

Use quick commands for common device-specific actions.

1. Open the Commands panel.
2. Add a command name and the text to send.
3. Click the saved command later to send it immediately.

## Plotter

The plotter is useful when your device streams sensor values or structured numeric data.

1. Switch to the plotter view.
2. Feed it incoming serial data.
3. Use pan and zoom controls to inspect trends over time.

## Settings

Open Settings to change:

- Baud rate
- Data bits
- Stop bits
- Parity
- Flow control
- Line ending behavior
- Local echo
- Terminal mode

## Keyboard shortcuts

### Modern mode

- Enter: send the current command
- Up / Down: browse command history
- Ctrl+A: select all text in the input

### Traditional mode

- Any character: send that character immediately
- Enter: send the configured line ending
- Backspace: send DEL (0x7F)
- Ctrl+C: send interrupt (0x03)
- Ctrl+Z: send suspend (0x1A)
- Ctrl+X or selection plus Ctrl+C: copy selected text

### General

- F12: open browser developer tools
