// Input Handler for Traditional and Modern terminal modes

class InputHandler {
  constructor() {
    this.inputElement = document.getElementById("terminal-input");
    this.terminalOutput = document.getElementById("terminal-output");

    this.historyIndex = -1;
    this.cursorElement = document.createElement("span");
    this.cursorElement.className = "cursor-block";
    this.cursorVisible = false;

    this.setupEventListeners();
    this.setMode(window.Config.get("terminalMode"));
  }

  setupEventListeners() {
    // Modern Mode Input
    this.inputElement.addEventListener("keydown", (e) =>
      this.handleModernInput(e),
    );

    // Traditional Mode Input (Attached to the window but active only when focused/traditional)
    this.terminalOutput.addEventListener("click", () => {
      if (window.Config.get("terminalMode") === "traditional") {
        this.terminalOutput.focus();
        this.terminalOutput.classList.add("focused");
      }
    });

    // Need to make terminal output focusable
    this.terminalOutput.setAttribute("tabindex", "0");

    this.terminalOutput.addEventListener("blur", () => {
      this.terminalOutput.classList.remove("focused");
    });

    this.terminalOutput.addEventListener("keydown", (e) =>
      this.handleTraditionalInput(e),
    );

    // Quick action buttons
    document
      .getElementById("btn-send")
      .addEventListener("click", () => this.sendModern());
    document.getElementById("btn-clear").addEventListener("click", () => {
      window.Terminal.clear();
      if (
        window.Config.get("terminalMode") === "traditional" &&
        this.cursorVisible
      ) {
        this.ensureCursor();
      }
    });
  }

  setMode(mode) {
    const modernInputArea = document.getElementById("modern-input-area");

    if (mode === "modern") {
      modernInputArea.classList.remove("hidden");
      this.terminalOutput.classList.remove("traditional-mode");
      this.removeCursor();
    } else {
      // Traditional
      modernInputArea.classList.add("hidden");
      this.terminalOutput.classList.add("traditional-mode");
      this.terminalOutput.focus();
      this.terminalOutput.classList.add("focused");
      this.ensureCursor();
    }
  }

  handleModernInput(e) {
    if (e.key === "Enter") {
      this.sendModern();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      this.navigateHistory(-1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      this.navigateHistory(1);
    }
  }

  handleTraditionalInput(e) {
    if (window.Config.get("terminalMode") !== "traditional") return;

    // Prevent default scrolling for Space, Arrow keys, etc.
    if (
      ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
        e.code,
      ) ||
      e.key.length === 1
    ) {
      if (!e.ctrlKey && !e.metaKey) {
        e.preventDefault();
      }
    }

    // Handle Ctrl+C
    if (e.ctrlKey && e.key === "c") {
      const selection = window.getSelection();
      // If user selected terminal text, allow native copy shortcut.
      if (selection && !selection.isCollapsed) {
        return;
      }

      e.preventDefault();
      this.sendControlSequence(0x03);
      return;
    }

    // Handle Ctrl+Z
    if (e.ctrlKey && e.key === "z") {
      e.preventDefault();
      this.sendControlSequence(0x1a);
      return;
    }

    // Handle typing
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      this.sendKeystroke(e.key);
    } else if (e.key === "Enter") {
      this.sendKeystroke(window.Config.get("lineEnding") || "\n");
    } else if (e.key === "Backspace") {
      // Most serial CLIs expect DEL (0x7F) as erase.
      this.sendControlSequence(0x7f);
    }
  }

  sendModern() {
    const text = this.inputElement.value;
    if (!text) return;

    window.Config.addHistory(text);
    this.historyIndex = -1; // reset history pointer

    const lineEnding = window.Config.get("lineEnding");
    const payload = text + lineEnding;

    this.transmit(payload);

    if (window.Config.get("localEcho")) {
      window.Terminal.print(payload, "echo");
    }

    // Optionally clear input after send. Usually good UX in modern mode.
    this.inputElement.value = "";
  }

  sendKeystroke(char) {
    // Send immediately character by character
    this.transmit(char);

    if (window.Config.get("localEcho")) {
      // Need to handle cursor briefly
      this.removeCursor();
      if (char === "\r" || char === "\n" || char === "\r\n") {
        window.Terminal.print("\n", "echo");
      } else {
        window.Terminal.print(char, "echo");
      }
      this.ensureCursor();
    }
  }

  sendControlSequence(byteCode) {
    if (!window.Serial.isConnected) return;

    window.Serial.writeBytes([byteCode]);

    if (window.Config.get("localEcho")) {
      if (byteCode === 0x08 || byteCode === 0x7f) {
        // Backspace should erase one echoed character locally in traditional mode.
        this.removeCursor();
        window.Terminal.deleteLastChar();
        this.ensureCursor();
        return;
      }

      // Visualize control chars that should remain visible.
      let rep = "";
      if (byteCode === 0x03) rep = "^C";
      else if (byteCode === 0x1a) rep = "^Z";

      if (rep) {
        this.removeCursor();
        window.Terminal.print(rep, "echo");
        this.ensureCursor();
      }
    }
  }

  async transmit(text) {
    if (!window.Serial.isConnected) {
      window.Terminal.print(
        "Error: Not connected to any serial port.",
        "error",
      );
      return;
    }

    try {
      await window.Serial.write(text);
    } catch (e) {
      console.error(e);
    }
  }

  navigateHistory(direction) {
    const history = window.Config.get("history");
    if (!history || history.length === 0) return;

    if (this.historyIndex === -1) {
      // Start nav from the end
      this.historyIndex = history.length;
    }

    this.historyIndex += direction;

    if (this.historyIndex < 0) {
      this.historyIndex = 0;
    } else if (this.historyIndex >= history.length) {
      this.historyIndex = history.length - 1;
    }

    this.inputElement.value = history[this.historyIndex];
  }

  ensureCursor() {
    if (window.Config.get("terminalMode") !== "traditional") return;
    if (!this.cursorVisible) {
      window.Terminal.contentElement.appendChild(this.cursorElement);
      this.cursorVisible = true;
      window.Terminal.scrollToBottom();
    }
  }

  removeCursor() {
    if (this.cursorVisible && this.cursorElement.parentNode) {
      this.cursorElement.parentNode.removeChild(this.cursorElement);
      this.cursorVisible = false;
    }
  }

  // Call this when incoming data arrives to ensure cursor stays at the very end
  onDataRendered() {
    if (
      window.Config.get("terminalMode") === "traditional" &&
      this.cursorVisible
    ) {
      // Temporarily detach and reattach to keep it at the end
      this.removeCursor();
      this.ensureCursor();
    }
  }
}

window.Input = new InputHandler();
