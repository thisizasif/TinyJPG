const fileInput = document.getElementById("fileInput");
const dropzone = document.getElementById("dropzone");
const resultsList = document.getElementById("resultsList");
const resultCount = document.getElementById("resultCount");
const summaryStats = document.getElementById("summaryStats");
const totalOriginalEl = document.getElementById("totalOriginal");
const totalOutputEl = document.getElementById("totalOutput");
const totalSavedEl = document.getElementById("totalSaved");
const formatSelect = document.getElementById("format");
const targetSizeInput = document.getElementById("targetSize");
const targetUnitSelect = document.getElementById("targetUnit");
const maxWidthInput = document.getElementById("maxWidth");
const maxHeightInput = document.getElementById("maxHeight");
const compressAllBtn = document.getElementById("compressAll");
const clearAllBtn = document.getElementById("clearAll");
const downloadZipBtn = document.getElementById("downloadZip");

const densityToggle = document.getElementById("densityToggle");
const densityLabel = document.getElementById("densityLabel");
const compressAllBtnMobile = document.getElementById("compressAllMobile");
const clearAllBtnMobile = document.getElementById("clearAllMobile");
const downloadZipBtnMobile = document.getElementById("downloadZipMobile");

const state = {
  items: [],
  isCompressing: false,
  pendingRecompress: false,
};

let recompressTimer = null;
const AUTO_MAX_QUALITY = 0.92;

const SETTINGS_KEY = "img-compressor-settings";
const DENSITY_KEY = "img-compressor-density";

const formatBytes = (bytes) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

const parseTargetSize = (value, unit) => {
  if (!value) return 0;
  const amount = parseFloat(value);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  switch (unit) {
    case "MB":
      return amount * 1000 * 1000;
    case "MiB":
      return amount * 1024 * 1024;
    case "KiB":
      return amount * 1024;
    case "KB":
    default:
      return amount * 1000;
  }
};

const updateCount = () => {
  resultCount.textContent = `${state.items.length} file${state.items.length === 1 ? "" : "s"}`;
  const totalOriginal = state.items.reduce((sum, item) => sum + item.originalSize, 0);
  const totalOutput = state.items.reduce((sum, item) => sum + (item.outputSize || 0), 0);
  totalOriginalEl.textContent = formatBytes(totalOriginal);
  totalOutputEl.textContent = totalOutput ? formatBytes(totalOutput) : "0 KB";
  if (totalOriginal > 0 && totalOutput > 0) {
    const saved = totalOriginal - totalOutput;
    const savedPercent = ((saved / totalOriginal) * 100).toFixed(1);
    summaryStats.textContent = `${formatBytes(saved)} saved (${savedPercent}%)`;
    totalSavedEl.textContent = formatBytes(saved);
  } else {
    summaryStats.textContent = "0 KB saved";
    totalSavedEl.textContent = "0 KB";
  }
};

const renderEmpty = () => {
  if (state.items.length === 0) {
    resultsList.innerHTML = `
      <div class="empty">
        <div class="empty-icon">⬆</div>
        <div class="empty-title">No images yet</div>
        <div class="empty-sub">Drop files above or click to browse.</div>
      </div>
    `;
  }
};

const createCard = (item) => {
  const card = document.createElement("div");
  card.className = "result-card";
  card.dataset.id = item.id;
  card.innerHTML = `
    <div class="result-thumb">
      <img src="${item.originalUrl}" alt="${item.file.name}" />
    </div>
    <div class="result-info">
      <div class="result-name">${item.file.name}</div>
      <div class="result-meta">Original: ${formatBytes(item.originalSize)} | Output: --</div>
      <div class="result-status">
        <span class="status-pill status-pill--ready">Ready</span>
        <span class="status-note">Waiting to compress</span>
      </div>
      <div class="result-actions">
        <button class="btn btn-ghost" data-action="compress" type="button">Compress</button>
        <button class="btn" data-action="download" type="button" disabled>Download</button>
        <button class="btn btn-ghost" data-action="remove" type="button">Remove</button>
      </div>
    </div>
  `;
  return card;
};

