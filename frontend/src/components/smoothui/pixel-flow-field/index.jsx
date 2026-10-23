import { cn } from "@/lib/utils";
import { useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const MAX_DPR = 2;
const RGB_MAX = 255;
const MS_PER_SECOND = 1000;
const TAU = Math.PI * 2;

const DEFAULT_CELL_SIZE = 8;
const DEFAULT_GAP = 3;
const DEFAULT_SPEED = 1;
const DEFAULT_TEXT = "";
const DEFAULT_WEIGHT = 700;
const DEFAULT_POINTER_RADIUS = 140;
const DEFAULT_POINTER_STRENGTH = 1;
const DEFAULT_FONT_FAMILY = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif";

const DEFAULT_COLORS = [
  "rgba(148, 163, 184, 0.25)",
  "rgba(236, 72, 153, 0.85)",
  "rgba(255, 255, 255, 0.95)",
];
const FALLBACK_COLORS = [
  [148, 163, 184, 0.3],
  [236, 72, 153, 0.9],
  [255, 255, 255, 1],
];

const MIN_STEP = 3;
const MIN_COLS = 44;
const MAX_CELLS = 14_000;
const MIN_DRAW = 0.35;

const TIER_COUNT = 7;
const RAMP_MID = 0.6;
const FIELD_ALPHA = 0.24;
const ACCENT_ALPHA = 0.92;
const INK_ALPHA = 1;

const MASK_LOW = 0.08;
const MASK_HIGH = 0.86;

const TEXT_HEIGHT_RATIO = 0.68;
const TEXT_WIDTH_RATIO = 0.86;
const LUMA_R = 0.2126;
const LUMA_G = 0.7152;
const LUMA_B = 0.0722;

const LATTICE = 4;
const NOISE_SCALE = 0.19;
const TIME_SCALE = 0.14;
const FLOW_TURNS = 1.35;
const MAG_FLOOR = 0.35;
const MAG_RANGE = 0.65;
const NOISE_OFFSET_X = 37.2;
const NOISE_OFFSET_Y = 11.5;
const NOISE_COUNTER_FLOW = 0.8;

const DRIFT_RATIO = 0.95;
const WORD_CALM = 0.84;
const SIZE_FLOOR = 0.3;
const SIZE_MASK = 0.64;
const SIZE_FLOW = 0.2;
const STILL_MAG = 0.55;
const CROSS_THICKNESS = 0.34;

const REFORM_MS = 1750;
const STAGGER = 0.45;
const WORD_LEAD = 0.16;
const DELAY_X = 0.55;
const DELAY_Y = 0.3;
const DELAY_JITTER = 0.15;
const SCATTER_SIZE = 0.5;
const SCATTER_SPREAD = 1.25;

const WAKE_TAU = 0.42;
const WAKE_GAIN = 3.4;
const WAKE_CEILING = 2.4;
const MAX_SUBSTEPS = 4;
const MAX_DT = 0.05;

const HASH_X = 127.1;
const HASH_Y = 311.7;
const HASH_SEED = 74.7;
const HASH_MULTIPLIER = 43_758.545_312_3;

const clamp = (value, min, max) =>
  Math.max(min, Math.min(max, value));

const smoothstep = (value) => value * value * (3 - 2 * value);

const toCssColor = (input) =>
  input.trim().startsWith("--") ? `var(${input.trim()})` : input.trim();

const hash2 = (x, y) => {
  const value = Math.sin(x * HASH_X + y * HASH_Y + HASH_SEED) * HASH_MULTIPLIER;
  return value - Math.floor(value);
};

const valueNoise = (x, y) => {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = smoothstep(fx);
  const uy = smoothstep(fy);
  const a = hash2(ix, iy);
  const b = hash2(ix + 1, iy);
  const c = hash2(ix, iy + 1);
  const d = hash2(ix + 1, iy + 1);
  const top = a + (b - a) * ux;
  const bottom = c + (d - c) * ux;
  return top + (bottom - top) * uy;
};

const resolveCssColors = (inputs, host) => {
  if (typeof document === "undefined") return FALLBACK_COLORS;
  const probe = document.createElement("span");
  probe.style.display = "none";
  host.append(probe);

  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext("2d", { willReadFrequently: true });

  const resolved = inputs.map((input, index) => {
    const fallback = FALLBACK_COLORS[index % FALLBACK_COLORS.length];
    if (!context) return fallback;
    probe.style.color = "";
    probe.style.color = toCssColor(input);
    const computed = window.getComputedStyle(probe).color;
    if (!computed) return fallback;
    context.clearRect(0, 0, 1, 1);
    context.fillStyle = "#000000";
    context.fillStyle = computed;
    context.fillRect(0, 0, 1, 1);
    const { data } = context.getImageData(0, 0, 1, 1);
    const alpha = data[3] / RGB_MAX;
    if (alpha === 0) return [data[0], data[1], data[2], 1];
    return [
      Math.round(data[0] / alpha),
      Math.round(data[1] / alpha),
      Math.round(data[2] / alpha),
      alpha,
    ];
  });

  probe.remove();
  return resolved;
};

const mixChannel = (from, to, t) =>
  Math.round(from + (to - from) * t);

const rampCss = (coverage, colors) => {
  const field = colors[0] ?? FALLBACK_COLORS[0];
  const accent = colors[1] ?? colors[0] ?? FALLBACK_COLORS[1];
  const ink = colors[2] ?? accent;
  const low = coverage <= RAMP_MID;
  const from = low ? field : accent;
  const to = low ? accent : ink;
  const t = low
    ? coverage / RAMP_MID
    : (coverage - RAMP_MID) / (1 - RAMP_MID || 1);
  const fromAlpha = low ? FIELD_ALPHA : ACCENT_ALPHA;
  const toAlpha = low ? ACCENT_ALPHA : INK_ALPHA;
  const r = mixChannel(from[0], to[0], t);
  const g = mixChannel(from[1], to[1], t);
  const b = mixChannel(from[2], to[2], t);
  const a = (fromAlpha + (toAlpha - fromAlpha) * t) * (to[3] ?? 1);
  return `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`;
};

const createFieldController = (canvas) => {
  const context = canvas.getContext("2d");
  if (!context) return null;

  const sampler = document.createElement("canvas");
  const samplerContext = sampler.getContext("2d", { willReadFrequently: true });

  let settings = {
    cellSize: DEFAULT_CELL_SIZE,
    colors: FALLBACK_COLORS,
    fontFamily: DEFAULT_FONT_FAMILY,
    gap: DEFAULT_GAP,
    pointerRadius: DEFAULT_POINTER_RADIUS,
    pointerStrength: DEFAULT_POINTER_STRENGTH,
    scatterSeed: 0,
    shape: "square",
    source: null,
    speed: DEFAULT_SPEED,
    still: false,
    text: DEFAULT_TEXT,
    weight: DEFAULT_WEIGHT,
  };

  let width = 1;
  let height = 1;
  let cols = 1;
  let rows = 1;
  let count = 1;
  let step = DEFAULT_CELL_SIZE + DEFAULT_GAP;
  let cellPx = DEFAULT_CELL_SIZE;

  let mask = new Float32Array(1);
  let ampFactor = new Float32Array(1);
  let sizeBase = new Float32Array(1);
  let homeX = new Float32Array(1);
  let homeY = new Float32Array(1);
  let scatterX = new Float32Array(1);
  let scatterY = new Float32Array(1);
  let wakeX = new Float32Array(1);
  let wakeY = new Float32Array(1);
  let delay = new Float32Array(1);
  let latticeIndex = new Int32Array(1);
  let latticeWx = new Float32Array(1);
  let latticeWy = new Float32Array(1);

  let latCols = 2;
  let latRows = 2;
  let fieldU = new Float32Array(4);
  let fieldV = new Float32Array(4);

  let tiers = [];
  let tierCss = [];
  let sampleKey = "";

  let pointerX = 0;
  let pointerY = 0;
  let previousPointerX = 0;
  let previousPointerY = 0;
  let pointerActive = false;

  const startedAt = performance.now();
  let lastFrameAt = startedAt;
  let scatterAt = startedAt;
  let hasStarted = false;
  let frame = 0;
  let running = false;
  let destroyed = false;

  const allocate = () => {
    mask = new Float32Array(count);
    ampFactor = new Float32Array(count);
    sizeBase = new Float32Array(count);
    homeX = new Float32Array(count);
    homeY = new Float32Array(count);
    scatterX = new Float32Array(count);
    scatterY = new Float32Array(count);
    wakeX = new Float32Array(count);
    wakeY = new Float32Array(count);
    delay = new Float32Array(count);
    latticeIndex = new Int32Array(count);
    latticeWx = new Float32Array(count);
    latticeWy = new Float32Array(count);
  };

  const sampleSource = () => {
    if (!samplerContext) {
      mask.fill(0);
      return;
    }
    sampler.width = cols;
    sampler.height = rows;
    samplerContext.clearRect(0, 0, cols, rows);

    const { source, text } = settings;
    let drewSource = false;

    if (source && source.naturalWidth > 0) {
      const scale = Math.min(
        cols / source.naturalWidth,
        rows / source.naturalHeight
      );
      const drawWidth = source.naturalWidth * scale;
      const drawHeight = source.naturalHeight * scale;
      try {
        samplerContext.drawImage(
          source,
          (cols - drawWidth) / 2,
          (rows - drawHeight) / 2,
          drawWidth,
          drawHeight
        );
        drewSource = true;
      } catch {
        drewSource = false;
      }
    }

    if (!drewSource && text && text.length > 0) {
      let fontSize = Math.max(rows * TEXT_HEIGHT_RATIO, 1);
      samplerContext.font = `${settings.weight} ${fontSize}px ${settings.fontFamily}`;
      const measured = samplerContext.measureText(text).width;
      const maxWidth = cols * TEXT_WIDTH_RATIO;
      if (measured > maxWidth && measured > 0) {
        fontSize = Math.max((fontSize * maxWidth) / measured, 1);
        samplerContext.font = `${settings.weight} ${fontSize}px ${settings.fontFamily}`;
      }
      samplerContext.fillStyle = "#ffffff";
      samplerContext.textAlign = "center";
      samplerContext.textBaseline = "middle";
      samplerContext.fillText(text, cols / 2, rows / 2);
    }

    let pixels = null;
    try {
      pixels = samplerContext.getImageData(0, 0, cols, rows).data;
    } catch {
      pixels = null;
    }
    if (!pixels) {
      mask.fill(0);
      return;
    }

    const span = MASK_HIGH - MASK_LOW || 1;
    for (let i = 0; i < count; i++) {
      const p = i * 4;
      const luma =
        (pixels[p] * LUMA_R + pixels[p + 1] * LUMA_G + pixels[p + 2] * LUMA_B) /
        RGB_MAX;
      const coverage = (luma * pixels[p + 3]) / RGB_MAX;
      mask[i] = smoothstep(clamp((coverage - MASK_LOW) / span, 0, 1));
    }
  };

  const buildDerived = () => {
    for (let row = 0; row < rows; row++) {
      const ny = rows > 1 ? row / (rows - 1) : 0;
      const latY = row / LATTICE;
      const iy = Math.floor(latY);
      const wy = latY - iy;
      for (let col = 0; col < cols; col++) {
        const i = row * cols + col;
        const nx = cols > 1 ? col / (cols - 1) : 0;
        const m = mask[i];
        homeX[i] = (col + 0.5) * step;
        homeY[i] = (row + 0.5) * step;
        ampFactor[i] = 1 - m * WORD_CALM;
        sizeBase[i] = SIZE_FLOOR + SIZE_MASK * m;
        delay[i] = clamp(
          nx * DELAY_X +
            ny * DELAY_Y +
            hash2(col, row) * DELAY_JITTER -
            m * WORD_LEAD,
          0,
          1
        );
        const latX = col / LATTICE;
        const ix = Math.floor(latX);
        latticeIndex[i] = iy * latCols + ix;
        latticeWx[i] = latX - ix;
        latticeWy[i] = wy;
      }
    }
  };

  const buildScatter = (seed) => {
    const offset = (SCATTER_SPREAD - 1) / 2;
    for (let i = 0; i < count; i++) {
      const a = hash2(i + 1, seed * 1.7 + 3.1);
      const b = hash2(seed * 2.3 + 7.7, i + 1);
      scatterX[i] = (a * SCATTER_SPREAD - offset) * width;
      scatterY[i] = (b * SCATTER_SPREAD - offset) * height;
    }
  };

  const buildTiers = () => {
    const buckets = Array.from({ length: TIER_COUNT }, () => []);
    for (let i = 0; i < count; i++) {
      const tier = Math.min(TIER_COUNT - 1, Math.floor(mask[i] * TIER_COUNT));
      buckets[tier].push(i);
    }
    tiers = buckets.map((bucket) => Int32Array.from(bucket));
    tierCss = buckets.map((_, tier) =>
      rampCss((tier + 0.5) / TIER_COUNT, settings.colors)
    );
  };

  const buildGrid = () => {
    step = Math.max(settings.cellSize + settings.gap, MIN_STEP);
    cellPx = settings.cellSize;
    cols = Math.max(1, Math.ceil(width / step));
    rows = Math.max(1, Math.ceil(height / step));

    const legibleStep = Math.max(width / MIN_COLS, MIN_STEP);
    if (width >= MIN_COLS && legibleStep < step) {
      cellPx *= legibleStep / step;
      step = legibleStep;
      cols = Math.max(1, Math.ceil(width / step));
      rows = Math.max(1, Math.ceil(height / step));
    }

    if (cols * rows > MAX_CELLS) {
      const scale = Math.sqrt((cols * rows) / MAX_CELLS);
      step *= scale;
      cellPx *= scale;
      cols = Math.max(1, Math.ceil(width / step));
      rows = Math.max(1, Math.ceil(height / step));
    }

    const nextCount = cols * rows;
    const resized = nextCount !== count;
    count = nextCount;
    latCols = Math.ceil(cols / LATTICE) + 2;
    latRows = Math.ceil(rows / LATTICE) + 2;

    if (resized) {
      allocate();
      fieldU = new Float32Array(latCols * latRows);
      fieldV = new Float32Array(latCols * latRows);
    } else if (fieldU.length !== latCols * latRows) {
      fieldU = new Float32Array(latCols * latRows);
      fieldV = new Float32Array(latCols * latRows);
    }

    const key = [
      cols,
      rows,
      settings.text,
      settings.weight,
      settings.fontFamily,
      settings.source?.src ?? "",
    ].join("|");
    if (key !== sampleKey) {
      sampleKey = key;
      sampleSource();
    }

    buildDerived();
    buildScatter(settings.scatterSeed);
    buildTiers();
  };

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    const pixelWidth = Math.max(1, Math.round(width * dpr));
    const pixelHeight = Math.max(1, Math.round(height * dpr));
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildGrid();
  };

  const traceCell = (cx, cy, size) => {
    const half = size / 2;
    if (settings.shape === "circle") {
      context.moveTo(cx + half, cy);
      context.arc(cx, cy, half, 0, TAU);
      return;
    }
    if (settings.shape === "cross") {
      const arm = size * CROSS_THICKNESS;
      context.rect(cx - half, cy - arm / 2, size, arm);
      context.rect(cx - arm / 2, cy - half, arm, size);
      return;
    }
    context.rect(cx - half, cy - half, size, size);
  };

  const updateFlowField = (time) => {
    for (let ly = 0; ly < latRows; ly++) {
      const gy = ly * LATTICE * NOISE_SCALE;
      const base = ly * latCols;
      for (let lx = 0; lx < latCols; lx++) {
        const gx = lx * LATTICE * NOISE_SCALE;
        const swirl = valueNoise(gx, gy + time);
        const strength = valueNoise(
          gx + NOISE_OFFSET_X,
          gy - time * NOISE_COUNTER_FLOW + NOISE_OFFSET_Y
        );
        const angle = swirl * TAU * FLOW_TURNS;
        const magnitude = MAG_FLOOR + MAG_RANGE * strength;
        fieldU[base + lx] = Math.cos(angle) * magnitude;
        fieldV[base + lx] = Math.sin(angle) * magnitude;
      }
    }
  };

  const stampWake = (px, py, dt) => {
    const radius = Math.max(settings.pointerRadius, 1);
    const limit = radius * radius;
    const ceiling = step * WAKE_CEILING;
    const firstCol = clamp(Math.floor((px - radius) / step), 0, cols - 1);
    const lastCol = clamp(Math.ceil((px + radius) / step), 0, cols - 1);
    const firstRow = clamp(Math.floor((py - radius) / step), 0, rows - 1);
    const lastRow = clamp(Math.ceil((py + radius) / step), 0, rows - 1);

    for (let row = firstRow; row <= lastRow; row++) {
      const base = row * cols;
      for (let col = firstCol; col <= lastCol; col++) {
        const i = base + col;
        const dx = homeX[i] - px;
        const dy = homeY[i] - py;
        const squared = dx * dx + dy * dy;
        if (squared >= limit || squared === 0) continue;
        const distance = Math.sqrt(squared);
        const falloff = 1 - distance / radius;
        const push =
          falloff *
          falloff *
          settings.pointerStrength *
          radius *
          WAKE_GAIN *
          dt;
        wakeX[i] = clamp(wakeX[i] + (dx / distance) * push, -ceiling, ceiling);
        wakeY[i] = clamp(wakeY[i] + (dy / distance) * push, -ceiling, ceiling);
      }
    }
  };

  const advanceWake = (dt) => {
    if (!pointerActive) {
      previousPointerX = pointerX;
      previousPointerY = pointerY;
      return;
    }
    const dx = pointerX - previousPointerX;
    const dy = pointerY - previousPointerY;
    const travel = Math.hypot(dx, dy);
    const steps = clamp(Math.ceil(travel / step), 1, MAX_SUBSTEPS);
    const slice = dt / steps;
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      stampWake(previousPointerX + dx * t, previousPointerY + dy * t, slice);
    }
    previousPointerX = pointerX;
    previousPointerY = pointerY;
  };

  const drawResolved = () => {
    for (let tier = 0; tier < tiers.length; tier++) {
      const bucket = tiers[tier];
      if (bucket.length === 0) continue;
      context.fillStyle = tierCss[tier];
      context.beginPath();
      for (const i of bucket) {
        const size = cellPx * (sizeBase[i] + SIZE_FLOW * STILL_MAG);
        if (size > MIN_DRAW) {
          traceCell(homeX[i], homeY[i], size);
        }
      }
      context.fill();
    }
  };

  const drawFlowing = (reform, decay) => {
    const settled = reform >= 1;
    const rest = 1 / (1 - STAGGER);
    const drift = step * DRIFT_RATIO;

    for (let tier = 0; tier < tiers.length; tier++) {
      const bucket = tiers[tier];
      if (bucket.length === 0) continue;
      context.fillStyle = tierCss[tier];
      context.beginPath();

      for (const i of bucket) {
        const wx = wakeX[i] * decay;
        const wy = wakeY[i] * decay;
        wakeX[i] = wx;
        wakeY[i] = wy;

        const corner = latticeIndex[i];
        const tx = latticeWx[i];
        const ty = latticeWy[i];
        const below = corner + latCols;
        const uTop =
          fieldU[corner] + (fieldU[corner + 1] - fieldU[corner]) * tx;
        const uBottom =
          fieldU[below] + (fieldU[below + 1] - fieldU[below]) * tx;
        const vTop =
          fieldV[corner] + (fieldV[corner + 1] - fieldV[corner]) * tx;
        const vBottom =
          fieldV[below] + (fieldV[below + 1] - fieldV[below]) * tx;
        const u = uTop + (uBottom - uTop) * ty;
        const v = vTop + (vBottom - vTop) * ty;
        const magnitude = Math.abs(u) + Math.abs(v);

        const amplitude = drift * ampFactor[i];
        const restX = homeX[i] + u * amplitude + wx;
        const restY = homeY[i] + v * amplitude + wy;

        let x = restX;
        let y = restY;
        let scale = 1;
        if (!settled) {
          const local = clamp((reform - delay[i] * STAGGER) * rest, 0, 1);
          const inverse = 1 - local;
          const eased = 1 - inverse * inverse * inverse;
          x = scatterX[i] + (restX - scatterX[i]) * eased;
          y = scatterY[i] + (restY - scatterY[i]) * eased;
          scale = SCATTER_SIZE + (1 - SCATTER_SIZE) * eased;
        }

        const size = cellPx * (sizeBase[i] + SIZE_FLOW * magnitude) * scale;
        if (size <= MIN_DRAW) continue;
        if (x < -size || x > width + size) continue;
        if (y < -size || y > height + size) continue;
        traceCell(x, y, size);
      }
      context.fill();
    }
  };

  const draw = () => {
    if (destroyed) return;
    context.clearRect(0, 0, width, height);

    if (settings.still) {
      drawResolved();
      return;
    }

    const now = performance.now();
    const dt = clamp((now - lastFrameAt) / MS_PER_SECOND, 0, MAX_DT);
    lastFrameAt = now;

    const elapsed = (now - startedAt) / MS_PER_SECOND;
    updateFlowField(elapsed * settings.speed * TIME_SCALE);
    advanceWake(dt);

    const reform = clamp((now - scatterAt) / REFORM_MS, 0, 1);
    drawFlowing(reform, Math.exp(-dt / WAKE_TAU));
  };

  const tick = () => {
    if (destroyed || !running) return;
    draw();
    frame = requestAnimationFrame(tick);
  };

  resize();

  return {
    destroy: () => {
      destroyed = true;
      running = false;
      cancelAnimationFrame(frame);
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);
      canvas.width = 0;
      canvas.height = 0;
      sampler.width = 0;
      sampler.height = 0;
    },
    render: () => {
      resize();
      draw();
    },
    resize: () => {
      resize();
      if (!running) draw();
    },
    setPointer: (x, y, active) => {
      if (!pointerActive) {
        previousPointerX = x;
        previousPointerY = y;
      }
      pointerX = x;
      pointerY = y;
      pointerActive = active;
    },
    setRunning: (next) => {
      if (destroyed || running === next) return;
      running = next;
      if (next) {
        lastFrameAt = performance.now();
        if (!hasStarted) {
          hasStarted = true;
          scatterAt = lastFrameAt;
        }
        frame = requestAnimationFrame(tick);
      } else {
        cancelAnimationFrame(frame);
      }
    },
    setSettings: (next) => {
      const rescatter = next.scatterSeed !== settings.scatterSeed;
      settings = next;
      buildGrid();
      if (rescatter) {
        scatterAt = performance.now();
        wakeX.fill(0);
        wakeY.fill(0);
      }
    },
  };
};

