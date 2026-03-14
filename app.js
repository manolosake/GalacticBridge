const state = {
  power: true,
  mode: "manual",
  action: "cruise",
  resource: {
    fuel: 0.78,
    shields: 0.84,
    oxygen: 0.93,
    comms: 0.67,
    energy: 0.64,
    warp: 0.38,
  },
  coords: { x: -12.45, y: 4.88, z: 67.22 },
  threat: 0.38,
  shieldPulse: 0.84,
};

const statusMessages = [
  "Long-range array aligned with Coruscant lane.",
  "Visual simulation loop stable. No live systems attached.",
  "Micro-meteor traffic drifting below shield threshold.",
  "Auxiliary reactors balancing output for cinematic mode.",
  "Docking corridor marked as cosmetic and safe.",
  "Nebula bloom detected on outer rim display grid.",
  "Bridge ambience synced with reactive panel glow.",
  "Imperial escort wing gliding across the tactical glass.",
  "Destroyer contact drifting through the upper corridor.",
];

const actionMessages = {
  activate: "Hyperdrive spool ring engaged. Visual charge building.",
  scan: "Wide-spectrum scan dispatched across nearby sectors.",
  dock: "Docking vectors rendered. Alignment lights cycling.",
  boost: "Drive burst injected. Exterior stars stretching.",
  eject: "Emergency flash triggered. Cabin remains simulation-only.",
};

const modeMessages = {
  manual: "Manual control selected. Pilot authority at maximum.",
  auto: "Auto routing engaged. Flight path self-correcting.",
  combat: "Combat envelope lit. Threat overlays intensified.",
  cruise: "Cruise mode resumed. Systems drifting into calm cadence.",
};

const meterColors = {
  fuel: 10,
  shields: 10,
  oxygen: 10,
  comms: 10,
  energy: 5,
  warp: 5,
};

const telemetryEls = {
  body: document.body,
  powerToggle: document.getElementById("powerToggle"),
  clock: document.getElementById("clockReadout"),
  fuelValue: document.getElementById("fuelValue"),
  shieldValue: document.getElementById("shieldValue"),
  oxygenValue: document.getElementById("oxygenValue"),
  commsValue: document.getElementById("commsValue"),
  threatValue: document.getElementById("threatValue"),
  screenShieldValue: document.getElementById("screenShieldValue"),
  targetChip: document.getElementById("targetChip"),
  destinationTag: document.getElementById("destinationTag"),
  alertChip: document.getElementById("alertChip"),
  modeReadout: document.getElementById("modeReadout"),
  commsCopy: document.getElementById("commsCopy"),
  shieldCopy: document.getElementById("shieldCopy"),
  statusFeed: document.getElementById("statusFeed"),
  coordX: document.getElementById("coordX"),
  coordY: document.getElementById("coordY"),
  coordZ: document.getElementById("coordZ"),
  heatValue: document.getElementById("heatValue"),
  driftValue: document.getElementById("driftValue"),
  biasValue: document.getElementById("biasValue"),
  throttleHandle: document.getElementById("throttleHandle"),
  emergencyButton: document.getElementById("emergencyButton"),
  laserState: document.getElementById("laserState"),
  torpedoState: document.getElementById("torpedoState"),
  missileState: document.getElementById("missileState"),
  engineBars: document.getElementById("engineBars"),
  signalBars: document.getElementById("signalBars"),
  auxBars: document.getElementById("auxBars"),
  hyperdriveLights: document.getElementById("hyperdriveLights"),
  switchBank: document.getElementById("switchBank"),
  portMeter: document.getElementById("portMeter"),
  starboardMeter: document.getElementById("starboardMeter"),
  displayFooterLights: document.getElementById("displayFooterLights"),
  throttleLeft: document.getElementById("throttleLeft"),
  throttleRight: document.getElementById("throttleRight"),
  weaponCharge: document.getElementById("weaponCharge"),
  shieldScale: document.getElementById("shieldScale"),
  alarmStrip: document.getElementById("alarmStrip"),
};

const consoleStage = document.querySelector(".console-stage");
const consoleShell = document.querySelector(".console-shell");

const starfieldCanvas = document.getElementById("starfieldCanvas");
const radarCanvas = document.getElementById("radarCanvas");
const shieldCanvas = document.getElementById("shieldCanvas");

const ctxStar = starfieldCanvas.getContext("2d");
const ctxRadar = radarCanvas.getContext("2d");
const ctxShield = shieldCanvas.getContext("2d");
const staticLayers = {
  starfield: document.createElement("canvas"),
  radar: document.createElement("canvas"),
  shield: document.createElement("canvas"),
};
const renderState = {
  rafId: 0,
  lastFrameTime: 0,
  targetFrameMs: 1000 / 30,
  isVisible: document.visibilityState !== "hidden",
  telemetryHandle: 0,
  statusHandle: 0,
  layoutMode: "",
  viewportWidth: 0,
  viewportHeight: 0,
  appliedScale: 1,
  appliedStageHeight: "",
};
let viewportUpdateRaf = 0;
const spriteCaches = {
  ships: new Map(),
  radar: new Map(),
};

const stars = [];
const radarBlips = [];
const planets = [
  { orbit: 0.18, size: 7, speed: 0.00095, color: "#70c9ff" },
  { orbit: 0.33, size: 10, speed: 0.00048, color: "#bfcfff" },
  { orbit: 0.49, size: 14, speed: 0.00031, color: "#ff7e55" },
  { orbit: 0.64, size: 9, speed: 0.00022, color: "#cedcf7" },
];
const tacticalShips = [
  {
    type: "destroyer",
    color: "#d7e8ff",
    engine: "#62dbff",
    xBase: 0.31,
    yBase: 0.2,
    xDrift: 0.04,
    yDrift: 0.03,
    speed: 0.00018,
    scale: 1.44,
    rotation: 0.18,
    label: "Imperial Destroyer",
  },
  {
    type: "tie",
    color: "#e6f2ff",
    engine: "#58d5ff",
    xBase: 0.74,
    yBase: 0.68,
    xDrift: 0.04,
    yDrift: 0.03,
    speed: 0.00042,
    scale: 1.02,
    rotation: -2.42,
  },
  {
    type: "tie",
    color: "#d3eaff",
    engine: "#35bcff",
    xBase: 0.24,
    yBase: 0.74,
    xDrift: 0.03,
    yDrift: 0.02,
    speed: 0.00034,
    scale: 0.94,
    rotation: -0.6,
  },
  {
    type: "interceptor",
    color: "#ffccc6",
    engine: "#ff8f6a",
    xBase: 0.78,
    yBase: 0.33,
    xDrift: 0.03,
    yDrift: 0.04,
    speed: 0.0005,
    scale: 0.96,
    rotation: 2.74,
    hostile: true,
    label: "Interceptor",
  },
];
const radarContacts = [
  { type: "tie", angle: 0.52, radius: 0.54, speed: 0.0008, color: "#86ecff" },
  { type: "destroyer", angle: -1.24, radius: 0.7, speed: 0.00022, color: "#d8e8ff" },
  { type: "interceptor", angle: 2.32, radius: 0.38, speed: 0.0011, color: "#ff8b79", hostile: true },
];

function createSegments(container, count, className = "") {
  if (!container) return [];
  return Array.from({ length: count }, () => {
    const span = document.createElement("span");
    if (className) span.className = className;
    container.appendChild(span);
    return span;
  });
}

const meters = {};
document.querySelectorAll("[data-meter]").forEach((el) => {
  const key = el.dataset.meter;
  meters[key] = createSegments(el, meterColors[key] || 10);
});
document.querySelectorAll("[data-mini-meter]").forEach((el) => {
  const key = el.dataset.miniMeter;
  meters[key] = createSegments(el, meterColors[key] || 5);
});