const updateCard = (item) => {
  const card = resultsList.querySelector(`[data-id="${item.id}"]`);
  if (!card) return;
  const meta = card.querySelector(".result-meta");
  const img = card.querySelector("img");
  const downloadBtn = card.querySelector('[data-action="download"]');
  const compressBtn = card.querySelector('[data-action="compress"]');
  const statusPill = card.querySelector(".status-pill");
  const statusNote = card.querySelector(".status-note");

  const setStatus = (label, tone, note = "") => {
    if (statusPill) {
      statusPill.textContent = label;
      statusPill.className = `status-pill status-pill--${tone}`;
    }
    if (statusNote) {
      statusNote.textContent = note;
    }
  };

  if (item.status === "working") {
    meta.textContent = `Original: ${formatBytes(item.originalSize)} | Compressing...`;
    compressBtn.disabled = true;
    setStatus("Compressing", "working", "Optimizing size");
    updateCount();
    return;
  }

  compressBtn.disabled = false;
  if (item.outputSize) {
    const savings = ((1 - item.outputSize / item.originalSize) * 100).toFixed(1);
    meta.textContent = `Original: ${formatBytes(item.originalSize)} | Output: ${formatBytes(item.outputSize)} | Saved: ${savings}%`;
    downloadBtn.disabled = false;
    img.src = item.outputUrl;

    const targetNote = item.targetBytes
      ? item.outputSize <= item.targetBytes
        ? "Target met"
        : "Target close"
      : "Done";
    const note = item.note ? `${targetNote} ? ${item.note}` : targetNote;
    setStatus("Done", item.targetBytes && item.outputSize > item.targetBytes ? "warning" : "success", note);
  } else {
    meta.textContent = `Original: ${formatBytes(item.originalSize)} | Output: --`;
    downloadBtn.disabled = true;
    setStatus("Ready", "ready", "Waiting to compress");
  }
  updateCount();
};

const addFiles = (files) => {
  const incoming = Array.from(files).filter((file) => file.type.startsWith("image/"));
  if (!incoming.length) return;

  if (state.items.length === 0) {
    resultsList.innerHTML = "";
  }

  incoming.forEach((file) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const item = {
      id,
      file,
      originalUrl: URL.createObjectURL(file),
      outputUrl: "",
      outputBlob: null,
      originalSize: file.size,
      outputSize: 0,
      status: "ready",
      note: "",
      targetBytes: 0,
    };

    state.items.push(item);
    const card = createCard(item);
    resultsList.appendChild(card);
  });

  updateCount();
};

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

const compressWithQuality = (canvas, outputType, quality) =>
  new Promise((resolve) => canvas.toBlob(resolve, outputType, quality));

const compressToTarget = async (canvas, outputType, maxQuality, targetBytes) => {
  if (!targetBytes || targetBytes <= 0 || outputType === "image/png") {
    const blob = await compressWithQuality(canvas, outputType, maxQuality);
    const reached = targetBytes ? blob && blob.size <= targetBytes : true;
    return { blob, reached };
  }

  let low = 0.1;
  let high = Math.max(low, maxQuality);
  let bestBlob = null;

  for (let i = 0; i < 8; i += 1) {
    const mid = (low + high) / 2;
    const attempt = await compressWithQuality(canvas, outputType, mid);
    if (!attempt) break;
    if (attempt.size > targetBytes) {
      high = mid;
    } else {
      bestBlob = attempt;
      low = mid;
    }
  }

  const fallback = bestBlob || (await compressWithQuality(canvas, outputType, high));
  return { blob: fallback, reached: fallback ? fallback.size <= targetBytes : false };
};