const PixelFlowField = ({
  cellSize = DEFAULT_CELL_SIZE,
  children,
  className,
  colors = DEFAULT_COLORS,
  gap = DEFAULT_GAP,
  paused = false,
  pointerRadius = DEFAULT_POINTER_RADIUS,
  pointerStrength = DEFAULT_POINTER_STRENGTH,
  scatter = 0,
  shape = "circle",
  speed = DEFAULT_SPEED,
  src,
  text = DEFAULT_TEXT,
  weight = DEFAULT_WEIGHT,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const hostRef = useRef(null);
  const canvasRef = useRef(null);
  const controllerRef = useRef(null);
  const [isSupported, setIsSupported] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const [resolvedColors, setResolvedColors] = useState(FALLBACK_COLORS);
  const [fontFamily, setFontFamily] = useState(DEFAULT_FONT_FAMILY);
  const [source, setSource] = useState(null);

  const colorKey = colors.join("|");

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    setResolvedColors(resolveCssColors(colorKey.split("|"), host));
  }, [colorKey]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    const read = () => {
      if (!cancelled) {
        setFontFamily(window.getComputedStyle(host).fontFamily || DEFAULT_FONT_FAMILY);
      }
    };
    read();
    if (document.fonts?.ready) {
      document.fonts.ready.then(read).catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!src) {
      setSource(null);
      return;
    }
    let cancelled = false;
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.decoding = "async";
    image.onload = () => {
      if (!cancelled) setSource(image);
    };
    image.onerror = () => {
      if (!cancelled) setSource(null);
    };
    image.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const controller = createFieldController(canvas);
    controllerRef.current = controller;
    setIsSupported(controller !== null);
    if (!controller) return;

    const observer = new ResizeObserver(() => controller.resize());
    observer.observe(canvas);

    return () => {
      observer.disconnect();
      controller.destroy();
      controllerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!(host && isSupported)) return;

    let isOnScreen = true;
    const sync = () => {
      setIsActive(isOnScreen && document.visibilityState === "visible");
    };

    const observer = new IntersectionObserver((entries) => {
      isOnScreen = entries.some((entry) => entry.isIntersecting);
      sync();
    });
    observer.observe(host);
    document.addEventListener("visibilitychange", sync);
    sync();

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [isSupported]);

  useEffect(() => {
    const controller = controllerRef.current;
    if (!controller) return;
    controller.setSettings({
      cellSize: Math.max(cellSize, MIN_STEP),
      colors: resolvedColors,
      fontFamily,
      gap: Math.max(gap, 0),
      pointerRadius: Math.max(pointerRadius, 1),
      pointerStrength: clamp(pointerStrength, 0, 1),
      scatterSeed: scatter,
      shape,
      source,
      speed: Math.max(speed, 0),
      still: shouldReduceMotion === true,
      text,
      weight,
    });
    controller.render();
  }, [
    cellSize,
    fontFamily,
    gap,
    pointerRadius,
    pointerStrength,
    resolvedColors,
    scatter,
    shape,
    shouldReduceMotion,
    source,
    speed,
    text,
    weight,
  ]);

  useEffect(() => {
    const controller = controllerRef.current;
    if (!controller) return;
    const shouldRun = isActive && !paused && !shouldReduceMotion;
    controller.setRunning(shouldRun);
    if (!shouldRun) {
      controller.render();
    }
  }, [isActive, paused, shouldReduceMotion]);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!(host && canvas) || shouldReduceMotion) return;

    const track = (event) => {
      const rect = canvas.getBoundingClientRect();
      controllerRef.current?.setPointer(
        event.clientX - rect.left,
        event.clientY - rect.top,
        true
      );
    };
    const release = () => {
      controllerRef.current?.setPointer(0, 0, false);
    };

    host.addEventListener("pointermove", track, { passive: true });
    host.addEventListener("pointerdown", track, { passive: true });
    host.addEventListener("pointerleave", release);
    host.addEventListener("pointercancel", release);

    return () => {
      host.removeEventListener("pointermove", track);
      host.removeEventListener("pointerdown", track);
      host.removeEventListener("pointerleave", release);
      host.removeEventListener("pointercancel", release);
    };
  }, [shouldReduceMotion]);

  const fallbackColor = toCssColor(colors[1] ?? colors[0] ?? DEFAULT_COLORS[1]);
  const fallbackStep = Math.max(cellSize + gap, MIN_STEP);

  return (
    <div
      className={cn("relative isolate overflow-hidden", className)}
      ref={hostRef}
    >
      {isSupported ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
        >
          <canvas className="h-full w-full" ref={canvasRef} />
        </div>
      ) : (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage: `radial-gradient(${fallbackColor} 1px, transparent 1px)`,
            backgroundSize: `${fallbackStep}px ${fallbackStep}px`,
          }}
        />
      )}
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
};

export default PixelFlowField;
