# Troubleshooting

## Web Serial is not supported

Use Chrome, Edge, or Opera on desktop. Safari and Firefox are not supported.

## The app cannot connect to a device

- Check browser permissions.
- Try a different USB port.
- Make sure the device is plugged in and powered.
- Confirm you are using `localhost` or HTTPS.

## Data appears garbled or missing

- Verify the baud rate and serial settings match the device.
- Reduce the device's transmit speed if needed.
- Check whether the terminal is echoing input on both sides.

## Settings are not saved

- Make sure local storage is enabled in the browser.
- Clear the site data and try again.

## Inspect the app state

Open DevTools and check the console. You can also inspect the app state with:

```javascript
window.Serial.isConnected;
window.Serial.stats;
JSON.parse(localStorage.getItem("web_serial_terminal_config"));
```
