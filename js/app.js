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
    tabTerminal: document.getElementById("tab-terminal"),
    tabPlotter: document.getElementById("tab-plotter"),
    terminalView: document.getElementById("terminal-view"),
    plotterView: document.getElementById("plotter-view"),

    btnConnect: document.getElementById("btn-connect"),
    btnDisconnect: document.getElementById("btn-disconnect"),
    baudRate: document.getElementById("baud-rate"),

    statusIndicator: document.getElementById("status-indicator"),
    statusText: document.getElementById("status-text"),
    portInfo: document.getElementById("footer-port-info"),

    rxBytes: document.getElementById("footer-rx-bytes"),
    txBytes: document.getElementById("footer-tx-bytes"),

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

    // Theme
    btnThemeToggle: document.getElementById("btn-theme-toggle"),
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

    // Apply saved theme
    const savedTheme = window.Config.get("theme") || "dark";
    applyTheme(savedTheme);

    window.Terminal.print(
      "Web Serial Terminal initialized. Ready to connect.",
      "system",
    );
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    if (ui.btnThemeToggle) {
      const sunIcon = ui.btnThemeToggle.querySelector(".sun-icon");
      const moonIcon = ui.btnThemeToggle.querySelector(".moon-icon");
      if (theme === "dark") {
        // Dark mode: show sun icon
        if (sunIcon) sunIcon.classList.remove("hidden");
        if (moonIcon) moonIcon.classList.add("hidden");
        ui.btnThemeToggle.title = "Switch to light theme";
      } else {
        // Light mode: show moon icon
        if (sunIcon) sunIcon.classList.add("hidden");
        if (moonIcon) moonIcon.classList.remove("hidden");
        ui.btnThemeToggle.title = "Switch to dark theme";
      }
    }
    if (window.Plotter) {
      window.Plotter.isDirty = true;
    }
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

  function switchOutputView(view) {
    const isPlotter = view === "plotter";

    ui.terminalView.classList.toggle("hidden", isPlotter);
    ui.plotterView.classList.toggle("hidden", !isPlotter);

    ui.tabTerminal.classList.toggle("active", !isPlotter);
    ui.tabPlotter.classList.toggle("active", isPlotter);

    ui.tabTerminal.setAttribute("aria-selected", String(!isPlotter));
    ui.tabPlotter.setAttribute("aria-selected", String(isPlotter));

    if (isPlotter && window.Plotter) {
      window.Plotter.resize();
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
      delBtn.innerHTML =
        '<svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5.5 1C5.22386 1 5 1.22386 5 1.5C5 1.77614 5.22386 2 5.5 2H9.5C9.77614 2 10 1.77614 10 1.5C10 1.22386 9.77614 1 9.5 1H5.5ZM3 3.5C3 3.22386 3.22386 3 3.5 3H5H10H11.5C11.7761 3 12 3.22386 12 3.5C12 3.77614 11.7761 4 11.5 4H11V12C11 12.5523 10.5523 13 10 13H5C4.44772 13 4 12.5523 4 12V4L3.5 4C3.22386 4 3 3.77614 3 3.5ZM5 4H10V12H5V4Z" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"></path></svg>';
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

  ui.tabTerminal.addEventListener("click", () => {
    switchOutputView("terminal");
  });

  ui.tabPlotter.addEventListener("click", () => {
    switchOutputView("plotter");
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

  if (ui.btnThemeToggle) {
    ui.btnThemeToggle.addEventListener("click", () => {
      const current = window.Config.get("theme") || "dark";
      const next = current === "dark" ? "light" : "dark";
      window.Config.set("theme", next);
      applyTheme(next);
    });
  }

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
      ui.statusText.innerText = `Serial Port @ ${options.baudRate}`; // updated by serial:connected

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
    const baudRate = window.Config.get("baudRate");
    const vid = info.usbVendorId
      ? info.usbVendorId.toString(16).padStart(4, "0")
      : null;
    const pid = info.usbProductId
      ? info.usbProductId.toString(16).padStart(4, "0")
      : null;

    const deviceLabel = vid ? `USB Serial (VID:${vid})` : "Serial Port";
    console.info("Connected device:", {
      deviceLabel,
      baudRate,
      usbVendorId: vid,
      usbProductId: pid,
      rawInfo: info,
    });
    ui.statusText.innerText = deviceLabel;
    ui.portInfo.innerText =
      vid && pid ? `VID:${vid}  PID:${pid}` : "Serial Device";
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
    if (ui.btnInstallPwa) {
      ui.btnInstallPwa.classList.remove("hidden");
    }
  });

  if (ui.btnInstallPwa) {
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
  }

  window.addEventListener("appinstalled", () => {
    window.Terminal.print("App installed successfully!", "system");
  });

  // Init
  initializeUI();
  switchOutputView("terminal");
});
