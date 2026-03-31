// Serial Plotter Renderer

class PlotterRenderer {
  constructor() {
    this.canvas = document.getElementById("plotter-canvas");
    this.legendElement = document.getElementById("plotter-legend");
    this.interpolateToggle = document.getElementById("plotter-interpolate");
    this.runButton = document.getElementById("btn-plotter-run");
    this.clearButton = document.getElementById("btn-plotter-clear");
    this.liveBadge = document.getElementById("plotter-live-badge");
    this.resetButton = document.getElementById("btn-plotter-reset");

    this.ctx = this.canvas.getContext("2d");

    this.channelColors = [
      "#18a3ff",
      "#ff8d00",
      "#05d3b5",
      "#ff5b69",
      "#8f7dff",
      "#f2ce47",
      "#f97ac0",
      "#38d6f4",
    ];

    this.channels = new Map();
    this.sampleCount = 0;
    this.maxSamples = window.Config.get("plotterMaxSamples") || 2000;

    this.running = true;
    this.isDirty = true;
    this.bufferRemainder = "";
    this.awaitingFrameSync = true;

    this.interpolate = !!window.Config.get("plotterInterpolate");
    this.interpolateToggle.checked = this.interpolate;

    this.lastDrawTime = 0;
    this.drawIntervalMs = 16;

    // View state
    this.xWindow = 500; // number of samples visible
    this.viewFollowing = true; // live/auto-scroll mode
    this.viewEndSample = 0; // right-edge anchor (when not following)
    this.yLocked = false; // manual Y range
    this.viewYMin = -1;
    this.viewYMax = 1;

    // Drag state
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.dragStartViewEnd = 0;
    this.dragStartYMin = -1;
    this.dragStartYMax = 1;

    this.hoverCanvasX = null;
    this.hoverCanvasY = null;

    this.setupEvents();
    this.setupPanZoom();
    this.startRenderLoop();
  }

  setupEvents() {
    this.runButton.addEventListener("click", () => {
      this.running = !this.running;
      this.updateRunButton();
      if (this.running) {
        this.isDirty = true;
      }
    });

    this.clearButton.addEventListener("click", () => {
      this.clear();
    });

    this.resetButton.addEventListener("click", () => {
      this.resetView();
    });

    this.interpolateToggle.addEventListener("change", (e) => {
      this.interpolate = e.target.checked;
      window.Config.set("plotterInterpolate", this.interpolate);
      this.isDirty = true;
    });

    window.addEventListener("serial:data", (event) => {
      if (!this.running) return;
      if (typeof event.detail !== "string") return;
      this.ingestChunk(event.detail);
    });

    window.addEventListener("serial:connected", () => {
      this.resetStreamState();
    });

    window.addEventListener("serial:disconnected", () => {
      this.resetStreamState();
    });

    this.resizeObserver = new ResizeObserver(() => {
      this.resize();
    });

    if (this.canvas.parentElement) {
      this.resizeObserver.observe(this.canvas.parentElement);
    }

    window.addEventListener("resize", () => this.resize());
  }

