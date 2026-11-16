import "./style.css";
import type { DitherMode, FitMode, RotationDegrees } from "./pdf/binarizer.ts";
import {
  DEFAULT_RASTER_OPTIONS,
  rasterizePdfDocument,
  type RasterOptions,
  type RenderedLabelPage,
} from "./pdf/rasterizer.ts";

interface AppState {
  fileName: string | null;
  pdfBytes: Uint8Array | null;
  options: RasterOptions;
  pages: RenderedLabelPage[];
  isRendering: boolean;
  errorMessage: string | null;
}

const state: AppState = {
  fileName: null,
  pdfBytes: null,
  options: { ...DEFAULT_RASTER_OPTIONS },
  pages: [],
  isRendering: false,
  errorMessage: null,
};

let renderSeq = 0;

function parseFitMode(value: string): FitMode {
  return value === "crop-bleed" ? "crop-bleed" : "fit";
}

function parseDitherMode(value: string): DitherMode {
  return value === "atkinson" ? "atkinson" : "threshold";
}

function parseRotation(value: string | undefined): RotationDegrees {
  switch (value) {
    case "90":
      return 90;
    case "180":
      return 180;
    case "270":
      return 270;
    default:
      return 0;
  }
}

const appRoot = document.querySelector<HTMLDivElement>("#app");
if (!appRoot) {
  throw new Error("Missing #app container in index.html");
}

appRoot.innerHTML = `
  <div class="app-shell">
    <header class="topbar">
      <div>
        <h1>Niimbot B1 — 50×50 mm PDF Label Rasterizer</h1>
        <p class="topbar-sub">203 DPI · 384×400 px active thermal head · 1 mm left/right physical margins</p>
      </div>
      <div class="hardware-badge" role="status">
        <span class="hardware-dot" aria-hidden="true"></span>
        <span>Printer Transport: Reserved for Task #4 — USB COM9 / BLE</span>
      </div>
    </header>

    <main class="workspace-grid">
      <section class="panel" aria-label="PDF and Raster Controls">
        <div id="dropzone" class="dropzone" tabindex="0" role="button" aria-label="Select or drop PDF file">
          <div class="dropzone-title">Drop 50×50 mm PDF here or click to browse</div>
          <div class="dropzone-hint">Offline PDF.js worker · Embedded scripting disabled</div>
          <input id="pdf-input" class="hidden-input" type="file" accept="application/pdf,.pdf" />
        </div>

        <div id="file-meta" class="file-meta">No PDF loaded</div>

        <div class="control-group">
          <label class="control-label" for="fit-mode">Sizing Mode</label>
          <select id="fit-mode">
            <option value="fit">Scale to Fit (384×400 px - Safe)</option>
            <option value="crop-bleed">1:1 Physical Crop (Trim 1mm side bleed)</option>
          </select>
        </div>

        <div class="control-group">
          <label class="control-label" for="dither-mode">1-Bit Binarization Mode</label>
          <select id="dither-mode">
            <option value="threshold">Sharp Threshold (Text / QR / Barcodes)</option>
            <option value="atkinson">Atkinson Dither (Logos / Grayscale)</option>
          </select>
        </div>

        <div id="threshold-group" class="control-group">
          <div class="threshold-row">
            <label class="control-label" for="threshold-slider">Luminance Threshold</label>
            <span id="threshold-value" class="mono-value">${state.options.threshold}</span>
          </div>
          <input id="threshold-slider" type="range" min="80" max="230" step="1" value="${state.options.threshold}" />
        </div>

        <div class="control-group">
          <span class="control-label">Rotation</span>
          <div id="rotation-group" class="rotation-group" role="group" aria-label="Page rotation">
            <button type="button" class="rot-btn is-active" data-rot="0">0°</button>
            <button type="button" class="rot-btn" data-rot="90">90°</button>
            <button type="button" class="rot-btn" data-rot="180">180°</button>
            <button type="button" class="rot-btn" data-rot="270">270°</button>
          </div>
        </div>

        <label class="checkbox-row">
          <input id="invert-toggle" type="checkbox" />
          <span>Invert polarity (white on black)</span>
        </label>

        <div id="status-banner" class="status-banner">Ready for PDF input.</div>
      </section>

      <section class="panel" aria-label="Label Previews">
        <div class="preview-header">
          <h2>50×50 mm Thermal Sticker Previews</h2>
          <span id="page-count-badge" class="mono-value">0 pages</span>
        </div>
        <div id="preview-container" class="empty-state">
          Upload a PDF label sheet to preview the 1-bit 384×400 px output and ImageEncoder packet validation.
        </div>
      </section>
    </main>
  </div>
`;

