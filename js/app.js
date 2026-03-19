// Application Orchestration

document.addEventListener("DOMContentLoaded", () => {
  function lineEndingToSelectValue(value) {
    if (value === "\n") return "\\n";
    if (value === "\r") return "\\r";
    if (value === "\r\n") return "\\r\\n";
    return value;
  }

  function lineEndingFromSelectValue(value) {
    if (value === "\\n") return "\n";
    if (value === "\\r") return "\r";
    if (value === "\\r\\n") return "\r\n";
    return value;
  }

  // Feature Detection
  if (!window.Serial.isSupported) {
    document.getElementById("unsupported-banner").classList.remove("hidden");
    document.getElementById("btn-connect").disabled = true;
  }

  // Wiring UI elements
  const ui = {
    settingsToggle: document.getElementById("btn-settings-toggle"),
    panelSettings: document.getElementById("panel-settings"),
    panelCommands: document.getElementById("panel-commands"),
    btnCloseSettings: document.getElementById("btn-close-settings"),

    btnConnect: document.getElementById("btn-connect"),
    btnDisconnect: document.getElementById("btn-disconnect"),
    baudRate: document.getElementById("baud-rate"),

    statusIndicator: document.getElementById("status-indicator"),
    statusText: document.getElementById("status-text"),
    portInfo: document.getElementById("port-info"),

    rxBytes: document.getElementById("rx-bytes-terminal"),
    txBytes: document.getElementById("tx-bytes-terminal"),

    // Commands
    commandsList: document.getElementById("commands-list"),
    btnAddCommand: document.getElementById("btn-add-command"),
    btnCommandsToggle: document.getElementById("btn-commands-toggle"),

    // PWA Install
    btnInstallPwa: document.getElementById("btn-install-pwa"),

    // Settings Elements
    dataBits: document.getElementById("data-bits"),
    stopBits: document.getElementById("stop-bits"),
    parity: document.getElementById("parity"),
    flowControl: document.getElementById("flow-control"),
    terminalMode: document.getElementById("terminal-mode"),
    lineEnding:
      document.getElementById("lineEnding") ||
      document.getElementById("line-ending"),
    localEcho: document.getElementById("local-echo"),

    // Extra buttons
    btnSendCtrlC: document.getElementById("btn-send-ctrl-c"),
    btnSendCtrlZ: document.getElementById("btn-send-ctrl-z"),
  };

  // Load initial state from config
  function initializeUI() {
    // Settings fields
    ui.baudRate.value = window.Config.get("baudRate");
    ui.dataBits.value = window.Config.get("dataBits");
    ui.stopBits.value = window.Config.get("stopBits");
    ui.parity.value = window.Config.get("parity");
    ui.flowControl.value = window.Config.get("flowControl");
    ui.terminalMode.value = window.Config.get("terminalMode");
    ui.lineEnding.value = lineEndingToSelectValue(
      window.Config.get("lineEnding"),
    );
    ui.localEcho.checked = window.Config.get("localEcho");

    // Panels
    const panels = window.Config.get("panels");
    if (!panels.settings) ui.panelSettings.classList.add("hidden");
    if (!panels.commands) ui.panelCommands.classList.add("hidden");

    renderCommands();

    window.Terminal.print(
      "Web Serial Terminal initialized. Ready to connect.",
      "system",
    );
  }

  function togglePanel(panelName, element) {
    const panelsDef = window.Config.get("panels");
    panelsDef[panelName] = !panelsDef[panelName];
    window.Config.set("panels", panelsDef);

    if (panelsDef[panelName]) {
      element.classList.remove("hidden");
    } else {
      element.classList.add("hidden");
    }
  }

  // Render Quick Commands
  function renderCommands() {
    ui.commandsList.innerHTML = "";
    const commands = window.Config.get("quickCommands");

    commands.forEach((cmd) => {
      const item = document.createElement("div");
      item.className = "command-item";

      const nameEl = document.createElement("span");
      nameEl.className = "cmd-name";
      nameEl.innerText = cmd.name;
      nameEl.title = `Sends: ${cmd.value}`;
      nameEl.onclick = () => {
        const payload = cmd.value + window.Config.get("lineEnding");
        window.Input.transmit(payload);
        if (window.Config.get("localEcho")) {
          window.Terminal.print(payload, "echo");
        }
      };

      const delBtn = document.createElement("button");
      delBtn.className = "icon-button";
      delBtn.innerText = "🗑️";
      delBtn.title = "Remove";
      delBtn.onclick = () => {
        window.Config.removeCommand(cmd.id);
        renderCommands();
      };

      item.appendChild(nameEl);
      item.appendChild(delBtn);
      ui.commandsList.appendChild(item);
    });
  }

  // Listeners for UI
  ui.settingsToggle.addEventListener("click", () => {
    togglePanel("settings", ui.panelSettings);
  });

  ui.btnCloseSettings.addEventListener("click", () => {
    togglePanel("settings", ui.panelSettings);
  });

  ui.btnCommandsToggle.addEventListener("click", () => {
    togglePanel("commands", ui.panelCommands);
  });

  // Add command prompt
  ui.btnAddCommand.addEventListener("click", () => {
    const name = prompt("Enter command name:");
    if (!name) return;
    const value = prompt("Enter command value (text to send):");
    if (!value) return;
    window.Config.addCommand(name, value);
    renderCommands();
  });

  // Listen to Select changes and update Config
  [
    "baudRate",
    "dataBits",
    "stopBits",
    "parity",
    "flowControl",
    "terminalMode",
    "lineEnding",
  ].forEach((key) => {
    const el = ui[key];
    if (el) {
      el.addEventListener("change", (e) => {
        const value =
          key === "lineEnding"
            ? lineEndingFromSelectValue(e.target.value)
            : e.target.value;

        window.Config.set(key, value);
        if (key === "terminalMode") {
          window.Input.setMode(e.target.value);
        }
      });
    }
  });

  ui.localEcho.addEventListener("change", (e) => {
    window.Config.set("localEcho", e.target.checked);
  });

  // Serial Connection Handlers
  ui.btnConnect.addEventListener("click", async () => {
    try {
      const options = {
        baudRate: window.Config.get("baudRate"),
        dataBits: window.Config.get("dataBits"),
        stopBits: window.Config.get("stopBits"),
        parity: window.Config.get("parity"),
        flowControl: window.Config.get("flowControl"),
      };

      await window.Serial.connect(options);

      ui.btnConnect.classList.add("hidden");
      ui.btnDisconnect.classList.remove("hidden");

      ui.statusIndicator.className = "status-dot online";
      ui.statusText.innerText = `Connected (${options.baudRate})`;

      window.Terminal.clear();
      window.Terminal.print(
        `Connected to serial port at ${options.baudRate} baud`,
        "system",
      );

      // Re-apply terminal mode bounds (cursor setup if traditional)
      window.Input.setMode(window.Config.get("terminalMode"));

      // Disable settings that shouldn't change while connected
      ui.baudRate.disabled = true;
      ui.dataBits.disabled = true;
      ui.stopBits.disabled = true;
      ui.parity.disabled = true;
      ui.flowControl.disabled = true;
    } catch (err) {
      ui.statusIndicator.className = "status-dot error";
      ui.statusText.innerText = "Connection Error";
      window.Terminal.print(`Failed to connect: ${err.message}`, "error");
    }
  });

  ui.btnDisconnect.addEventListener("click", async () => {
    await window.Serial.disconnect();
  });

  // Specialized buttons
  ui.btnSendCtrlC.addEventListener("click", () =>
    window.Input.sendControlSequence(0x03),
  );
  ui.btnSendCtrlZ.addEventListener("click", () =>
    window.Input.sendControlSequence(0x1a),
  );

  // Listen to Serial events
  window.addEventListener("serial:data", (e) => {
    // Need to remove cursor briefly if in traditional mode before printing
    if (window.Input && window.Input.cursorVisible) {
      window.Input.removeCursor();
    }

    window.Terminal.print(e.detail, "normal");

    if (window.Input) window.Input.onDataRendered();
  });

  window.addEventListener("serial:disconnected", () => {
    ui.btnConnect.classList.remove("hidden");
    ui.btnDisconnect.classList.add("hidden");

    ui.statusIndicator.className = "status-dot offline";
    ui.statusText.innerText = "Disconnected";
    ui.portInfo.innerText = "No Device";

    window.Terminal.print("Disconnected from serial port.", "system");

    // Re-enable settings
    ui.baudRate.disabled = false;
    ui.dataBits.disabled = false;
    ui.stopBits.disabled = false;
    ui.parity.disabled = false;
    ui.flowControl.disabled = false;

    if (window.Input) window.Input.removeCursor();
  });

  window.addEventListener("serial:connected", (e) => {
    const info = e.detail || {};
    const vid = info.usbVendorId
      ? info.usbVendorId.toString(16).padStart(4, "0")
      : "Unknown";
    const pid = info.usbProductId
      ? info.usbProductId.toString(16).padStart(4, "0")
      : "Unknown";
    ui.portInfo.innerText = `VID:${vid} PID:${pid}`;
  });

  window.addEventListener("serial:stats", (e) => {
    ui.rxBytes.innerText = e.detail.rx;
    ui.txBytes.innerText = e.detail.tx;
  });

  // PWA Install Handler
  let deferredPrompt;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    ui.btnInstallPwa.classList.remove("hidden");
  });

  ui.btnInstallPwa.addEventListener("click", async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        window.Terminal.print("App installed successfully!", "system");
      }
      deferredPrompt = null;
      ui.btnInstallPwa.classList.add("hidden");
    }
  });

  window.addEventListener("appinstalled", () => {
    window.Terminal.print("App installed successfully!", "system");
  });

  // Init
  initializeUI();
});
