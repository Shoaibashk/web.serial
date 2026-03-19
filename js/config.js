// Configuration and Persistence Manager

const CONFIG_KEY = "web_serial_terminal_config";

const DEFAULT_CONFIG = {
  // Serial settings
  baudRate: "115200",
  dataBits: "8",
  stopBits: "1",
  parity: "none",
  flowControl: "none",

  // Terminal settings
  terminalMode: "modern", // 'modern' or 'traditional'
  lineEnding: "\r\n",
  localEcho: true,

  // UI/Theme settings
  theme: "dark",
  panels: {
    commands: true,
    settings: false,
  },

  // Commands state
  quickCommands: [
    { id: "1", name: "Help", value: "help" },
    { id: "2", name: "Info", value: "info" },
    { id: "3", name: "Reset", value: "reset" },
  ],

  // Session history
  history: [],
};

class ConfigurationManager {
  constructor() {
    this.settings = this.loadConfig();
  }

  normalizeLineEnding(value) {
    if (value === "" || value === "\n" || value === "\r" || value === "\r\n") {
      return value;
    }
    if (value === "\\n") return "\n";
    if (value === "\\r") return "\r";
    if (value === "\\r\\n") return "\r\n";
    // Fallback to default for invalid/missing values.
    return "\r\n";
  }

  loadConfig() {
    try {
      const saved = localStorage.getItem(CONFIG_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with defaults to ensure missing keys are populated
        const merged = this.mergeDeep(DEFAULT_CONFIG, parsed);
        merged.lineEnding = this.normalizeLineEnding(merged.lineEnding);
        return merged;
      }
    } catch (e) {
      console.warn("Failed to load config from localStorage", e);
    }
    return structuredClone(DEFAULT_CONFIG);
  }

  saveConfig() {
    try {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(this.settings));
    } catch (e) {
      console.warn("Failed to save config to localStorage", e);
    }
  }

  get(key) {
    return this.settings[key];
  }

  set(key, value) {
    if (key === "lineEnding") {
      value = this.normalizeLineEnding(value);
    }

    this.settings[key] = value;
    this.saveConfig();
    // Emit event for UI to respond to changes if needed
    window.dispatchEvent(
      new CustomEvent("config:changed", {
        detail: { key, value },
      }),
    );
  }

  // Helper to merge nested objects
  mergeDeep(target, source) {
    const output = Object.assign({}, target);
    if (isObject(target) && isObject(source)) {
      Object.keys(source).forEach((key) => {
        if (isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = this.mergeDeep(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    return output;
  }

  addCommand(name, value) {
    const newId = Date.now().toString();
    this.settings.quickCommands.push({ id: newId, name, value });
    this.saveConfig();
    return newId;
  }

  removeCommand(id) {
    this.settings.quickCommands = this.settings.quickCommands.filter(
      (c) => c.id !== id,
    );
    this.saveConfig();
  }

  addHistory(command) {
    if (!command) return;
    // Don't add duplicate of last command
    if (
      this.settings.history.length > 0 &&
      this.settings.history[this.settings.history.length - 1] === command
    )
      return;

    this.settings.history.push(command);
    // Cap history size
    if (this.settings.history.length > 50) {
      this.settings.history.shift();
    }
    this.saveConfig();
  }

  // Only applies base object check
}

function isObject(item) {
  return item && typeof item === "object" && !Array.isArray(item);
}

// Global instance
window.Config = new ConfigurationManager();