const dropzone = document.querySelector<HTMLDivElement>("#dropzone")!;
const fileInput = document.querySelector<HTMLInputElement>("#pdf-input")!;
const fileMetaEl = document.querySelector<HTMLDivElement>("#file-meta")!;
const fitModeSelect = document.querySelector<HTMLSelectElement>("#fit-mode")!;
const ditherModeSelect = document.querySelector<HTMLSelectElement>("#dither-mode")!;
const thresholdGroup = document.querySelector<HTMLDivElement>("#threshold-group")!;
const thresholdSlider = document.querySelector<HTMLInputElement>("#threshold-slider")!;
const thresholdValueEl = document.querySelector<HTMLSpanElement>("#threshold-value")!;
const rotationButtons = Array.from(document.querySelectorAll<HTMLButtonElement>(".rot-btn"));
const invertToggle = document.querySelector<HTMLInputElement>("#invert-toggle")!;
const statusBanner = document.querySelector<HTMLDivElement>("#status-banner")!;
const pageCountBadge = document.querySelector<HTMLSpanElement>("#page-count-badge")!;
const previewContainer = document.querySelector<HTMLDivElement>("#preview-container")!;

function setStatus(message: string, isError = false): void {
  statusBanner.textContent = message;
  statusBanner.classList.toggle("is-error", isError);
}

function updateThresholdVisibility(): void {
  const isThreshold = state.options.ditherMode === "threshold";
  thresholdGroup.style.display = isThreshold ? "flex" : "none";
}

function renderPreviewCards(): void {
  pageCountBadge.textContent = `${state.pages.length} ${state.pages.length === 1 ? "page" : "pages"}`;

  if (state.pages.length === 0) {
    previewContainer.className = "empty-state";
    previewContainer.textContent =
      "Upload a PDF label sheet to preview the 1-bit 384×400 px output and ImageEncoder packet validation.";
    return;
  }

  previewContainer.className = "preview-grid";
  previewContainer.replaceChildren();

  for (const page of state.pages) {
    const card = document.createElement("article");
    card.className = "sticker-card";

    const head = document.createElement("div");
    head.className = "sticker-card-head";
    const title = document.createElement("span");
    title.textContent = `Page ${page.pageNumber}`;
    const sizePill = document.createElement("span");
    sizePill.className = `pill ${page.isExpected50x50Mm ? "pill-ok" : "pill-warn"}`;
    sizePill.textContent = page.isExpected50x50Mm
      ? `${page.sourceWidthMm.toFixed(1)}×${page.sourceHeightMm.toFixed(1)} mm`
      : `Non-50mm: ${page.sourceWidthMm.toFixed(1)}×${page.sourceHeightMm.toFixed(1)} mm`;
    head.append(title, sizePill);

    const frame = document.createElement("div");
    frame.className = "sticker-frame";
    frame.title = "Dashed bands indicate 1 mm (8 px) unprintable left/right margins";
    page.canvas.className = "sticker-canvas";
    frame.append(page.canvas);

    const meta = document.createElement("div");
    meta.className = "sticker-meta";

    const outputDim = document.createElement("div");
    outputDim.textContent = `Canvas: ${page.widthPx}×${page.heightPx} px (1-bit)`;

    const encoderInfo = document.createElement("div");
    encoderInfo.textContent = `ImageEncoder: ${page.encodedImage.cols}×${page.encodedImage.rows} · ${page.encodedImage.rowsData.length} packets`;

    const inkInfo = document.createElement("div");
    const totalPixels = page.widthPx * page.heightPx;
    const coveragePct = ((page.blackPixelsCount / totalPixels) * 100).toFixed(1);
    inkInfo.textContent = `Black dots: ${page.blackPixelsCount.toLocaleString()} (${coveragePct}%)`;

    meta.append(outputDim, encoderInfo, inkInfo);
    card.append(head, frame, meta);
    previewContainer.append(card);
  }
}