const engineSegments = createSegments(telemetryEls.engineBars, 12);
const signalSegments = createSegments(telemetryEls.signalBars, 8);
const auxSegments = createSegments(telemetryEls.auxBars, 5);
const hyperdriveSegments = createSegments(telemetryEls.hyperdriveLights, 8);
const hyperdriveMeterSegments = createSegments(document.getElementById("hyperdriveMeter"), 6);
const switchSegments = createSegments(telemetryEls.switchBank, 6);
const portSegments = createSegments(telemetryEls.portMeter, 12);
const starboardSegments = createSegments(telemetryEls.starboardMeter, 12);
const footerSegments = createSegments(telemetryEls.displayFooterLights, 5);
const throttleLeftSegments = createSegments(telemetryEls.throttleLeft, 8);
const throttleRightSegments = createSegments(telemetryEls.throttleRight, 8);
const weaponChargeSegments = createSegments(telemetryEls.weaponCharge, 12);
const shieldScaleSegments = createSegments(telemetryEls.shieldScale, 10);
const alarmSegments = createSegments(telemetryEls.alarmStrip, 8);

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function drift(value, amount, min = 0.08, max = 0.98) {
  const delta = (Math.random() * 2 - 1) * amount;
  return clamp(value + delta, min, max);
}

function formatPercent(value) {
  return `${Math.round(value * 100)}%`;
}

function setSegmentState(segments, value) {
  if (!segments) return;
  const active = Math.round(value * segments.length);
  segments.forEach((segment, index) => {
    const isSignalBar = segment.parentElement === telemetryEls.signalBars;
    const isAuxBar = segment.parentElement === telemetryEls.auxBars;
    segment.classList.toggle("is-on", index < active);
    const wave = 0.45 + index / (segments.length * 1.4);
    segment.style.opacity = index < active ? `${Math.min(1, wave + value * 0.18)}` : "0.3";
    if (isSignalBar || isAuxBar) {
      if (!segment.dataset.baseHeight) {
        const baseHeight = isSignalBar ? 34 + index * 11 : 30 + index * 18;
        segment.dataset.baseHeight = String(baseHeight);
        segment.style.height = `${baseHeight}px`;
      }
      const restingScale = isSignalBar ? 0.16 : 0.12;
      const activeScale = Math.min(1, 0.5 + value * 0.18 + (index / Math.max(1, segments.length - 1)) * 0.34);
      segment.style.transform = `scaleY(${index < active ? activeScale : restingScale})`;
    }
  });
}

function writeStatus(message) {
  telemetryEls.statusFeed.textContent = message;
}

function updateClock() {
  const now = new Date();
  telemetryEls.clock.textContent = now.toUTCString().split(" ")[4] + " UTC";
}

function updateTelemetryText() {
  telemetryEls.fuelValue.textContent = formatPercent(state.resource.fuel);
  telemetryEls.shieldValue.textContent = formatPercent(state.resource.shields);
  telemetryEls.oxygenValue.textContent = formatPercent(state.resource.oxygen);
  telemetryEls.commsValue.textContent = formatPercent(state.resource.comms);
  telemetryEls.threatValue.textContent = formatPercent(state.threat);
  telemetryEls.screenShieldValue.textContent = formatPercent(state.shieldPulse);
  telemetryEls.coordX.textContent = state.coords.x.toFixed(2);
  telemetryEls.coordY.textContent = state.coords.y.toFixed(2);
  telemetryEls.coordZ.textContent = state.coords.z.toFixed(2);
  telemetryEls.heatValue.textContent = `${Math.round(42 + state.resource.energy * 46 + state.threat * 12)}C`;
  telemetryEls.driftValue.textContent = `${(state.resource.warp * 0.71).toFixed(2)}`;
  telemetryEls.biasValue.textContent =
    state.mode === "combat" ? "Redline" : state.mode === "auto" ? "Auto" : state.mode === "cruise" ? "Blue" : "Green";
}

function updateMeters() {
  Object.entries(state.resource).forEach(([key, value]) => setSegmentState(meters[key], value));
  setSegmentState(engineSegments, 0.45 + state.resource.energy * 0.45);
  setSegmentState(signalSegments, state.resource.comms);
  setSegmentState(auxSegments, 0.32 + state.resource.fuel * 0.52);
  setSegmentState(hyperdriveSegments, 0.18 + state.resource.warp * 0.72);
  setSegmentState(hyperdriveMeterSegments, 0.12 + state.resource.warp * 0.8);
  setSegmentState(portSegments, 0.2 + state.resource.energy * 0.72);
  setSegmentState(starboardSegments, 0.22 + state.resource.shields * 0.7);
  setSegmentState(footerSegments, state.resource.comms);
  setSegmentState(throttleLeftSegments, 0.25 + state.resource.energy * 0.55);
  setSegmentState(throttleRightSegments, 0.3 + state.resource.warp * 0.6);
  setSegmentState(weaponChargeSegments, 0.24 + state.threat * 0.72);
  setSegmentState(shieldScaleSegments, state.resource.shields);
  setSegmentState(alarmSegments, state.mode === "combat" || state.action === "eject" ? 0.9 : 0.35);
  switchSegments.forEach((segment, index) => {
    const shouldBeOn = (index + Math.round(state.resource.energy * 10)) % 2 === 0 || (state.mode === "combat" && index < 4);
    segment.classList.toggle("is-on", shouldBeOn);
    segment.style.opacity = shouldBeOn ? "1" : "0.45";
  });
}

function fitConsoleToViewport() {
  const viewportWidth = Math.round(window.innerWidth || document.documentElement.clientWidth || 0);
  const viewportHeight = Math.round(window.innerHeight || document.documentElement.clientHeight || 0);
  const shouldViewportFill = viewportWidth >= 1280 && viewportHeight >= 560;
  const shouldFit = viewportWidth >= 1100 && viewportHeight >= 500 && !shouldViewportFill;
  const nextMode = shouldViewportFill ? "fill" : shouldFit ? "fit" : "auto";

  if (
    renderState.layoutMode === nextMode &&
    Math.abs(renderState.viewportWidth - viewportWidth) < 3 &&
    Math.abs(renderState.viewportHeight - viewportHeight) < 3
  ) {
    return;
  }

  renderState.viewportWidth = viewportWidth;
  renderState.viewportHeight = viewportHeight;
  renderState.layoutMode = nextMode;

  telemetryEls.body.classList.toggle("is-viewport-fill", shouldViewportFill);
  telemetryEls.body.classList.toggle("is-fit-mode", shouldFit);

  if (shouldViewportFill) {
    if (renderState.appliedStageHeight !== "") {
      consoleStage.style.height = "";
      renderState.appliedStageHeight = "";
    }
    if (renderState.appliedScale !== 1) {
      consoleShell.style.transform = "";
      renderState.appliedScale = 1;
    }
    return;
  }

  if (!shouldFit) {
    if (renderState.appliedStageHeight !== "auto") {
      consoleStage.style.height = "auto";
      renderState.appliedStageHeight = "auto";
    }
    if (renderState.appliedScale !== 1) {
      consoleShell.style.transform = "";
      renderState.appliedScale = 1;
    }
    return;
  }

  consoleShell.style.transform = "scale(1)";
  consoleStage.style.height = "auto";

  const shellWidth = consoleShell.offsetWidth;
  const shellHeight = consoleShell.offsetHeight;
  const availableWidth = viewportWidth - 32;
  const availableHeight = viewportHeight - 32;
  const scale = Math.min(1, availableWidth / shellWidth, availableHeight / shellHeight);
  const roundedScale = Math.round(scale * 1000) / 1000;
  const nextStageHeight = `${Math.ceil(shellHeight * roundedScale)}px`;

  if (renderState.appliedScale !== roundedScale) {
    consoleShell.style.transform = `scale(${roundedScale})`;
    renderState.appliedScale = roundedScale;
  }
  if (renderState.appliedStageHeight !== nextStageHeight) {
    consoleStage.style.height = nextStageHeight;
    renderState.appliedStageHeight = nextStageHeight;
  }
}