const compressItem = async (item) => {
  if (item.status === "working") return;
  item.status = "working";
  item.note = "";
  updateCard(item);

  try {
    const img = await loadImage(item.originalUrl);
    const maxWidth = parseInt(maxWidthInput.value, 10) || img.width;
    const maxHeight = parseInt(maxHeightInput.value, 10) || img.height;
    const ratio = Math.min(1, maxWidth / img.width, maxHeight / img.height);
    let targetWidth = Math.max(1, Math.round(img.width * ratio));
    let targetHeight = Math.max(1, Math.round(img.height * ratio));

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    const selectedFormat = formatSelect.value;
    const targetBytes = parseTargetSize(targetSizeInput.value, targetUnitSelect.value);
    item.targetBytes = targetBytes;
    const baseType = selectedFormat === "original" ? item.file.type || "image/jpeg" : selectedFormat;
    const outputType = baseType;
    const maxQuality = AUTO_MAX_QUALITY;

    let blob = null;
    let reachedTarget = false;
    let resizedNote = "";
    let attempts = 0;

    while (attempts < 6) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      ctx.clearRect(0, 0, targetWidth, targetHeight);
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      const result = await compressToTarget(canvas, outputType, maxQuality, targetBytes);
      blob = result.blob;
      reachedTarget = result.reached;

      if (!blob) break;
      if (!targetBytes || reachedTarget) break;
      if (targetWidth <= 32 || targetHeight <= 32) break;

      const scale = Math.max(0.35, Math.min(0.85, Math.sqrt(targetBytes / blob.size)));
      const nextWidth = Math.max(32, Math.floor(targetWidth * scale));
      const nextHeight = Math.max(32, Math.floor(targetHeight * scale));
      if (nextWidth === targetWidth && nextHeight === targetHeight) break;

      targetWidth = nextWidth;
      targetHeight = nextHeight;
      resizedNote = `Resized to ${targetWidth}×${targetHeight}`;
      attempts += 1;
    }

    if (!blob) throw new Error("Compression failed");

    if (targetBytes > 0 && outputType === "image/png") {
      item.note = "PNG ignores quality";
    }
    if (resizedNote) {
      item.note = item.note ? `${item.note}, ${resizedNote}` : resizedNote;
    }

    if (item.outputUrl) {
      URL.revokeObjectURL(item.outputUrl);
    }

    item.outputBlob = blob;
    item.outputUrl = URL.createObjectURL(blob);
    item.outputSize = blob.size;
    if (targetBytes > 0 && item.outputSize > targetBytes) {
      item.note = item.note ? `${item.note}, target not reached` : "Target not reached";
    }
    item.status = "done";
    updateCard(item);
  } catch (error) {
    item.status = "ready";
    updateCard(item);
  }
};

const compressAll = async () => {
  if (state.isCompressing) {
    state.pendingRecompress = true;
    return;
  }
  state.isCompressing = true;
  for (const item of state.items) {
    await compressItem(item);
  }
  state.isCompressing = false;
  if (state.pendingRecompress) {
    state.pendingRecompress = false;
    compressAll();
  }
};

const waitForIdle = () =>
  new Promise((resolve) => {
    const check = () => {
      if (!state.isCompressing) {
        resolve();
        return;
      }
      setTimeout(check, 120);
    };
    check();
  });