async function runRasterPipeline(): Promise<void> {
  if (!state.pdfBytes) {
    return;
  }

  const currentSeq = ++renderSeq;
  state.isRendering = true;
  state.errorMessage = null;
  setStatus(`Rasterizing ${state.fileName ?? "PDF"} at 384×400 px...`);

  try {
    const renderedPages = await rasterizePdfDocument(state.pdfBytes, state.options);
    if (currentSeq !== renderSeq) {
      return;
    }
    state.pages = renderedPages;
    state.isRendering = false;
    renderPreviewCards();
    setStatus(
      `Rendered ${renderedPages.length} label ${renderedPages.length === 1 ? "page" : "pages"} (ImageEncoder verified).`,
    );
  } catch (err) {
    if (currentSeq !== renderSeq) {
      return;
    }
    state.isRendering = false;
    state.pages = [];
    renderPreviewCards();
    const message = err instanceof Error ? err.message : String(err);
    state.errorMessage = message;
    setStatus(`PDF rasterization failed: ${message}`, true);
  }
}

async function handleSelectedFile(file: File): Promise<void> {
  if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
    setStatus(`Unsupported file "${file.name}". Please choose a .pdf file.`, true);
    return;
  }

  const buffer = await file.arrayBuffer();
  state.fileName = file.name;
  state.pdfBytes = new Uint8Array(buffer);
  fileMetaEl.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
  await runRasterPipeline();
}

dropzone.addEventListener("click", () => fileInput.click());
dropzone.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    fileInput.click();
  }
});

dropzone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropzone.classList.add("is-dragover");
});

dropzone.addEventListener("dragleave", () => {
  dropzone.classList.remove("is-dragover");
});

dropzone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropzone.classList.remove("is-dragover");
  const droppedFile = event.dataTransfer?.files[0];
  if (droppedFile) {
    void handleSelectedFile(droppedFile);
  }
});

fileInput.addEventListener("change", () => {
  const chosenFile = fileInput.files?.[0];
  if (chosenFile) {
    void handleSelectedFile(chosenFile);
  }
});

fitModeSelect.addEventListener("change", () => {
  state.options.fitMode = parseFitMode(fitModeSelect.value);
  void runRasterPipeline();
});

ditherModeSelect.addEventListener("change", () => {
  state.options.ditherMode = parseDitherMode(ditherModeSelect.value);
  updateThresholdVisibility();
  void runRasterPipeline();
});

thresholdSlider.addEventListener("input", () => {
  const value = Number.parseInt(thresholdSlider.value, 10);
  state.options.threshold = value;
  thresholdValueEl.textContent = String(value);
  void runRasterPipeline();
});

for (const btn of rotationButtons) {
  btn.addEventListener("click", () => {
    const rot = parseRotation(btn.dataset.rot);
    state.options.rotation = rot;
    for (const item of rotationButtons) {
      item.classList.toggle("is-active", item === btn);
    }
    void runRasterPipeline();
  });
}

invertToggle.addEventListener("change", () => {
  state.options.invert = invertToggle.checked;
  void runRasterPipeline();
});

updateThresholdVisibility();