function tickTelemetry() {
  if (!state.power) {
    state.resource.comms = drift(state.resource.comms, 0.02, 0.12, 0.38);
    state.resource.shields = drift(state.resource.shields, 0.01, 0.28, 0.46);
    state.resource.energy = drift(state.resource.energy, 0.015, 0.2, 0.44);
    state.threat = drift(state.threat, 0.02, 0.18, 0.52);
  } else {
    state.resource.fuel = drift(state.resource.fuel, 0.018, 0.42, 0.96);
    state.resource.shields = drift(state.resource.shields, 0.025, 0.48, 0.98);
    state.resource.oxygen = drift(state.resource.oxygen, 0.01, 0.8, 0.99);
    state.resource.comms = drift(state.resource.comms, 0.04, 0.32, 0.96);
    state.resource.energy = drift(state.resource.energy, 0.05, 0.28, 0.98);
    state.resource.warp = drift(state.resource.warp, 0.045, 0.18, 0.96);
    state.threat = drift(state.threat, state.mode === "combat" ? 0.08 : 0.035, 0.12, state.mode === "combat" ? 0.92 : 0.68);
  }

  state.shieldPulse = clamp((state.resource.shields + state.resource.energy) / 2, 0, 1);
  state.coords.x = drift(state.coords.x, 0.42, -99, 99);
  state.coords.y = drift(state.coords.y, 0.37, -99, 99);
  state.coords.z = drift(state.coords.z, 0.31, -99, 99);

  const throttle = 36 + state.resource.warp * 48 + (state.action === "boost" ? 8 : 0);
  telemetryEls.throttleHandle.style.top = `${clamp(88 - throttle, 18, 80)}%`;
  telemetryEls.commsCopy.textContent =
    state.mode === "combat"
      ? "Priority combat relay open. Signal noise rising."
      : state.action === "dock"
        ? "Docking band reserved. Guidance beacons pulsing."
        : "Relay channel clean // no distortion";
  telemetryEls.shieldCopy.textContent =
    state.power
      ? "Deflection envelope holding."
      : "Shield lattice dimmed. Passive shell retained.";
  telemetryEls.alertChip.textContent = state.mode === "combat" || state.action === "eject" ? "High alert" : state.power ? "Nominal" : "Standby";
  updateMeters();
  updateTelemetryText();
}

function cycleStatusMessage() {
  const base = statusMessages[Math.floor(Math.random() * statusMessages.length)];
  const extra = state.mode === "combat" ? " Threat paint active." : state.action === "boost" ? " Velocity bloom increasing." : "";
  writeStatus(base + extra);
}

function resizeCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const ratio = getRenderRatio(canvas);
  const nextWidth = Math.max(1, Math.round(rect.width * ratio));
  const nextHeight = Math.max(1, Math.round(rect.height * ratio));
  const changed = canvas.width !== nextWidth || canvas.height !== nextHeight || canvas.__renderRatio !== ratio;
  if (changed) {
    canvas.width = nextWidth;
    canvas.height = nextHeight;
    canvas.__renderRatio = ratio;
  }
  return changed;
}

function seedVisuals() {
  stars.length = 0;
  radarBlips.length = 0;

  const starDensity = Math.round(
    clamp((starfieldCanvas.clientWidth * starfieldCanvas.clientHeight) / 9000, 70, 120)
  );
  const radarDensity = Math.round(clamp(radarCanvas.clientWidth / 40, 5, 8));

  for (let i = 0; i < starDensity; i += 1) {
    stars.push({
      x: Math.random(),
      y: Math.random(),
      size: Math.random() * 2.2 + 0.3,
      alpha: Math.random() * 0.8 + 0.2,
      drift: (Math.random() * 2 - 1) * 0.0005,
    });
  }

  for (let i = 0; i < radarDensity; i += 1) {
    radarBlips.push({
      angle: Math.random() * Math.PI * 2,
      radius: 0.12 + Math.random() * 0.82,
      pulse: Math.random() * Math.PI * 2,
      speed: 0.003 + Math.random() * 0.004,
    });
  }
}

function resizeVisuals() {
  const changed = [starfieldCanvas, radarCanvas, shieldCanvas].some(resizeCanvas);
  if (changed || stars.length === 0 || radarBlips.length === 0) {
    seedVisuals();
    redrawStaticLayers();
  }
}

function getRenderRatio(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const area = canvas.clientWidth * canvas.clientHeight;
  if (area > 450000) return Math.min(dpr, 1.1);
  if (area > 220000) return Math.min(dpr, 1.25);
  return Math.min(dpr, 1.5);
}

function pseudoUnit(seed) {
  const raw = Math.sin(seed * 12.9898) * 43758.5453;
  return raw - Math.floor(raw);
}

function resizeStaticLayer(sourceCanvas, targetCanvas) {
  const changed = targetCanvas.width !== sourceCanvas.width || targetCanvas.height !== sourceCanvas.height;
  if (changed) {
    targetCanvas.width = sourceCanvas.width;
    targetCanvas.height = sourceCanvas.height;
    targetCanvas.__renderRatio = sourceCanvas.__renderRatio || 1;
  }
  return changed;
}