  setupPanZoom() {
    this.canvas.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const factor = e.deltaY > 0 ? 1.15 : 1 / 1.15;

        if (e.ctrlKey) {
          // Ctrl+wheel: zoom Y axis and auto-lock it
          this.yLocked = true;
          const center = (this.viewYMin + this.viewYMax) / 2;
          const newHalf = ((this.viewYMax - this.viewYMin) / 2) * factor;
          this.viewYMin = center - newHalf;
          this.viewYMax = center + newHalf;
        } else {
          // Plain wheel: zoom X window
          this.xWindow = Math.round(
            Math.max(10, Math.min(this.maxSamples, this.xWindow * factor)),
          );
        }

        this.isDirty = true;
      },
      { passive: false },
    );

    this.canvas.addEventListener("mousedown", (e) => {
      this.isDragging = true;
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
      this.hoverCanvasX = null;
      this.hoverCanvasY = null;

      if (this.viewFollowing) {
        this.viewEndSample = this.sampleCount;
        this.viewFollowing = false;
        this.updateLiveBadge();
      }

      this.dragStartViewEnd = this.viewEndSample;
      this.dragStartYMin = this.viewYMin;
      this.dragStartYMax = this.viewYMax;
      this.canvas.classList.add("dragging");
    });

    this.canvas.addEventListener("mousemove", (e) => {
      if (!this.isDragging) {
        const rect = this.canvas.getBoundingClientRect();
        this.hoverCanvasX = e.clientX - rect.left;
        this.hoverCanvasY = e.clientY - rect.top;
        this.isDirty = true;
        return;
      }

      const plotWidth = Math.max(1, this.canvas.width - 54 - 12);
      const plotHeight = Math.max(1, this.canvas.height - 12 - 28);

      const dx = e.clientX - this.dragStartX;
      const dy = e.clientY - this.dragStartY;

      // X pan: drag right = scroll back in time
      const deltaSamples = Math.round((-dx * this.xWindow) / plotWidth);
      const newEnd = this.dragStartViewEnd + deltaSamples;

      if (newEnd >= this.sampleCount) {
        this.viewEndSample = this.sampleCount;
        this.viewFollowing = true;
      } else {
        this.viewEndSample = Math.max(this.xWindow, newEnd);
        this.viewFollowing = false;
      }

      this.updateLiveBadge();

      // Y pan: lock after 5px vertical displacement from drag start
      if (!this.yLocked && Math.abs(dy) > 5) {
        this.yLocked = true;
        this.dragStartYMin = this.viewYMin;
        this.dragStartYMax = this.viewYMax;
      }

      if (this.yLocked) {
        const yRange = this.dragStartYMax - this.dragStartYMin;
        const deltaY = (dy * yRange) / plotHeight;
        this.viewYMin = this.dragStartYMin + deltaY;
        this.viewYMax = this.dragStartYMax + deltaY;
      }

      this.isDirty = true;
    });

    const endDrag = () => {
      if (!this.isDragging) return;
      this.isDragging = false;
      this.canvas.classList.remove("dragging");
    };

    this.canvas.addEventListener("mouseup", endDrag);
    this.canvas.addEventListener("mouseleave", () => {
      this.hoverCanvasX = null;
      this.hoverCanvasY = null;
      endDrag();
      this.isDirty = true;
    });

    this.canvas.addEventListener("dblclick", () => {
      this.resetView();
    });
  }

  resetView() {
    this.xWindow = 500;
    this.viewFollowing = true;
    this.yLocked = false;
    this.updateLiveBadge();
    this.isDirty = true;
  }

  updateLiveBadge() {
    if (!this.liveBadge) return;
    if (this.viewFollowing) {
      this.liveBadge.classList.add("live");
      this.liveBadge.classList.remove("paused");
    } else {
      this.liveBadge.classList.remove("live");
      this.liveBadge.classList.add("paused");
    }
  }

  updateRunButton() {
    if (this.running) {
      this.runButton.textContent = "RUN";
      this.runButton.classList.remove("paused");
      return;
    }

    this.runButton.textContent = "PAUSE";
    this.runButton.classList.add("paused");
  }

  resetStreamState() {
    this.bufferRemainder = "";
    this.awaitingFrameSync = true;
  }

  ingestChunk(chunk) {
    let normalizedChunk = chunk;

    // On a fresh serial session, drop bytes until first newline to avoid
    // creating channels from a leading partial frame fragment.
    if (this.awaitingFrameSync) {
      const firstNewlineIndex = normalizedChunk.indexOf("\n");
      if (firstNewlineIndex === -1) {
        return;
      }

      normalizedChunk = normalizedChunk.slice(firstNewlineIndex + 1);
      this.awaitingFrameSync = false;
    }

    if (!normalizedChunk) {
      return;
    }

    const merged = this.bufferRemainder + normalizedChunk;
    const lines = merged.split(/\r?\n/);

    this.bufferRemainder = lines.pop() || "";

    lines.forEach((line) => this.parseAndIngestLine(line));
  }

  parseAndIngestLine(line) {
    const trimmed = line.trim();
    if (!trimmed) return;

    const parts = trimmed.split(",");
    let addedPoints = false;

    parts.forEach((rawPart, index) => {
      const part = rawPart.trim();
      if (!part) return;

      let label = "";
      let valueText = "";

      const colonIndex = part.indexOf(":");
      if (colonIndex !== -1) {
        label = part.slice(0, colonIndex).trim();
        valueText = part.slice(colonIndex + 1).trim();
      } else {
        label = `Channel ${index + 1}`;
        valueText = part;
      }

      if (!label || !valueText) return;

      const value = Number.parseFloat(valueText);
      if (!Number.isFinite(value)) return;

      const channel = this.getOrCreateChannel(label);
      channel.values.push(value);
      if (channel.values.length > this.maxSamples) {
        channel.values.shift();
      }
      addedPoints = true;
    });

    if (addedPoints) {
      this.sampleCount += 1;
      this.isDirty = true;
    }
  }

  getOrCreateChannel(name) {
    if (this.channels.has(name)) {
      return this.channels.get(name);
    }

    const channelIndex = this.channels.size;
    const color = this.channelColors[channelIndex % this.channelColors.length];
    const channel = {
      name,
      color,
      visible: true,
      values: [],
    };

    this.channels.set(name, channel);
    this.renderLegend();
    return channel;
  }

  renderLegend() {
    this.legendElement.innerHTML = "";

    this.channels.forEach((channel) => {
      const item = document.createElement("label");
      item.className = "legend-item";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = channel.visible;
      checkbox.style.accentColor = channel.color;
      checkbox.addEventListener("change", (event) => {
        channel.visible = event.target.checked;
        this.isDirty = true;
      });

      const text = document.createElement("span");
      text.textContent = channel.name;

      item.appendChild(checkbox);
      item.appendChild(text);
      this.legendElement.appendChild(item);
    });
  }

  resize() {
    const width = Math.max(this.canvas.clientWidth, 1);
    const height = Math.max(this.canvas.clientHeight, 1);

    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
      this.isDirty = true;
    }
  }

  clear() {
    this.channels.clear();
    this.sampleCount = 0;
    this.resetStreamState();
    this.viewFollowing = true;
    this.yLocked = false;
    this.updateLiveBadge();
    this.renderLegend();
    this.isDirty = true;
  }

  startRenderLoop() {
    const animate = (timestamp) => {
      if (
        this.isDirty &&
        timestamp - this.lastDrawTime >= this.drawIntervalMs
      ) {
        this.draw();
        this.lastDrawTime = timestamp;
        this.isDirty = false;
      }

      window.requestAnimationFrame(animate);
    };

    this.resize();
    this.updateRunButton();
    this.updateLiveBadge();
    window.requestAnimationFrame(animate);
  }

  getThemeColors() {
    const s = getComputedStyle(document.documentElement);
    const v = (name, fallback) => s.getPropertyValue(name).trim() || fallback;
    return {
      bg: v("--plotter-bg", "#0f171e"),
      grid: v("--plotter-grid", "rgba(205, 220, 227, 0.14)"),
      axis: v("--plotter-axis", "rgba(205, 220, 227, 0.3)"),
      label: v("--plotter-label", "#9eb0b6"),
      crosshair: v("--plotter-crosshair", "rgba(255, 255, 255, 0.28)"),
      tooltipBg: v("--plotter-tooltip-bg", "rgba(8, 12, 16, 0.92)"),
      tooltipBorder: v("--plotter-tooltip-border", "rgba(205, 220, 227, 0.18)"),
      tooltipText: v("--plotter-tooltip-text", "#cfdbe1"),
      dotStroke: v("--plotter-dot-stroke", "rgba(15, 23, 30, 0.95)"),
    };
  }
  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    if (w <= 0 || h <= 0) return;

    const tc = this.getThemeColors();

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = tc.bg;
    ctx.fillRect(0, 0, w, h);

    const left = 54;
    const right = 12;
    const top = 12;
    const bottom = 28;
    const plotWidth = Math.max(1, w - left - right);
    const plotHeight = Math.max(1, h - top - bottom);

    // Compute the visible sample window
    const viewEnd = this.viewFollowing ? this.sampleCount : this.viewEndSample;
    const viewStart = viewEnd - this.xWindow;

    const visibleChannels = [...this.channels.values()].filter(
      (ch) => ch.visible && ch.values.length > 0,
    );

    if (visibleChannels.length === 0) {
      this.drawAxesAndGrid(ctx, left, top, plotWidth, plotHeight, -1, 1, 6, tc);
      this.drawSampleLabels(
        ctx,
        left,
        top,
        plotWidth,
        plotHeight,
        viewStart,
        viewEnd,
        tc,
      );
      return;
    }

    // Compute Y range from the visible slice only
    let minValue;
    let maxValue;

    if (this.yLocked) {
      minValue = this.viewYMin;
      maxValue = this.viewYMax;
    } else {
      minValue = Number.POSITIVE_INFINITY;
      maxValue = Number.NEGATIVE_INFINITY;

      visibleChannels.forEach((ch) => {
        const bufStart = this.sampleCount - ch.values.length;
        const localStart = Math.max(0, viewStart - bufStart);
        const localEnd = Math.min(ch.values.length - 1, viewEnd - bufStart);

        for (let i = localStart; i <= localEnd; i += 1) {
          const v = ch.values[i];
          if (v < minValue) minValue = v;
          if (v > maxValue) maxValue = v;
        }
      });

      if (!Number.isFinite(minValue) || !Number.isFinite(maxValue)) {
        minValue = -1;
        maxValue = 1;
      }

      if (minValue === maxValue) {
        const pad = Math.max(1, Math.abs(minValue) * 0.1);
        minValue -= pad;
        maxValue += pad;
      }

      // Keep in sync so Y-lock drag captures the latest auto range
      this.viewYMin = minValue;
      this.viewYMax = maxValue;
    }

    const yTicks = 6;
    this.drawAxesAndGrid(
      ctx,
      left,
      top,
      plotWidth,
      plotHeight,
      minValue,
      maxValue,
      yTicks,
      tc,
    );

    visibleChannels.forEach((ch) => {
      const bufStart = this.sampleCount - ch.values.length;
      const localStart = Math.max(0, viewStart - bufStart);
      const localEnd = Math.min(ch.values.length - 1, viewEnd - bufStart);

      if (localEnd < localStart) return;

      this.drawChannelLine(
        ctx,
        ch,
        left,
        top,
        plotWidth,
        plotHeight,
        minValue,
        maxValue,
        localStart,
        localEnd,
        viewStart,
        viewEnd,
      );
    });

    this.drawSampleLabels(
      ctx,
      left,
      top,
      plotWidth,
      plotHeight,
      viewStart,
      viewEnd,
      tc,
    );

    this.drawHoverOverlay(
      ctx,
      left,
      top,
      plotWidth,
      plotHeight,
      minValue,
      maxValue,
      viewStart,
      viewEnd,
      visibleChannels,
      tc,
    );
  }

  drawAxesAndGrid(
    ctx,
    left,
    top,
    plotWidth,
    plotHeight,
    minValue,
    maxValue,
    yTicks,
    tc,
  ) {
    ctx.strokeStyle = tc.grid;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    for (let i = 0; i <= yTicks; i += 1) {
      const t = i / yTicks;
      const y = top + t * plotHeight;

      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(left + plotWidth, y);
      ctx.stroke();
    }

    ctx.setLineDash([]);
    ctx.strokeStyle = tc.axis;

    ctx.beginPath();
    ctx.moveTo(left, top);
    ctx.lineTo(left, top + plotHeight);
    ctx.lineTo(left + plotWidth, top + plotHeight);
    ctx.stroke();

    ctx.fillStyle = tc.label;
    ctx.font = "12px Consolas, monospace";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";

    for (let i = 0; i <= yTicks; i += 1) {
      const t = i / yTicks;
      const y = top + t * plotHeight;
      const value = maxValue - t * (maxValue - minValue);
      ctx.fillText(value.toFixed(0), left - 8, y);
    }
  }

  drawChannelLine(
    ctx,
    channel,
    left,
    top,
    plotWidth,
    plotHeight,
    minValue,
    maxValue,
    localStart,
    localEnd,
    viewStart,
    viewEnd,
  ) {
    const sliceLen = localEnd - localStart + 1;
    if (sliceLen < 2) return;

    const range = maxValue - minValue;
    const viewRange = viewEnd - viewStart;
    const bufStart = this.sampleCount - channel.values.length;

    const toPoint = (localIndex) => {
      const absIndex = bufStart + localIndex;
      const x = left + ((absIndex - viewStart) / viewRange) * plotWidth;
      const normalized = (channel.values[localIndex] - minValue) / range;
      const y = top + (1 - normalized) * plotHeight;
      return { x, y };
    };

    ctx.beginPath();

    const first = toPoint(localStart);
    ctx.moveTo(first.x, first.y);

    if (this.interpolate) {
      for (let i = localStart + 1; i <= localEnd; i += 1) {
        const prev = toPoint(i - 1);
        const current = toPoint(i);
        const midX = (prev.x + current.x) * 0.5;

        ctx.quadraticCurveTo(prev.x, prev.y, midX, (prev.y + current.y) * 0.5);

        if (i === localEnd) {
          ctx.quadraticCurveTo(current.x, current.y, current.x, current.y);
        }
      }
    } else {
      for (let i = localStart + 1; i <= localEnd; i += 1) {
        const pt = toPoint(i);
        ctx.lineTo(pt.x, pt.y);
      }
    }

    ctx.strokeStyle = channel.color;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  drawSampleLabels(
    ctx,
    left,
    top,
    plotWidth,
    plotHeight,
    viewStart,
    viewEnd,
    tc,
  ) {
    const xTicks = 4;

    ctx.fillStyle = tc ? tc.label : "#9eb0b6";
    ctx.font = "12px Consolas, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    for (let i = 0; i <= xTicks; i += 1) {
      const t = i / xTicks;
      const x = left + t * plotWidth;
      const sampleLabel = Math.floor(viewStart + t * (viewEnd - viewStart));
      ctx.fillText(String(sampleLabel), x, top + plotHeight + 6);
    }
  }

  drawHoverOverlay(
    ctx,
    left,
    top,
    plotWidth,
    plotHeight,
    minValue,
    maxValue,
    viewStart,
    viewEnd,
    visibleChannels,
    tc,
  ) {
    if (this.isDragging) return;
    if (this.hoverCanvasX == null || this.hoverCanvasY == null) return;

    const hoverX = this.hoverCanvasX;
    const hoverY = this.hoverCanvasY;
    const plotRight = left + plotWidth;
    const plotBottom = top + plotHeight;

    if (
      hoverX < left ||
      hoverX > plotRight ||
      hoverY < top ||
      hoverY > plotBottom
    ) {
      return;
    }

    const viewRange = Math.max(1, viewEnd - viewStart);
    const sampleFloat = Math.min(
      viewEnd - 1,
      Math.max(
        viewStart,
        viewStart + ((hoverX - left) / plotWidth) * viewRange,
      ),
    );
    const sampleIndex = Math.round(sampleFloat);

    ctx.save();

    ctx.strokeStyle = tc ? tc.crosshair : "rgba(255, 255, 255, 0.28)";
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(hoverX, top);
    ctx.lineTo(hoverX, plotBottom);
    ctx.stroke();
    ctx.setLineDash([]);

    const rows = [
      {
        text: `Sample ${sampleIndex}`,
        color: tc ? tc.tooltipText : "#cfdbe1",
        bold: true,
      },
    ];

    const channelPoints = [];

    visibleChannels.forEach((channel) => {
      const value = this.getChannelValueAtSample(channel, sampleFloat);
      if (!Number.isFinite(value)) return;

      const normalized = (value - minValue) / (maxValue - minValue || 1);
      const y = top + (1 - normalized) * plotHeight;
      channelPoints.push({ channel, value, y });
      rows.push({
        text: `${channel.name}: ${this.formatPlotValue(value)}`,
        color: channel.color,
      });
    });

    channelPoints.forEach(({ channel, y }) => {
      ctx.beginPath();
      ctx.fillStyle = channel.color;
      ctx.arc(hoverX, y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = tc ? tc.dotStroke : "rgba(15, 23, 30, 0.95)";
      ctx.stroke();
    });

    const font = "12px Consolas, monospace";
    ctx.font = font;
    const paddingX = 10;
    const paddingY = 8;
    const lineHeight = 16;
    const maxTextWidth = rows.reduce((width, row) => {
      return Math.max(width, ctx.measureText(row.text).width);
    }, 0);
    const boxWidth = Math.ceil(maxTextWidth + paddingX * 2);
    const boxHeight = Math.ceil(rows.length * lineHeight + paddingY * 2 - 2);

    let boxX = hoverX + 14;
    let boxY = top + 8;
    if (boxX + boxWidth > plotRight) {
      boxX = hoverX - boxWidth - 14;
    }
    if (boxX < left) {
      boxX = left + 4;
    }
    if (boxY + boxHeight > plotBottom) {
      boxY = Math.max(top + 4, plotBottom - boxHeight - 4);
    }

    ctx.fillStyle = tc ? tc.tooltipBg : "rgba(8, 12, 16, 0.92)";
    ctx.strokeStyle = tc ? tc.tooltipBorder : "rgba(205, 220, 227, 0.18)";
    ctx.lineWidth = 1;
    ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
    ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    rows.forEach((row, index) => {
      ctx.fillStyle = index === 0 ? row.color : row.color;
      if (index === 0) {
        ctx.font = "bold 12px Consolas, monospace";
      } else {
        ctx.font = font;
      }
      ctx.fillText(
        row.text,
        boxX + paddingX,
        boxY + paddingY + index * lineHeight,
      );
    });

    ctx.restore();
  }

  getChannelValueAtSample(channel, sampleFloat) {
    const bufStart = this.sampleCount - channel.values.length;
    const local = sampleFloat - bufStart;

    if (local < 0 || local > channel.values.length - 1) {
      return Number.NaN;
    }

    const leftIndex = Math.floor(local);
    const rightIndex = Math.min(channel.values.length - 1, Math.ceil(local));

    if (leftIndex === rightIndex) {
      return channel.values[leftIndex];
    }

    const t = local - leftIndex;
    const leftValue = channel.values[leftIndex];
    const rightValue = channel.values[rightIndex];
    return leftValue + (rightValue - leftValue) * t;
  }

  formatPlotValue(value) {
    const abs = Math.abs(value);

    if (abs >= 1000) return value.toFixed(0);
    if (abs >= 100) return value.toFixed(1);
    if (abs >= 10) return value.toFixed(2);
    return value.toFixed(3);
  }
}

window.Plotter = new PlotterRenderer();
