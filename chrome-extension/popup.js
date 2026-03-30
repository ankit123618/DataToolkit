const DEFAULT_STATE = {
  fileSize: 1,
  fileUnit: "GB",
  transferType: "download",
  downloadSpeed: 50,
  uploadSpeed: 10,
  overheadPercent: 5,
  detectedDownlink: null,
  effectiveType: "",
  rtt: null
};

const state = { ...DEFAULT_STATE };

const elements = {
  fileSize: document.getElementById("fileSize"),
  fileUnit: document.getElementById("fileUnit"),
  transferType: document.getElementById("transferType"),
  downloadSpeed: document.getElementById("downloadSpeed"),
  uploadSpeed: document.getElementById("uploadSpeed"),
  overheadPercent: document.getElementById("overheadPercent"),
  activeSpeed: document.getElementById("activeSpeed"),
  time: document.getElementById("time"),
  data: document.getElementById("data"),
  detectBtn: document.getElementById("detectBtn"),
  connectionStatus: document.getElementById("connectionStatus"),
  connectionMeta: document.getElementById("connectionMeta")
};

async function loadState() {
  const stored = await chrome.storage.local.get(DEFAULT_STATE);
  Object.assign(state, stored);

  elements.fileSize.value = state.fileSize;
  elements.fileUnit.value = state.fileUnit;
  elements.transferType.value = state.transferType;
  elements.downloadSpeed.value = state.downloadSpeed;
  elements.uploadSpeed.value = state.uploadSpeed;
  elements.overheadPercent.value = state.overheadPercent;

  renderConnectionHint();
  calculate();
}

function numberFromInput(element, fallback) {
  const value = Number.parseFloat(element.value);
  return Number.isFinite(value) ? value : fallback;
}

function toMegabytes(size, unit) {
  return unit === "GB" ? size * 1024 : size;
}

function formatDuration(totalSeconds) {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return "Waiting for a valid speed";
  }

  const seconds = Math.round(totalSeconds);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
  }

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }

  return `${remainingSeconds}s`;
}

function formatData(megabytes) {
  if (megabytes >= 1024) {
    return `${(megabytes / 1024).toFixed(2)} GB`;
  }

  return `${megabytes.toFixed(2)} MB`;
}

function calculate() {
  state.fileSize = numberFromInput(elements.fileSize, DEFAULT_STATE.fileSize);
  state.fileUnit = elements.fileUnit.value;
  state.transferType = elements.transferType.value;
  state.downloadSpeed = numberFromInput(elements.downloadSpeed, DEFAULT_STATE.downloadSpeed);
  state.uploadSpeed = numberFromInput(elements.uploadSpeed, DEFAULT_STATE.uploadSpeed);
  state.overheadPercent = numberFromInput(elements.overheadPercent, DEFAULT_STATE.overheadPercent);

  const sizeInMb = toMegabytes(state.fileSize, state.fileUnit);
  const selectedSpeed = state.transferType === "upload" ? state.uploadSpeed : state.downloadSpeed;
  const speedInMBps = selectedSpeed / 8;
  const durationSeconds = speedInMBps > 0 ? sizeInMb / speedInMBps : Number.NaN;
  const totalDataMb = sizeInMb * (1 + state.overheadPercent / 100);

  elements.activeSpeed.textContent = `${selectedSpeed.toFixed(2)} Mbps`;
  elements.time.textContent = formatDuration(durationSeconds);
  elements.data.textContent = formatData(totalDataMb);

  void chrome.storage.local.set({ ...state });
}

function renderConnectionHint() {
  if (Number.isFinite(state.detectedDownlink) && state.detectedDownlink > 0) {
    elements.connectionStatus.textContent = `${state.detectedDownlink.toFixed(2)} Mbps downlink detected`;
    const parts = [];

    if (state.effectiveType) {
      parts.push(`Type: ${state.effectiveType}`);
    }

    if (Number.isFinite(state.rtt)) {
      parts.push(`RTT: ${state.rtt} ms`);
    }

    elements.connectionMeta.textContent =
      parts.length > 0
        ? `${parts.join(" • ")}. You can copy the detected downlink into the calculator.`
        : "You can copy the detected downlink into the calculator.";
    return;
  }

  elements.connectionStatus.textContent = "No browser connection hint available";
  elements.connectionMeta.textContent =
    "Chrome can expose a connection estimate on some systems, but upload speed usually still needs manual input.";
}

async function detectConnection() {
  const connection =
    navigator.connection ||
    navigator.webkitConnection ||
    navigator.mozConnection;

  if (!connection) {
    state.detectedDownlink = null;
    state.effectiveType = "";
    state.rtt = null;
    renderConnectionHint();
    await chrome.storage.local.set({ ...state });
    return;
  }

  state.detectedDownlink = Number.isFinite(connection.downlink)
    ? connection.downlink
    : null;
  state.effectiveType = connection.effectiveType || "";
  state.rtt = Number.isFinite(connection.rtt) ? connection.rtt : null;

  if (Number.isFinite(state.detectedDownlink) && state.detectedDownlink > 0) {
    state.downloadSpeed = state.detectedDownlink;
    elements.downloadSpeed.value = state.downloadSpeed.toFixed(2);
  }

  renderConnectionHint();
  calculate();
  await chrome.storage.local.set({ ...state });
}

function bindEvents() {
  [
    elements.fileSize,
    elements.fileUnit,
    elements.transferType,
    elements.downloadSpeed,
    elements.uploadSpeed,
    elements.overheadPercent
  ].forEach((element) => {
    element.addEventListener("input", calculate);
    element.addEventListener("change", calculate);
  });

  elements.detectBtn.addEventListener("click", () => {
    void detectConnection();
  });
}

async function init() {
  bindEvents();
  await loadState();
  await detectConnection();
}

void init();
