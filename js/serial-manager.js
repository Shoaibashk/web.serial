// Web Serial API Wrapper

class SerialManager {
  constructor() {
    this.port = null;
    this.reader = null;
    this.writer = null;
    this.keepReading = false;

    // Setup stats
    this.stats = {
      rx: 0,
      tx: 0,
    };

    // Text encoder/decoder
    this.encoder = new TextEncoder();
    this.decoder = new TextDecoder();
  }

  get isSupported() {
    return "serial" in navigator;
  }

  get isConnected() {
    return this.port && this.port.readable && this.port.writable;
  }

  async connect(options) {
    if (!this.isSupported) {
      throw new Error("Web Serial API is not supported in this browser.");
    }

    try {
      // Request port permission
      this.port = await navigator.serial.requestPort();

      // Map configuration
      const portOptions = {
        baudRate: parseInt(options.baudRate, 10),
        dataBits: parseInt(options.dataBits, 10) || 8,
        stopBits: parseInt(options.stopBits, 10) || 1,
        parity: options.parity || "none",
        flowControl: options.flowControl || "none",
      };

      await this.port.open(portOptions);

      this.keepReading = true;
      this.startReading();

      this.emit("connected", this.port.getInfo());
      return true;
    } catch (error) {
      console.error("Connection error:", error);
      this.emit("error", error);
      this.port = null;
      throw error;
    }
  }

  async disconnect() {
    this.keepReading = false;

    if (this.reader) {
      try {
        await this.reader.cancel();
      } catch (e) {
        /* ignore */
      }
    }

    if (this.port) {
      try {
        await this.port.close();
      } catch (e) {
        /* ignore */
      }
    }

    this.port = null;
    this.reader = null;
    this.writer = null;

    this.stats.rx = 0;
    this.stats.tx = 0;
    this.emitStats();

    this.emit("disconnected");
  }

  async startReading() {
    if (!this.port) return;

    while (this.port.readable && this.keepReading) {
      this.reader = this.port.readable.getReader();
      try {
        while (true) {
          const { value, done } = await this.reader.read();
          if (done) break; // Reader has been canceled

          if (value) {
            this.stats.rx += value.byteLength;
            this.emitStats();

            // Parse as string
            const text = this.decoder.decode(value);
            this.emit("data", text);
          }
        }
      } catch (error) {
        console.error("Serial read error:", error);
        this.emit("error", error);
      } finally {
        if (this.reader) {
          this.reader.releaseLock();
          this.reader = null;
        }
      }
    }

    // If we exit the main loop unexpectedly (device unplugged)
    if (this.keepReading) {
      this.disconnect();
    }
  }

  async write(text) {
    if (!this.isConnected) {
      throw new Error("Port is not connected.");
    }

    if (!this.writer) {
      this.writer = this.port.writable.getWriter();
    }

    try {
      const data = this.encoder.encode(text);
      await this.writer.write(data);

      this.stats.tx += data.byteLength;
      this.emitStats();
    } catch (error) {
      console.error("Serial write error:", error);
      this.emit("error", error);
    } finally {
      if (this.writer) {
        this.writer.releaseLock();
        this.writer = null;
      }
    }
  }

  async writeBytes(bytes) {
    if (!this.isConnected) {
      throw new Error("Port is not connected.");
    }

    if (!this.writer) {
      this.writer = this.port.writable.getWriter();
    }

    try {
      const data = new Uint8Array(bytes);
      await this.writer.write(data);

      this.stats.tx += data.byteLength;
      this.emitStats();
    } catch (error) {
      console.error("Serial write bytes error:", error);
      this.emit("error", error);
    } finally {
      if (this.writer) {
        this.writer.releaseLock();
        this.writer = null;
      }
    }
  }

  emitStats() {
    this.emit("stats", this.stats);
  }

  emit(eventName, detail) {
    window.dispatchEvent(new CustomEvent(`serial:${eventName}`, { detail }));
  }
}

window.Serial = new SerialManager();
