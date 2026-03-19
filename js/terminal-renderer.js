// Terminal Output Renderer and ANSI parser

class TerminalRenderer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.contentElement = this.container.querySelector(".terminal-content");
    this.buffer = "";

    // Limits
    this.maxLines = 5000;

    this.autoScroll = true;

    // Setup scroll listener to disable auto-scroll if user scrolls up
    this.container.addEventListener("scroll", () => {
      const bottomThreshold = 30; // px
      this.autoScroll =
        this.container.scrollHeight -
          this.container.scrollTop -
          this.container.clientHeight <
        bottomThreshold;
    });

    // Current ANSI state
    this.currentStyle = "";

    // Batching & debouncing for performance
    this.pendingText = "";
    this.renderTimeout = null;
  }

  clear() {
    this.contentElement.innerHTML = "";
    this.buffer = "";
    this.currentStyle = "";
  }

  print(text, type = "normal") {
    // For system/error/echo messages, render immediately
    if (type !== "normal") {
      this.flushPending(); // Flush any batched text first

      let className =
        type === "system"
          ? "log-sys"
          : type === "error"
            ? "log-err"
            : "log-prompt";
      let prefix =
        type === "system"
          ? "\n[SYSTEM] "
          : type === "error"
            ? "\n[ERROR] "
            : "";
      let suffix = type === "system" || type === "error" ? "\n" : "";

      const el = document.createElement("span");
      el.className = className;
      el.innerText = prefix + text + suffix;
      this.contentElement.appendChild(el);
      this.currentStyle = "";
      this.trimBuffer();
      this.scrollToBottom();
      return;
    }

    // For normal output, throttle rendering to ~60fps to avoid DOM fragmentation.
    // Use a throttle (not debounce) so the timer is NOT reset on each new chunk —
    // continuous streaming data will still flush every 16ms.
    this.pendingText += text;

    if (!this.renderTimeout) {
      this.renderTimeout = setTimeout(() => {
        this.renderTimeout = null;
        this.flushPending();
      }, 16); // ~60fps batch interval
    }
  }

  flushPending() {
    if (!this.pendingText) return;

    let formattedText = this.escapeHtml(this.pendingText);
    const parsedHtml = this.parseAnsi(formattedText);

    const wrapper = document.createElement("span");
    wrapper.innerHTML = parsedHtml;

    while (wrapper.firstChild) {
      this.contentElement.appendChild(wrapper.firstChild);
    }

    this.pendingText = "";
    this.trimBuffer();
    this.scrollToBottom();
  }

  deleteLastChar() {
    // Make sure pending batched output is committed before editing DOM text.
    this.flushPending();

    let node = this.contentElement.lastChild;

    // Ignore the blinking cursor node if present.
    while (
      node &&
      node.nodeType === Node.ELEMENT_NODE &&
      node.classList &&
      node.classList.contains("cursor-block")
    ) {
      node = node.previousSibling;
    }

    if (!node) return;

    const text = node.textContent || "";
    if (!text) {
      if (node.parentNode) {
        node.parentNode.removeChild(node);
      }
      return;
    }

    if (text.length > 1) {
      node.textContent = text.slice(0, -1);
      return;
    }

    if (node.parentNode) {
      node.parentNode.removeChild(node);
    }
  }

  parseAnsi(text) {
    // Basic ANSI pattern
    // Matches ESC[...m
    const ansiRegex = /\x1b\[([0-9;]*)m/g;
    let result = "";
    let lastIndex = 0;
    let match;

    while ((match = ansiRegex.exec(text)) !== null) {
      // Append preceding text with current style
      const preText = text.substring(lastIndex, match.index);
      if (preText) {
        if (this.currentStyle) {
          result += `<span style="${this.currentStyle}">${preText}</span>`;
        } else {
          result += preText;
        }
      }

      // Parse color codes
      const codes = match[1] ? match[1].split(";") : ["0"];

      codes.forEach((c) => {
        const code = parseInt(c, 10);
        if (code === 0) {
          // Reset
          this.currentStyle = "";
        } else {
          this.currentStyle += this.ansiCodeToCss(code);
        }
      });

      lastIndex = ansiRegex.lastIndex;
    }

    // Append remaining text
    const remainder = text.substring(lastIndex);
    if (remainder) {
      if (this.currentStyle) {
        result += `<span style="${this.currentStyle}">${remainder}</span>`;
      } else {
        result += remainder;
      }
    }

    return result;
  }

  ansiCodeToCss(code) {
    // Returns CSS string for a given code.
    // We map to CSS variables defined in themes.css
    let css = "";

    if (code === 1) css += "font-weight: bold; ";
    else if (code === 3) css += "font-style: italic; ";
    else if (code === 4) css += "text-decoration: underline; ";
    else if (code >= 30 && code <= 37) {
      const colors = [
        "black",
        "red",
        "green",
        "yellow",
        "blue",
        "magenta",
        "cyan",
        "white",
      ];
      css += `color: var(--ansi-${colors[code - 30]}); `;
    } else if (code >= 40 && code <= 47) {
      const colors = [
        "black",
        "red",
        "green",
        "yellow",
        "blue",
        "magenta",
        "cyan",
        "white",
      ];
      css += `background-color: var(--ansi-${colors[code - 40]}); `;
    } else if (code >= 90 && code <= 97) {
      const colors = [
        "bright-black",
        "bright-red",
        "bright-green",
        "bright-yellow",
        "bright-blue",
        "bright-magenta",
        "bright-cyan",
        "bright-white",
      ];
      css += `color: var(--ansi-${colors[code - 90]}); `;
    } else if (code >= 100 && code <= 107) {
      const colors = [
        "bright-black",
        "bright-red",
        "bright-green",
        "bright-yellow",
        "bright-blue",
        "bright-magenta",
        "bright-cyan",
        "bright-white",
      ];
      css += `background-color: var(--ansi-${colors[code - 100]}); `;
    }

    return css;
  }

  trimBuffer() {
    // Very basic performance safeguard: if we get too many children spans/text nodes, remove from top
    if (this.contentElement.childNodes.length > this.maxLines * 2) {
      // Remove top 1/3
      const overflow = Math.floor(this.contentElement.childNodes.length / 3);
      for (let i = 0; i < overflow; i++) {
        if (this.contentElement.firstChild) {
          this.contentElement.removeChild(this.contentElement.firstChild);
        }
      }
    }
  }

  scrollToBottom() {
    if (this.autoScroll) {
      // Use requestAnimationFrame for smoother performance during bursts
      requestAnimationFrame(() => {
        this.container.scrollTop = this.container.scrollHeight;
      });
    }
  }

  escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}

window.Terminal = new TerminalRenderer("terminal-output");