function drawStarfieldBackdrop() {
  resizeStaticLayer(starfieldCanvas, staticLayers.starfield);
  const ctx = staticLayers.starfield.getContext("2d");
  const ratio = staticLayers.starfield.__renderRatio || 1;
  const width = staticLayers.starfield.width;
  const height = staticLayers.starfield.height;
  const w = starfieldCanvas.clientWidth;
  const h = starfieldCanvas.clientHeight;
  const centerX = w * 0.53;
  const centerY = h * 0.48;

  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.scale(ratio, ratio);

  const nebula = ctx.createRadialGradient(w * 0.53, h * 0.48, 20, w * 0.53, h * 0.48, w * 0.45);
  nebula.addColorStop(0, "rgba(255, 183, 79, 0.95)");
  nebula.addColorStop(0.12, "rgba(255, 130, 44, 0.42)");
  nebula.addColorStop(0.38, "rgba(84, 134, 255, 0.18)");
  nebula.addColorStop(1, "rgba(1, 5, 10, 0)");
  ctx.fillStyle = nebula;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(Math.PI / 12);
  for (let i = 0; i < 16; i += 1) {
    ctx.rotate(Math.PI / 8);
    ctx.strokeStyle = `rgba(132, ${140 + i * 3}, 255, ${0.05 + i * 0.01})`;
    ctx.lineWidth = 1 + i * 0.12;
    ctx.beginPath();
    ctx.ellipse(0, 0, w * (0.07 + i * 0.02), h * (0.03 + i * 0.012), Math.PI / 6, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  for (let i = 0; i < 110; i += 1) {
    const x = pseudoUnit(i + w * 0.01);
    const y = pseudoUnit(i * 1.7 + h * 0.01);
    const alpha = 0.18 + pseudoUnit(i * 2.1) * 0.45;
    const size = 0.4 + pseudoUnit(i * 0.7) * 1.8;
    ctx.fillStyle = `rgba(220, 235, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(x * w, y * h, size, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.lineWidth = 1.4;
  [0.22, 0.36, 0.52, 0.68].forEach((orbit, index) => {
    ctx.strokeStyle = [
      "rgba(38, 217, 255, 0.7)",
      "rgba(255, 93, 93, 0.4)",
      "rgba(85, 133, 255, 0.5)",
      "rgba(255, 147, 31, 0.35)",
    ][index];
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, w * orbit, h * orbit * 0.55, index * 0.6, 0, Math.PI * 2);
    ctx.stroke();
  });

  ctx.strokeStyle = "rgba(170, 210, 255, 0.42)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(centerX - w * 0.3, centerY + h * 0.24);
  ctx.lineTo(centerX + w * 0.18, centerY - h * 0.18);
  ctx.stroke();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.28)";
  ctx.beginPath();
  ctx.moveTo(centerX, 0);
  ctx.lineTo(centerX, h);
  ctx.moveTo(0, centerY);
  ctx.lineTo(w, centerY);
  ctx.stroke();

  ctx.restore();
}

function drawRadarBackdrop() {
  resizeStaticLayer(radarCanvas, staticLayers.radar);
  const ctx = staticLayers.radar.getContext("2d");
  const ratio = staticLayers.radar.__renderRatio || 1;
  const width = staticLayers.radar.width;
  const height = staticLayers.radar.height;
  const w = radarCanvas.clientWidth;
  const h = radarCanvas.clientHeight;
  const cx = w / 2;
  const cy = h / 2;
  const radius = Math.min(w, h) * 0.4;

  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.scale(ratio, ratio);
  ctx.fillStyle = "rgba(1, 9, 18, 0.86)";
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "rgba(180, 220, 255, 0.12)";
  ctx.lineWidth = 1;
  for (let i = 1; i <= 4; i += 1) {
    ctx.beginPath();
    ctx.arc(cx, cy, (radius * i) / 4, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.moveTo(cx - radius, cy);
  ctx.lineTo(cx + radius, cy);
  ctx.moveTo(cx, cy - radius);
  ctx.lineTo(cx, cy + radius);
  ctx.stroke();
  ctx.restore();
}

function drawShieldBackdrop() {
  resizeStaticLayer(shieldCanvas, staticLayers.shield);
  const ctx = staticLayers.shield.getContext("2d");
  const ratio = staticLayers.shield.__renderRatio || 1;
  const width = staticLayers.shield.width;
  const height = staticLayers.shield.height;
  const w = shieldCanvas.clientWidth;
  const h = shieldCanvas.clientHeight;
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) * 0.34;

  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.scale(ratio, ratio);
  ctx.fillStyle = "rgba(0, 8, 16, 0.88)";
  ctx.fillRect(0, 0, w, h);

  const shieldGlow = ctx.createRadialGradient(cx, cy, r * 0.25, cx, cy, r * 1.2);
  shieldGlow.addColorStop(0, "rgba(99, 232, 255, 0.22)");
  shieldGlow.addColorStop(1, "rgba(8, 14, 20, 0)");
  ctx.fillStyle = shieldGlow;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.25, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(15, 145, 255, 0.55)";
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 5; i += 1) {
    ctx.beginPath();
    ctx.arc(cx, cy, r * (0.4 + i * 0.16), 0, Math.PI * 2);
    ctx.stroke();
  }

  for (let i = -2; i <= 2; i += 1) {
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * Math.cos(i * 0.22), r, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(cx, cy, r, r * Math.cos(i * 0.22), 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  const core = ctx.createRadialGradient(cx, cy, 6, cx, cy, r);
  core.addColorStop(0, "rgba(255, 255, 255, 0.7)");
  core.addColorStop(0.15, "rgba(78, 195, 255, 0.62)");
  core.addColorStop(1, "rgba(6, 23, 47, 0.95)");
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function redrawStaticLayers() {
  drawStarfieldBackdrop();
  drawRadarBackdrop();
  drawShieldBackdrop();
  spriteCaches.ships.clear();
  spriteCaches.radar.clear();
}

function refreshViewportLayout() {
  window.cancelAnimationFrame(viewportUpdateRaf);
  viewportUpdateRaf = window.requestAnimationFrame(() => {
    fitConsoleToViewport();
    resizeVisuals();
  });
}

function isCompactDisplay(height = starfieldCanvas.clientHeight) {
  const viewportHeight = Math.round(window.innerHeight || document.documentElement.clientHeight || 0);
  return height <= 320 || viewportHeight <= 720;
}

function getShipRenderScale(ship, w, h) {
  if (!isCompactDisplay(h)) return ship.scale;
  if (ship.type === "destroyer") return ship.scale * 0.82;
  if (ship.type === "interceptor") return ship.scale * 0.88;
  return ship.scale * 0.9;
}

function getTacticalShipPose(ship, time, w, h) {
  const sway = Math.sin(time * ship.speed + ship.scale);
  const drift = Math.cos(time * ship.speed * 0.72 + ship.scale * 1.8);
  const compact = isCompactDisplay(h);
  const xBaseAdjust =
    compact && ship.type === "destroyer"
      ? 0.04
      : compact && ship.type === "interceptor"
        ? -0.04
        : 0;
  const yBaseAdjust =
    compact && ship.type === "destroyer"
      ? -0.01
      : compact && ship.type === "interceptor"
        ? 0.02
        : 0;
  return {
    x: (ship.xBase + xBaseAdjust + sway * ship.xDrift) * w,
    y: (ship.yBase + yBaseAdjust + drift * ship.yDrift) * h,
    rotation: ship.rotation + Math.sin(time * ship.speed * 1.7) * 0.08,
  };
}

function drawClosedPath(ctx, points) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i += 1) {
    ctx.lineTo(points[i][0], points[i][1]);
  }
  ctx.closePath();
}

function drawOpenPath(ctx, points) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i += 1) {
    ctx.lineTo(points[i][0], points[i][1]);
  }
}

function offsetPoints(points, dx, dy) {
  return points.map(([x, y]) => [x + dx, y + dy]);
}

function drawShipShadow(ctx, scale, width, height, alpha = 0.22) {
  const shadow = ctx.createRadialGradient(0, height * 0.26, 2, 0, height * 0.26, width);
  shadow.addColorStop(0, `rgba(0, 0, 0, ${alpha})`);
  shadow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.ellipse(-4 * scale, height * 0.26, width, height, 0, 0, Math.PI * 2);
  ctx.fill();
}

function getShipPalette(hostile = false) {
  if (hostile) {
    return {
      hullBright: "rgba(255, 184, 168, 0.98)",
      hullMid: "rgba(255, 115, 84, 0.92)",
      hullDark: "rgba(73, 26, 24, 0.95)",
      edge: "rgba(255, 203, 190, 0.98)",
      panel: "rgba(255, 145, 126, 0.55)",
      core: "rgba(255, 220, 210, 0.92)",
    };
  }
  return {
    hullBright: "rgba(245, 249, 255, 0.98)",
    hullMid: "rgba(154, 178, 205, 0.92)",
    hullDark: "rgba(34, 48, 67, 0.96)",
    edge: "rgba(227, 245, 255, 0.98)",
    panel: "rgba(165, 214, 255, 0.4)",
    core: "rgba(209, 236, 255, 0.94)",
  };
}

function drawImperialDestroyer(ctx, scale, hostile = false) {
  const palette = getShipPalette(hostile);
  const topHull = [
    [62 * scale, 0],
    [24 * scale, -16 * scale],
    [-10 * scale, -22 * scale],
    [-54 * scale, -15 * scale],
    [-74 * scale, -7 * scale],
    [-82 * scale, 0],
    [-74 * scale, 7 * scale],
    [-54 * scale, 15 * scale],
    [-10 * scale, 22 * scale],
    [24 * scale, 16 * scale],
  ];
  const underside = offsetPoints(topHull, -14 * scale, 9 * scale);
  drawShipShadow(ctx, scale, 88 * scale, 18 * scale, hostile ? 0.25 : 0.2);

  const undersideFill = ctx.createLinearGradient(-82 * scale, 14 * scale, 30 * scale, -10 * scale);
  undersideFill.addColorStop(0, hostile ? "rgba(86, 22, 18, 0.9)" : "rgba(18, 28, 44, 0.92)");
  undersideFill.addColorStop(1, hostile ? "rgba(166, 68, 42, 0.84)" : "rgba(64, 89, 116, 0.84)");
  ctx.fillStyle = undersideFill;
  ctx.strokeStyle = hostile ? "rgba(255, 158, 140, 0.28)" : "rgba(169, 205, 255, 0.2)";
  ctx.lineWidth = 1.1 * scale;
  drawClosedPath(ctx, underside);
  ctx.fill();
  ctx.stroke();

  const hullFill = ctx.createLinearGradient(-82 * scale, -16 * scale, 62 * scale, 14 * scale);
  hullFill.addColorStop(0, palette.hullDark);
  hullFill.addColorStop(0.34, palette.hullMid);
  hullFill.addColorStop(1, palette.hullBright);
  ctx.fillStyle = hullFill;
  ctx.strokeStyle = palette.edge;
  ctx.lineWidth = Math.max(1.8, scale * 1.85);
  drawClosedPath(ctx, topHull);
  ctx.fill();
  ctx.stroke();

  const dorsalSpine = [
    [36 * scale, 0],
    [8 * scale, -8 * scale],
    [-34 * scale, -10 * scale],
    [-48 * scale, -4 * scale],
    [-48 * scale, 4 * scale],
    [-34 * scale, 10 * scale],
    [8 * scale, 8 * scale],
  ];
  const spineFill = ctx.createLinearGradient(-48 * scale, -8 * scale, 40 * scale, 10 * scale);
  spineFill.addColorStop(0, "rgba(34, 52, 76, 0.82)");
  spineFill.addColorStop(1, "rgba(223, 240, 255, 0.68)");
  ctx.fillStyle = spineFill;
  drawClosedPath(ctx, dorsalSpine);
  ctx.fill();

  ctx.strokeStyle = palette.panel;
  ctx.lineWidth = 1.2 * scale;
  drawOpenPath(ctx, [
    [-44 * scale, -9 * scale],
    [18 * scale, -1 * scale],
    [42 * scale, 0],
  ]);
  ctx.stroke();
  drawOpenPath(ctx, [
    [-44 * scale, 9 * scale],
    [18 * scale, 1 * scale],
    [42 * scale, 0],
  ]);
  ctx.stroke();

  const towerBase = [
    [-4 * scale, -12 * scale],
    [8 * scale, -7 * scale],
    [8 * scale, 7 * scale],
    [-4 * scale, 12 * scale],
    [-14 * scale, 8 * scale],
    [-14 * scale, -8 * scale],
  ];
  const towerTop = [
    [-2 * scale, -7 * scale],
    [8 * scale, -4 * scale],
    [8 * scale, 4 * scale],
    [-2 * scale, 7 * scale],
    [-10 * scale, 4 * scale],
    [-10 * scale, -4 * scale],
  ];
  ctx.fillStyle = hostile ? "rgba(255, 152, 132, 0.75)" : "rgba(214, 232, 248, 0.78)";
  drawClosedPath(ctx, towerBase);
  ctx.fill();
  ctx.fillStyle = hostile ? "rgba(255, 219, 204, 0.8)" : "rgba(245, 250, 255, 0.88)";
  drawClosedPath(ctx, towerTop);
  ctx.fill();

  ctx.fillStyle = hostile ? "rgba(255, 235, 228, 0.65)" : "rgba(170, 233, 255, 0.8)";
  ctx.fillRect(-5.5 * scale, -1.3 * scale, 10 * scale, 2.6 * scale);
  ctx.beginPath();
  ctx.arc(-12 * scale, -2 * scale, 1.7 * scale, 0, Math.PI * 2);
  ctx.arc(-12 * scale, 2 * scale, 1.7 * scale, 0, Math.PI * 2);
  ctx.fill();
}

function drawTiePanel(ctx, points, fillA, fillB, edge, gridColor) {
  const backPanel = offsetPoints(points, 4, 3);
  const panelGlow = ctx.createLinearGradient(points[0][0], points[0][1], points[4][0], points[4][1]);
  panelGlow.addColorStop(0, fillA);
  panelGlow.addColorStop(1, fillB);

  ctx.fillStyle = "rgba(10, 18, 30, 0.78)";
  drawClosedPath(ctx, backPanel);
  ctx.fill();

  ctx.fillStyle = panelGlow;
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.45;
  drawClosedPath(ctx, points);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 0.8;
  for (let i = 1; i <= 3; i += 1) {
    const t = i / 4;
    const x = points[0][0] + (points[4][0] - points[0][0]) * t;
    const x2 = points[1][0] + (points[5][0] - points[1][0]) * t;
    const y = points[0][1] + (points[4][1] - points[0][1]) * t;
    const y2 = points[1][1] + (points[5][1] - points[1][1]) * t;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
}

function drawTieFighter(ctx, scale, hostile = false) {
  const palette = getShipPalette(hostile);
  drawShipShadow(ctx, scale, 44 * scale, 16 * scale, hostile ? 0.22 : 0.18);

  const leftPanel = [
    [-42 * scale, -27 * scale],
    [-25 * scale, -22 * scale],
    [-17 * scale, -11 * scale],
    [-17 * scale, 11 * scale],
    [-25 * scale, 22 * scale],
    [-42 * scale, 27 * scale],
    [-50 * scale, 16 * scale],
    [-50 * scale, -16 * scale],
  ];
  const rightPanel = leftPanel.map(([x, y]) => [-x, y]);
  drawTiePanel(
    ctx,
    leftPanel,
    hostile ? "rgba(78, 24, 24, 0.95)" : "rgba(14, 24, 40, 0.96)",
    hostile ? "rgba(39, 12, 12, 0.9)" : "rgba(6, 12, 20, 0.94)",
    hostile ? "rgba(255, 164, 145, 0.75)" : "rgba(164, 216, 255, 0.62)",
    hostile ? "rgba(255, 135, 122, 0.28)" : "rgba(113, 189, 255, 0.18)"
  );
  drawTiePanel(
    ctx,
    rightPanel,
    hostile ? "rgba(78, 24, 24, 0.95)" : "rgba(14, 24, 40, 0.96)",
    hostile ? "rgba(39, 12, 12, 0.9)" : "rgba(6, 12, 20, 0.94)",
    hostile ? "rgba(255, 164, 145, 0.75)" : "rgba(164, 216, 255, 0.62)",
    hostile ? "rgba(255, 135, 122, 0.28)" : "rgba(113, 189, 255, 0.18)"
  );

  ctx.strokeStyle = hostile ? "rgba(255, 176, 160, 0.86)" : "rgba(194, 231, 255, 0.78)";
  ctx.lineWidth = 2.2 * scale;
  drawOpenPath(ctx, [
    [-18 * scale, 0],
    [-8 * scale, 0],
    [0, 0],
    [8 * scale, 0],
    [18 * scale, 0],
  ]);
  ctx.stroke();

  const cockpit = ctx.createRadialGradient(-3 * scale, -4 * scale, 2, 0, 0, 18 * scale);
  cockpit.addColorStop(0, palette.core);
  cockpit.addColorStop(0.4, palette.hullMid);
  cockpit.addColorStop(1, palette.hullDark);
  ctx.fillStyle = cockpit;
  ctx.beginPath();
  ctx.arc(0, 0, 15 * scale, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = palette.edge;
  ctx.lineWidth = 1.4 * scale;
  ctx.beginPath();
  ctx.arc(0, 0, 15 * scale, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, 10 * scale, 0, Math.PI * 2);
  ctx.stroke();
  drawOpenPath(ctx, [
    [-10 * scale, 0],
    [10 * scale, 0],
  ]);
  ctx.stroke();
  drawOpenPath(ctx, [
    [0, -10 * scale],
    [0, 10 * scale],
  ]);
  ctx.stroke();
}

function drawTieInterceptor(ctx, scale, hostile = false) {
  const palette = getShipPalette(hostile);
  drawShipShadow(ctx, scale, 52 * scale, 18 * scale, hostile ? 0.24 : 0.2);

  const leftPanel = [
    [-56 * scale, -28 * scale],
    [-35 * scale, -12 * scale],
    [-28 * scale, -4 * scale],
    [-38 * scale, 0],
    [-28 * scale, 4 * scale],
    [-35 * scale, 12 * scale],
    [-56 * scale, 28 * scale],
    [-48 * scale, 0],
  ];
  const rightPanel = leftPanel.map(([x, y]) => [-x, y]);
  drawTiePanel(
    ctx,
    leftPanel,
    hostile ? "rgba(96, 24, 22, 0.95)" : "rgba(18, 30, 48, 0.96)",
    hostile ? "rgba(46, 11, 10, 0.92)" : "rgba(8, 16, 26, 0.94)",
    hostile ? "rgba(255, 173, 153, 0.78)" : "rgba(180, 226, 255, 0.64)",
    hostile ? "rgba(255, 132, 114, 0.26)" : "rgba(104, 177, 255, 0.16)"
  );
  drawTiePanel(
    ctx,
    rightPanel,
    hostile ? "rgba(96, 24, 22, 0.95)" : "rgba(18, 30, 48, 0.96)",
    hostile ? "rgba(46, 11, 10, 0.92)" : "rgba(8, 16, 26, 0.94)",
    hostile ? "rgba(255, 173, 153, 0.78)" : "rgba(180, 226, 255, 0.64)",
    hostile ? "rgba(255, 132, 114, 0.26)" : "rgba(104, 177, 255, 0.16)"
  );

  ctx.strokeStyle = hostile ? "rgba(255, 190, 176, 0.86)" : "rgba(212, 236, 255, 0.8)";
  ctx.lineWidth = 2 * scale;
  drawOpenPath(ctx, [
    [-21 * scale, -2 * scale],
    [-7 * scale, 0],
    [7 * scale, 0],
    [21 * scale, 2 * scale],
  ]);
  ctx.stroke();

  const cockpit = ctx.createRadialGradient(-3 * scale, -4 * scale, 2, 0, 0, 16 * scale);
  cockpit.addColorStop(0, palette.core);
  cockpit.addColorStop(0.42, palette.hullMid);
  cockpit.addColorStop(1, palette.hullDark);
  ctx.fillStyle = cockpit;
  ctx.beginPath();
  ctx.arc(0, 0, 13 * scale, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = palette.edge;
  ctx.lineWidth = 1.25 * scale;
  ctx.beginPath();
  ctx.arc(0, 0, 13 * scale, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, 8.5 * scale, 0, Math.PI * 2);
  ctx.stroke();
  drawOpenPath(ctx, [
    [-8 * scale, -8 * scale],
    [0, 0],
    [-8 * scale, 8 * scale],
  ]);
  ctx.stroke();
  drawOpenPath(ctx, [
    [8 * scale, -8 * scale],
    [0, 0],
    [8 * scale, 8 * scale],
  ]);
  ctx.stroke();
}

function drawShipHull(ctx, type, scale, hostile = false) {
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  if (type === "destroyer") {
    drawImperialDestroyer(ctx, scale, hostile);
    return;
  }

  if (type === "interceptor") {
    drawTieInterceptor(ctx, scale, hostile);
    return;
  }

  drawTieFighter(ctx, scale, hostile);
}

function getShipSpriteMetrics(type, scale) {
  if (type === "destroyer") {
    return { width: Math.ceil(212 * scale), height: Math.ceil(118 * scale) };
  }
  if (type === "interceptor") {
    return { width: Math.ceil(138 * scale), height: Math.ceil(118 * scale) };
  }
  return { width: Math.ceil(124 * scale), height: Math.ceil(104 * scale) };
}

function getShipSprite(type, scale, hostile = false) {
  const key = `${type}:${scale}:${hostile ? 1 : 0}`;
  const cached = spriteCaches.ships.get(key);
  if (cached) return cached;

  const metrics = getShipSpriteMetrics(type, scale);
  const canvas = document.createElement("canvas");
  canvas.width = metrics.width;
  canvas.height = metrics.height;

  const ctx = canvas.getContext("2d");
  ctx.translate(metrics.width / 2, metrics.height / 2);
  drawShipHull(ctx, type, scale, hostile);

  const sprite = {
    canvas,
    width: metrics.width,
    height: metrics.height,
    anchorX: metrics.width / 2,
    anchorY: metrics.height / 2,
  };
  spriteCaches.ships.set(key, sprite);
  return sprite;
}

function drawShipTrail(ctx, type, scale, engineColor) {
  ctx.save();
  ctx.rotate(Math.PI);
  const trailLength = type === "destroyer" ? 72 * scale : type === "interceptor" ? 30 * scale : 24 * scale;
  const trailWidth = type === "destroyer" ? 8 * scale : type === "interceptor" ? 3.8 * scale : 3.2 * scale;
  const glow = ctx.createLinearGradient(0, 0, trailLength, 0);
  glow.addColorStop(0, engineColor);
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.strokeStyle = glow;
  ctx.lineWidth = trailWidth;
  if (type === "destroyer") {
    [-8 * scale, 0, 8 * scale].forEach((offsetY) => {
      ctx.beginPath();
      ctx.moveTo(-18 * scale, offsetY);
      ctx.lineTo(-trailLength, offsetY);
      ctx.stroke();
    });
  } else if (type === "interceptor") {
    [-4 * scale, 4 * scale].forEach((offsetY) => {
      ctx.beginPath();
      ctx.moveTo(-8 * scale, offsetY);
      ctx.lineTo(-trailLength, offsetY);
      ctx.stroke();
    });
  } else {
    ctx.beginPath();
    ctx.moveTo(-8 * scale, 0);
    ctx.lineTo(-trailLength, 0);
    ctx.stroke();
  }
  ctx.restore();
}

function drawTacticalShip(ctx, ship, x, y, rotation, time) {
  const compact = isCompactDisplay();
  const renderScale = getShipRenderScale(ship, starfieldCanvas.clientWidth, starfieldCanvas.clientHeight);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  drawShipTrail(ctx, ship.type, renderScale, ship.engine);

  const sprite = getShipSprite(ship.type, renderScale, ship.hostile);
  ctx.shadowBlur = ship.type === "destroyer" ? 16 : 10;
  ctx.shadowColor = ship.hostile ? "rgba(255, 124, 114, 0.28)" : "rgba(170, 220, 255, 0.24)";
  ctx.drawImage(sprite.canvas, -sprite.anchorX, -sprite.anchorY);
  ctx.shadowBlur = 0;

  ctx.shadowBlur = ship.type === "destroyer" ? 24 : 16;
  ctx.shadowColor = ship.engine;
  ctx.fillStyle = ship.engine;
  if (ship.type === "destroyer") {
    [-10 * renderScale, 0, 10 * renderScale].forEach((offsetY) => {
      ctx.beginPath();
      ctx.arc(-72 * renderScale, offsetY, 4.2 * renderScale, 0, Math.PI * 2);
      ctx.fill();
    });
  } else if (ship.type === "interceptor") {
    ctx.beginPath();
    ctx.arc(-10 * renderScale, -3 * renderScale, 2.6 * renderScale, 0, Math.PI * 2);
    ctx.arc(-10 * renderScale, 3 * renderScale, 2.6 * renderScale, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(-8 * renderScale, 0, 2.7 * renderScale, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  if (ship.type === "destroyer") {
    ctx.strokeStyle = ship.hostile ? "rgba(255, 160, 143, 0.52)" : "rgba(120, 205, 255, 0.55)";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-26 * renderScale, -9 * renderScale);
    ctx.lineTo(44 * renderScale, 0);
    ctx.lineTo(-26 * renderScale, 9 * renderScale);
    ctx.stroke();
  }

  if (ship.label && !compact) {
    ctx.rotate(-rotation);
    ctx.fillStyle = ship.hostile ? "rgba(255, 155, 145, 0.9)" : "rgba(193, 223, 255, 0.9)";
    ctx.font = `600 ${ship.type === "destroyer" ? 11 : 10}px "Orbitron", sans-serif`;
    ctx.fillText(ship.label.toUpperCase(), 12 * renderScale, -18 * renderScale + Math.sin(time * 0.003) * 2);
  }

  ctx.restore();
}

function drawRadarGlyph(ctx, type, scale, color, hostile = false) {
  ctx.strokeStyle = color;
  ctx.fillStyle = hostile ? "rgba(255, 124, 114, 0.18)" : "rgba(134, 236, 255, 0.12)";
  ctx.lineWidth = 1.4;
  if (type === "destroyer") {
    ctx.beginPath();
    ctx.moveTo(15 * scale, 0);
    ctx.lineTo(6 * scale, -5 * scale);
    ctx.lineTo(-10 * scale, -7 * scale);
    ctx.lineTo(-16 * scale, 0);
    ctx.lineTo(-10 * scale, 7 * scale);
    ctx.lineTo(6 * scale, 5 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-4 * scale, -3 * scale);
    ctx.lineTo(9 * scale, 0);
    ctx.lineTo(-4 * scale, 3 * scale);
    ctx.stroke();
    return;
  }
  if (type === "interceptor") {
    ctx.beginPath();
    ctx.moveTo(11 * scale, 0);
    ctx.lineTo(3 * scale, -4 * scale);
    ctx.lineTo(-11 * scale, -9 * scale);
    ctx.lineTo(-4 * scale, 0);
    ctx.lineTo(-11 * scale, 9 * scale);
    ctx.lineTo(3 * scale, 4 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 2.6 * scale, 0, Math.PI * 2);
    ctx.stroke();
    return;
  }
  ctx.strokeRect(-9 * scale, -11 * scale, 5 * scale, 22 * scale);
  ctx.strokeRect(4 * scale, -11 * scale, 5 * scale, 22 * scale);
  ctx.beginPath();
  ctx.arc(0, 0, 4 * scale, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-4 * scale, 0);
  ctx.lineTo(-9 * scale, 0);
  ctx.moveTo(4 * scale, 0);
  ctx.lineTo(9 * scale, 0);
  ctx.stroke();
}

function getRadarGlyphSprite(type, scale, hostile = false) {
  const key = `${type}:${scale}:${hostile ? 1 : 0}`;
  const cached = spriteCaches.radar.get(key);
  if (cached) return cached;

  const size = Math.ceil((type === "destroyer" ? 42 : type === "interceptor" ? 34 : 30) * scale + 12);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.translate(size / 2, size / 2);
  drawRadarGlyph(
    ctx,
    type,
    scale,
    hostile ? "rgba(255, 124, 114, 0.95)" : "rgba(180, 239, 255, 0.95)",
    hostile
  );

  const sprite = { canvas, size, anchor: size / 2 };
  spriteCaches.radar.set(key, sprite);
  return sprite;
}

function drawStarfield(time) {
  const width = starfieldCanvas.width;
  const height = starfieldCanvas.height;
  ctxStar.clearRect(0, 0, width, height);
  ctxStar.drawImage(staticLayers.starfield, 0, 0);

  const ratio = starfieldCanvas.__renderRatio || 1;
  ctxStar.save();
  ctxStar.scale(ratio, ratio);
  const w = starfieldCanvas.clientWidth;
  const h = starfieldCanvas.clientHeight;

  stars.forEach((star, index) => {
    const x = (star.x + time * star.drift * 0.03 + index * 0.000001) % 1;
    const y = (star.y + time * star.drift * 0.02 + index * 0.0000012) % 1;
    const alpha = star.alpha * (0.7 + Math.sin(time * 0.001 + index) * 0.3);
    ctxStar.fillStyle = `rgba(220, 235, 255, ${alpha})`;
    ctxStar.beginPath();
    ctxStar.arc(((x + 1) % 1) * w, ((y + 1) % 1) * h, star.size, 0, Math.PI * 2);
    ctxStar.fill();
  });

  const centerX = w * 0.53;
  const centerY = h * 0.48;

  planets.forEach((planet, index) => {
    const angle = time * planet.speed + index * 1.8;
    const px = centerX + Math.cos(angle) * w * planet.orbit;
    const py = centerY + Math.sin(angle) * h * planet.orbit * 0.55;

    ctxStar.fillStyle = planet.color;
    ctxStar.shadowBlur = 24;
    ctxStar.shadowColor = planet.color;
    ctxStar.beginPath();
    ctxStar.arc(px, py, planet.size, 0, Math.PI * 2);
    ctxStar.fill();
    ctxStar.shadowBlur = 0;

    if (index === 2) {
      ctxStar.strokeStyle = "rgba(255, 96, 96, 0.85)";
      ctxStar.lineWidth = 2;
      ctxStar.beginPath();
      ctxStar.arc(px, py, planet.size + 12 + Math.sin(time * 0.008) * 3, 0, Math.PI * 2);
      ctxStar.stroke();
      ctxStar.beginPath();
      ctxStar.moveTo(px, py);
      ctxStar.lineTo(centerX - w * 0.22, centerY + h * 0.21);
      ctxStar.stroke();
    }
  });

  tacticalShips.forEach((ship) => {
    const pose = getTacticalShipPose(ship, time, w, h);
    drawTacticalShip(ctxStar, ship, pose.x, pose.y, pose.rotation, time);
  });

  ctxStar.restore();
}

function drawRadar(time) {
  const width = radarCanvas.width;
  const height = radarCanvas.height;
  ctxRadar.clearRect(0, 0, width, height);
  ctxRadar.drawImage(staticLayers.radar, 0, 0);

  const ratio = radarCanvas.__renderRatio || 1;
  ctxRadar.save();
  ctxRadar.scale(ratio, ratio);
  const w = radarCanvas.clientWidth;
  const h = radarCanvas.clientHeight;
  const cx = w / 2;
  const cy = h / 2;
  const radius = Math.min(w, h) * 0.4;

  const sweep = time * 0.0016;
  const gradient = ctxRadar.createRadialGradient(cx, cy, 0, cx, cy, radius);
  gradient.addColorStop(0, "rgba(32, 232, 255, 0.12)");
  gradient.addColorStop(1, "rgba(32, 232, 255, 0)");
  ctxRadar.fillStyle = gradient;
  ctxRadar.beginPath();
  ctxRadar.moveTo(cx, cy);
  ctxRadar.arc(cx, cy, radius, sweep, sweep + Math.PI / 4);
  ctxRadar.closePath();
  ctxRadar.fill();

  ctxRadar.strokeStyle = "rgba(89, 243, 255, 0.9)";
  ctxRadar.lineWidth = 2;
  ctxRadar.beginPath();
  ctxRadar.moveTo(cx, cy);
  ctxRadar.lineTo(cx + Math.cos(sweep) * radius, cy + Math.sin(sweep) * radius);
  ctxRadar.stroke();

  radarBlips.forEach((blip, index) => {
    blip.angle += Math.sin(time * 0.0004 + index) * 0.0002;
    const bx = cx + Math.cos(blip.angle) * radius * blip.radius;
    const by = cy + Math.sin(blip.angle) * radius * blip.radius;
    const alpha = 0.35 + Math.abs(Math.sin(time * blip.speed + blip.pulse)) * 0.65;
    ctxRadar.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctxRadar.beginPath();
    ctxRadar.arc(bx, by, 3.2, 0, Math.PI * 2);
    ctxRadar.fill();
  });

  radarContacts.forEach((contact, index) => {
    const angle = contact.angle + Math.sin(time * contact.speed + index) * 0.3;
    const radial = radius * (contact.radius + Math.cos(time * contact.speed * 1.7 + index) * 0.04);
    const x = cx + Math.cos(angle) * radial;
    const y = cy + Math.sin(angle) * radial;
    const alpha = contact.hostile ? 0.9 : 0.75;

    ctxRadar.strokeStyle = contact.hostile ? `rgba(255, 118, 101, ${alpha})` : `rgba(131, 238, 255, ${alpha})`;
    ctxRadar.lineWidth = 1;
    ctxRadar.beginPath();
    ctxRadar.arc(x, y, contact.type === "destroyer" ? 10 : 8, 0, Math.PI * 2);
    ctxRadar.stroke();

    ctxRadar.save();
    ctxRadar.translate(x, y);
    ctxRadar.rotate(angle + Math.PI / 2);
    const glyphScale = contact.type === "destroyer" ? 0.9 : 0.7;
    const glyph = getRadarGlyphSprite(contact.type, glyphScale, contact.hostile);
    ctxRadar.drawImage(glyph.canvas, -glyph.anchor, -glyph.anchor);
    ctxRadar.restore();
  });

  ctxRadar.fillStyle = "rgba(120, 180, 255, 0.95)";
  ctxRadar.beginPath();
  ctxRadar.arc(cx, cy, 7, 0, Math.PI * 2);
  ctxRadar.fill();

  ctxRadar.restore();
}

function drawShield(time) {
  const width = shieldCanvas.width;
  const height = shieldCanvas.height;
  ctxShield.clearRect(0, 0, width, height);
  ctxShield.drawImage(staticLayers.shield, 0, 0);

  const ratio = shieldCanvas.__renderRatio || 1;
  ctxShield.save();
  ctxShield.scale(ratio, ratio);
  const w = shieldCanvas.clientWidth;
  const h = shieldCanvas.clientHeight;
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) * 0.34;

  ctxShield.strokeStyle = "rgba(27, 93, 255, 0.9)";
  ctxShield.lineWidth = 3;
  ctxShield.beginPath();
  ctxShield.arc(cx, cy, r + 26, time * 0.0004, time * 0.0004 + Math.PI * (1.3 + state.shieldPulse * 0.5));
  ctxShield.stroke();

  ctxShield.restore();
}

function animate(time) {
  if (renderState.isVisible && time - renderState.lastFrameTime >= renderState.targetFrameMs) {
    renderState.lastFrameTime = time;
    drawStarfield(time);
    drawRadar(time);
    drawShield(time);
  }
  renderState.rafId = requestAnimationFrame(animate);
}

function stopLoops() {
  window.clearTimeout(renderState.telemetryHandle);
  window.clearTimeout(renderState.statusHandle);
}

function runTelemetryLoop() {
  updateClock();
  if (renderState.isVisible) {
    tickTelemetry();
  }
  const delay = renderState.isVisible ? 900 : 2600;
  renderState.telemetryHandle = window.setTimeout(runTelemetryLoop, delay);
}

function runStatusLoop() {
  if (renderState.isVisible) {
    cycleStatusMessage();
  }
  const delay = renderState.isVisible ? 3200 : 7000;
  renderState.statusHandle = window.setTimeout(runStatusLoop, delay);
}

function triggerFlash(kind) {
  telemetryEls.body.dataset.flash = kind;
  window.clearTimeout(triggerFlash.timeout);
  triggerFlash.timeout = window.setTimeout(() => {
    delete telemetryEls.body.dataset.flash;
  }, 1500);
}

function setAction(action) {
  state.action = action;
  telemetryEls.modeReadout.textContent =
    action === "boost"
      ? "Boost corridor engaged"
      : action === "dock"
        ? "Docking vectors projected"
        : action === "scan"
          ? "Spectral scan in progress"
          : action === "eject"
            ? "Emergency simulation armed"
            : modeMessages[state.mode].replace(/\.$/, "");

  if (action === "boost") {
    telemetryEls.targetChip.textContent = "Target lock: Slipstream corridor";
    telemetryEls.destinationTag.textContent = "Destination // Velocity surge";
    telemetryEls.commsValue.textContent = "91%";
  } else if (action === "dock") {
    telemetryEls.targetChip.textContent = "Docking gate: Aurek station";
    telemetryEls.destinationTag.textContent = "Destination // Hangar spine";
  } else if (action === "scan") {
    telemetryEls.targetChip.textContent = "Scan sweep: Outer rim fragments";
    telemetryEls.destinationTag.textContent = "Destination // Mapping unknown grid";
  } else if (action === "eject") {
    telemetryEls.targetChip.textContent = "Emergency alarm: Cabin sealed";
    telemetryEls.destinationTag.textContent = "Destination // Stay aboard";
  } else {
    telemetryEls.targetChip.textContent = "Target lock: Coruscant lane";
    telemetryEls.destinationTag.textContent = "Destination // Coruscant Prime";
  }

  if (action === "eject") {
    telemetryEls.emergencyButton.textContent = "Alarm";
    telemetryEls.laserState.textContent = "Hot";
    telemetryEls.torpedoState.textContent = "Primed";
    telemetryEls.missileState.textContent = "Tracking";
  } else {
    telemetryEls.emergencyButton.textContent = state.mode === "combat" ? "Armed" : "Standby";
    telemetryEls.laserState.textContent = state.mode === "combat" ? "Overwatch" : "Online";
    telemetryEls.torpedoState.textContent = state.mode === "combat" ? "Hot" : "Ready";
    telemetryEls.missileState.textContent = state.mode === "combat" ? "Locking" : "Armed";
  }

  writeStatus(actionMessages[action]);
  triggerFlash(action === "eject" ? "alert" : action);
}

function setMode(mode) {
  state.mode = mode;
  document.querySelectorAll("[data-mode]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.mode === mode);
  });
  telemetryEls.modeReadout.textContent = modeMessages[mode].replace(/\.$/, "");
  writeStatus(modeMessages[mode]);
}

document.querySelectorAll("[data-action]").forEach((button) => {
  button.addEventListener("click", () => setAction(button.dataset.action));
});

document.querySelectorAll("[data-mode]").forEach((button) => {
  button.addEventListener("click", () => setMode(button.dataset.mode));
});

telemetryEls.powerToggle.addEventListener("click", () => {
  state.power = !state.power;
  telemetryEls.body.dataset.power = state.power ? "on" : "off";
  telemetryEls.powerToggle.setAttribute("aria-pressed", String(state.power));
  telemetryEls.modeReadout.textContent = state.power ? modeMessages[state.mode].replace(/\.$/, "") : "Systems dimmed // ambient standby";
  writeStatus(state.power ? "Power core re-engaged. All cosmetic systems awake." : "Bridge dropped to standby. Passive glow retained.");
});

telemetryEls.emergencyButton.addEventListener("click", () => {
  setAction("eject");
});

window.addEventListener("resize", refreshViewportLayout);
document.addEventListener("visibilitychange", () => {
  renderState.isVisible = document.visibilityState !== "hidden";
  renderState.lastFrameTime = 0;
  if (renderState.isVisible) {
    refreshViewportLayout();
    updateClock();
  }
});

refreshViewportLayout();
updateClock();
updateMeters();
updateTelemetryText();
writeStatus("Command deck boot sequence complete. Welcome aboard.");
renderState.rafId = requestAnimationFrame(animate);

const readyGate = document.fonts?.ready
  ? Promise.race([
      document.fonts.ready,
      new Promise((resolve) => window.setTimeout(resolve, 1200)),
    ])
  : Promise.resolve();

readyGate.then(() => {
  refreshViewportLayout();
  telemetryEls.body.classList.add("is-ready");
});

stopLoops();
runTelemetryLoop();
runStatusLoop();