const downloadItem = (item) => {
  if (!item.outputBlob) return;
  const link = document.createElement("a");
  const extension = item.outputBlob.type.split("/")[1] || "jpg";
  const safeName = item.file.name.replace(/\.[^/.]+$/, "");
  link.href = item.outputUrl;
  link.download = `${safeName}-compressed.${extension}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
};

const downloadZip = async () => {
  if (!window.JSZip) {
    alert("ZIP library failed to load.");
    return;
  }
  if (!state.items.length) return;
  await compressAll();
  await waitForIdle();
  const zip = new JSZip();
  state.items.forEach((item) => {
    if (!item.outputBlob) return;
    const extension = item.outputBlob.type.split("/")[1] || "jpg";
    const safeName = item.file.name.replace(/\.[^/.]+$/, "");
    zip.file(`${safeName}-compressed.${extension}`, item.outputBlob);
  });
  const blob = await zip.generateAsync({ type: "blob" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "compressed-images.zip";
  document.body.appendChild(link);
  link.click();
  link.remove();
};

const removeItem = (item) => {
  if (item.originalUrl) URL.revokeObjectURL(item.originalUrl);
  if (item.outputUrl) URL.revokeObjectURL(item.outputUrl);
  state.items = state.items.filter((entry) => entry.id !== item.id);
  const card = resultsList.querySelector(`[data-id="${item.id}"]`);
  if (card) card.remove();
  updateCount();
  renderEmpty();
};

const clearAll = () => {
  if (recompressTimer) {
    clearTimeout(recompressTimer);
    recompressTimer = null;
  }
  state.items.forEach((item) => {
    if (item.originalUrl) URL.revokeObjectURL(item.originalUrl);
    if (item.outputUrl) URL.revokeObjectURL(item.outputUrl);
  });
  state.items = [];
  updateCount();
  renderEmpty();
};

const scheduleRecompress = () => {
  if (!state.items.length) return;
  if (recompressTimer) clearTimeout(recompressTimer);
  recompressTimer = setTimeout(() => {
    compressAll();
  }, 350);
};

const saveSettings = () => {
  const settings = {
    format: formatSelect.value,
    targetSize: targetSizeInput.value,
    targetUnit: targetUnitSelect.value,
    maxWidth: maxWidthInput.value,
    maxHeight: maxHeightInput.value,
  };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

const applyDensity = (density) => {
  const mode = density === "compact" ? "compact" : "comfort";
  resultsList.classList.toggle("is-compact", mode === "compact");
  if (densityToggle) {
    densityToggle.setAttribute("aria-pressed", mode === "compact");
  }
  if (densityLabel) {
    densityLabel.textContent = mode === "compact" ? "Compact" : "Comfort";
  }
  localStorage.setItem(DENSITY_KEY, mode);
};

const loadDensity = () => {
  const saved = localStorage.getItem(DENSITY_KEY) || "comfort";
  applyDensity(saved);
};

const loadSettings = () => {
  const raw = localStorage.getItem(SETTINGS_KEY);
  if (!raw) return;
  try {
    const settings = JSON.parse(raw);
    if (settings.format) formatSelect.value = settings.format;
    if (settings.targetSize) targetSizeInput.value = settings.targetSize;
    if (settings.targetUnit) targetUnitSelect.value = settings.targetUnit;
    if (settings.maxWidth) maxWidthInput.value = settings.maxWidth;
    if (settings.maxHeight) maxHeightInput.value = settings.maxHeight;
  } catch (error) {
    // ignore invalid settings
  }
};

formatSelect.addEventListener("change", () => {
  scheduleRecompress();
  saveSettings();
});

targetSizeInput.addEventListener("input", () => {
  scheduleRecompress();
  saveSettings();
});

targetUnitSelect.addEventListener("change", () => {
  scheduleRecompress();
  saveSettings();
});

maxWidthInput.addEventListener("input", () => {
  scheduleRecompress();
  saveSettings();
});

maxHeightInput.addEventListener("input", () => {
  scheduleRecompress();
  saveSettings();
});

fileInput.addEventListener("change", (event) => {
  addFiles(event.target.files);
  event.target.value = "";
});

dropzone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropzone.classList.add("is-dragging");
});

dropzone.addEventListener("dragleave", () => {
  dropzone.classList.remove("is-dragging");
});

dropzone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropzone.classList.remove("is-dragging");
  if (event.dataTransfer?.files) {
    addFiles(event.dataTransfer.files);
  }
});

if (densityToggle) {
  densityToggle.addEventListener("click", () => {
    const isCompact = resultsList.classList.contains("is-compact");
    applyDensity(isCompact ? "comfort" : "compact");
  });
}

resultsList.addEventListener("click", (event) => {
  const emptyBtn = event.target.closest(".empty-upload");
  if (emptyBtn) {
    fileInput.click();
    return;
  }
  const actionButton = event.target.closest("button");
  if (!actionButton) return;
  const card = actionButton.closest(".result-card");
  if (!card) return;
  const item = state.items.find((entry) => entry.id === card.dataset.id);
  if (!item) return;

  const action = actionButton.dataset.action;
  if (action === "compress") {
    compressItem(item);
  }
  if (action === "download") {
    downloadItem(item);
  }
  if (action === "remove") {
    removeItem(item);
  }
});

compressAllBtn.addEventListener("click", () => {
  compressAll();
});

if (compressAllBtnMobile) {
  compressAllBtnMobile.addEventListener("click", () => {
    compressAll();
  });
}

downloadZipBtn.addEventListener("click", () => {
  downloadZip();
});

if (downloadZipBtnMobile) {
  downloadZipBtnMobile.addEventListener("click", () => {
    downloadZip();
  });
}

clearAllBtn.addEventListener("click", () => {
  clearAll();
});

if (clearAllBtnMobile) {
  clearAllBtnMobile.addEventListener("click", () => {
    clearAll();
  });
}

loadSettings();
loadDensity();
updateCount();
renderEmpty();
