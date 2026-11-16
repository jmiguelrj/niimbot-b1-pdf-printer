import { LabelType } from "@mmote/niimbluelib";
import "./style.css";
import type { DitherMode, FitMode, RotationDegrees } from "./pdf/binarizer.ts";
import {
  DEFAULT_RASTER_OPTIONS,
  rasterizePdfDocument,
  type RasterOptions,
  type RenderedLabelPage,
} from "./pdf/rasterizer.ts";
import {
  B1PrinterController,
  DEFAULT_LABEL_TYPE,
  DEFAULT_PRINT_DENSITY,
  detectBrowserTransportCapabilities,
  type PrintLiveProgress,
  type PrinterTelemetrySnapshot,
  type ProtocolLogEntry,
} from "./printer/b1Client.ts";

interface AppState {
  fileName: string | null;
  pdfBytes: Uint8Array | null;
  options: RasterOptions;
  pages: RenderedLabelPage[];
  isRendering: boolean;
  labelType: LabelType;
  density: number;
  copies: number;
  filterKnownUsbVendors: boolean;
}

const state: AppState = {
  fileName: null,
  pdfBytes: null,
  options: { ...DEFAULT_RASTER_OPTIONS },
  pages: [],
  isRendering: false,
  labelType: DEFAULT_LABEL_TYPE,
  density: DEFAULT_PRINT_DENSITY,
  copies: 1,
  filterKnownUsbVendors: true,
};

let renderSeq = 0;
const printer = new B1PrinterController();
const capabilities = detectBrowserTransportCapabilities();

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

function parseLabelType(value: string): LabelType {
  switch (value) {
    case String(LabelType.Transparent):
      return LabelType.Transparent;
    case String(LabelType.Black):
      return LabelType.Black;
    default:
      return LabelType.WithGaps;
  }
}

const appRoot = document.querySelector<HTMLDivElement>("#app");
if (!appRoot) {
  throw new Error("Missing #app container in index.html");
}

const capabilityWarningHtml =
  !capabilities.webSerialSupported && !capabilities.webBluetoothSupported
    ? `<div class="browser-warning" role="alert">
        <strong>Browser Hardware API Unavailable:</strong> Neither WebSerial nor WebBluetooth is enabled in this browser.
        Open this app in <strong>Microsoft Edge</strong> or <strong>Google Chrome</strong> over <code>http://localhost</code> to print to Niimbot B1 on COM9 or BLE.
      </div>`
    : !capabilities.isSecureContext
      ? `<div class="browser-warning" role="alert">
          <strong>Insecure Origin:</strong> WebSerial and WebBluetooth require <code>http://localhost</code> or <code>https://</code>.
        </div>`
      : "";

appRoot.innerHTML = `
  <div class="app-shell">
    <header class="topbar">
      <div>
        <h1>Niimbot B1 — 50×50 mm PDF Label Printer</h1>
        <p class="topbar-sub">203 DPI · 384×400 px active thermal head · Optical Gap Sensor (WithGaps = 1)</p>
      </div>
      <div class="hardware-badge" role="status">
        <span id="hw-dot" class="hardware-dot" aria-hidden="true"></span>
        <span id="hw-badge-text">Printer: Disconnected</span>
      </div>
    </header>

    ${capabilityWarningHtml}

    <main class="workspace-grid">
      <div class="sidebar-stack">
        <section class="panel" aria-label="Niimbot B1 Hardware Transport">
          <div class="panel-title-row">
            <h2 class="panel-title">Hardware Transport (USB COM9 / BLE)</h2>
            <button id="refresh-telemetry-btn" type="button" class="btn btn-sm" disabled>Refresh</button>
          </div>

          <div class="btn-grid-2">
            <button id="connect-usb-btn" type="button" class="btn btn-primary" ${capabilities.webSerialSupported ? "" : "disabled"}>
              Connect USB (COM9)
            </button>
            <button id="connect-ble-btn" type="button" class="btn" ${capabilities.webBluetoothSupported ? "" : "disabled"}>
              Connect Bluetooth
            </button>
          </div>

          <div class="btn-grid-2">
            <label class="checkbox-row" title="Filters the browser serial picker to Niimbot VID_3513 (COM9) and CH34x VID_1A86">
              <input id="usb-filter-toggle" type="checkbox" checked />
              <span>Filter USB VID_3513</span>
            </label>
            <button id="disconnect-btn" type="button" class="btn btn-sm" disabled>Disconnect</button>
          </div>

          <div id="model-warning" class="status-banner is-warn" style="display: none;"></div>

          <div class="telemetry-grid" aria-live="polite">
            <div class="telemetry-item">
              <span class="telemetry-key">Model / Head</span>
              <span id="tel-model" class="telemetry-val">—</span>
            </div>
            <div class="telemetry-item">
              <span class="telemetry-key">Battery</span>
              <span id="tel-battery" class="telemetry-val">—</span>
            </div>
            <div class="telemetry-item full-span">
              <span class="telemetry-key">Cover &amp; Paper</span>
              <span id="tel-sensors" class="telemetry-val">—</span>
            </div>
            <div class="telemetry-item full-span">
              <span class="telemetry-key">RFID / Spool Roll</span>
              <span id="tel-spool" class="telemetry-val">Disconnected</span>
            </div>
          </div>

          <div class="control-group">
            <label class="control-label" for="label-type-select">Label Sensor Mode</label>
            <select id="label-type-select">
              <option value="1" selected>Gap Sensor — Die-Cut Stickers (WithGaps = 1)</option>
              <option value="5">Transparent Gap Stickers (Transparent = 5)</option>
              <option value="2">Black Mark Roll (Black = 2)</option>
            </select>
          </div>

          <div class="inline-fields">
            <div class="control-group">
              <div class="threshold-row">
                <label class="control-label" for="density-slider">Thermal Density</label>
                <span id="density-value" class="mono-value">${state.density} / 5</span>
              </div>
              <input id="density-slider" type="range" min="1" max="5" step="1" value="${state.density}" />
            </div>

            <div class="control-group">
              <label class="control-label" for="copies-input">Copies (1–20)</label>
              <input id="copies-input" type="number" min="1" max="20" step="1" value="${state.copies}" />
            </div>
          </div>

          <div class="control-group">
            <span class="control-label">Gap Alignment &amp; Optical Calibration</span>
            <div class="btn-grid-2">
              <button
                id="feed-gap-btn"
                type="button"
                class="btn"
                title="Recommended: Feeds 1 blank sticker (zero thermal heat) to align the next die-cut gap with the tear bar"
                disabled
              >
                Test Gap Feed (1 Label)
              </button>
              <button
                id="calibrate-sensor-btn"
                type="button"
                class="btn"
                title="Factory optical voltage calibration (0x8E): feeds ~15 cm (2-3 labels) on B1"
                disabled
              >
                Calibrate Sensor (0x8E)
              </button>
            </div>
            <span class="control-hint">Use "Test Gap Feed" to align 1 sticker to the tear bar; "Calibrate Sensor" feeds ~2–3 labels.</span>
          </div>

          <div id="print-progress-box" class="progress-box" style="display: none;">
            <div id="print-progress-label">Idle</div>
            <div class="progress-track">
              <div id="print-progress-fill" class="progress-fill"></div>
            </div>
          </div>

          <div id="hw-status-banner" class="status-banner">Connect Niimbot B1 via USB (COM9) or Bluetooth BLE.</div>
        </section>

        <section class="panel" aria-label="PDF and Raster Controls">
          <h2 class="panel-title">PDF Source &amp; 1-Bit Rasterization</h2>

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
      </div>

      <section class="panel" aria-label="Label Previews">
        <div class="preview-header">
          <h2>50×50 mm Thermal Sticker Previews</h2>
          <span id="page-count-badge" class="mono-value">0 pages</span>
        </div>
        <div id="preview-container" class="empty-state">
          Upload a PDF label sheet to preview the 1-bit 384×400 px output and print individual 5×5 cm stickers.
        </div>
      </section>
    </main>

    <details class="protocol-drawer" open>
      <summary>Live B1 Protocol &amp; Print Lifecycle Log</summary>
      <div class="protocol-drawer-toolbar">
        <span>Shows WebSerial/BLE negotiation, RFID/Heartbeat checks, SetLabelType(1), and B1PrintTask packet states.</span>
        <button id="clear-log-btn" type="button" class="btn btn-sm">Clear View</button>
      </div>
      <div id="protocol-log" class="protocol-log-output" role="log" aria-live="polite"></div>
    </details>
  </div>
`;

// Hardware DOM elements
const hwDot = document.querySelector<HTMLSpanElement>("#hw-dot")!;
const hwBadgeText = document.querySelector<HTMLSpanElement>("#hw-badge-text")!;
const connectUsbBtn = document.querySelector<HTMLButtonElement>("#connect-usb-btn")!;
const connectBleBtn = document.querySelector<HTMLButtonElement>("#connect-ble-btn")!;
const usbFilterToggle = document.querySelector<HTMLInputElement>("#usb-filter-toggle")!;
const disconnectBtn = document.querySelector<HTMLButtonElement>("#disconnect-btn")!;
const refreshTelemetryBtn = document.querySelector<HTMLButtonElement>("#refresh-telemetry-btn")!;
const modelWarningEl = document.querySelector<HTMLDivElement>("#model-warning")!;
const telModelEl = document.querySelector<HTMLSpanElement>("#tel-model")!;
const telBatteryEl = document.querySelector<HTMLSpanElement>("#tel-battery")!;
const telSensorsEl = document.querySelector<HTMLSpanElement>("#tel-sensors")!;
const telSpoolEl = document.querySelector<HTMLSpanElement>("#tel-spool")!;
const labelTypeSelect = document.querySelector<HTMLSelectElement>("#label-type-select")!;
const densitySlider = document.querySelector<HTMLInputElement>("#density-slider")!;
const densityValueEl = document.querySelector<HTMLSpanElement>("#density-value")!;
const copiesInput = document.querySelector<HTMLInputElement>("#copies-input")!;
const feedGapBtn = document.querySelector<HTMLButtonElement>("#feed-gap-btn")!;
const calibrateSensorBtn = document.querySelector<HTMLButtonElement>("#calibrate-sensor-btn")!;
const printProgressBox = document.querySelector<HTMLDivElement>("#print-progress-box")!;
const printProgressLabel = document.querySelector<HTMLDivElement>("#print-progress-label")!;
const printProgressFill = document.querySelector<HTMLDivElement>("#print-progress-fill")!;
const hwStatusBanner = document.querySelector<HTMLDivElement>("#hw-status-banner")!;
const protocolLogEl = document.querySelector<HTMLDivElement>("#protocol-log")!;
const clearLogBtn = document.querySelector<HTMLButtonElement>("#clear-log-btn")!;

// Rasterizer DOM elements
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

function setPdfStatus(message: string, isError = false): void {
  statusBanner.textContent = message;
  statusBanner.classList.toggle("is-error", isError);
}

function setHwStatus(message: string, isError = false): void {
  hwStatusBanner.textContent = message;
  hwStatusBanner.classList.toggle("is-error", isError);
}

function appendLogEntry(entry: ProtocolLogEntry): void {
  const line = document.createElement("div");
  if (entry.level === "warn") {
    line.className = "log-line-warn";
  } else if (entry.level === "error") {
    line.className = "log-line-error";
  }
  line.textContent = `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}`;
  protocolLogEl.append(line);
  protocolLogEl.scrollTop = protocolLogEl.scrollHeight;
}

function syncCardPrintButtons(): void {
  const canPrint = printer.getState() === "ready" && !state.isRendering;
  const cardButtons = document.querySelectorAll<HTMLButtonElement>(".card-print-btn");
  for (const btn of cardButtons) {
    btn.disabled = !canPrint;
    btn.textContent =
      printer.getState() === "printing"
        ? "Printing..."
        : printer.getState() === "ready"
          ? "Print This Sticker (5×5 cm)"
          : "Connect B1 to Print";
  }
}

function updateHardwareUi(snap: PrinterTelemetrySnapshot): void {
  const isBusy =
    snap.state === "connecting" ||
    snap.state === "calibrating" ||
    snap.state === "printing";
  const isReady = snap.state === "ready";
  const isConnected = isReady || snap.state === "calibrating" || snap.state === "printing";

  hwDot.className = "hardware-dot";
  if (isReady) {
    hwDot.classList.add("is-ready");
  } else if (isBusy) {
    hwDot.classList.add("is-busy");
  } else if (snap.state === "error") {
    hwDot.classList.add("is-error");
  }

  const transportTag = snap.transport ? snap.transport.toUpperCase() : "";
  hwBadgeText.textContent = isConnected
    ? `${snap.deviceName ?? "Niimbot B1"} · ${snap.state.toUpperCase()}`
    : snap.state === "connecting"
      ? `Connecting (${transportTag})...`
      : snap.state === "error"
        ? "Printer: Error"
        : "Printer: Disconnected";

  connectUsbBtn.disabled = !capabilities.webSerialSupported || isBusy;
  connectBleBtn.disabled = !capabilities.webBluetoothSupported || isBusy;
  disconnectBtn.disabled = !isConnected && snap.state !== "error";
  refreshTelemetryBtn.disabled = !isReady;
  feedGapBtn.disabled = !isReady;
  calibrateSensorBtn.disabled = !isReady;

  if (snap.modelWarning) {
    modelWarningEl.style.display = "block";
    modelWarningEl.textContent = snap.modelWarning;
  } else {
    modelWarningEl.style.display = "none";
  }

  if (!isConnected) {
    telModelEl.textContent = "—";
    telBatteryEl.textContent = "—";
    telSensorsEl.textContent = "—";
    telSpoolEl.textContent = "Disconnected";
  } else {
    const fw = snap.firmwareVersion ? ` (FW ${snap.firmwareVersion})` : "";
    telModelEl.textContent = `${snap.modelName ?? "B1"} · ${snap.printheadPixels ?? 384}px${fw}`;
    telBatteryEl.textContent = snap.batteryPct !== null ? `${snap.batteryPct}%` : "n/a";

    const lidText =
      snap.lidClosed === null ? "Lid: n/a" : snap.lidClosed ? "Lid: Closed" : "Lid: OPEN (!)";
    const paperText =
      snap.paperInserted === null
        ? "Paper: n/a"
        : snap.paperInserted
          ? "Paper: Loaded"
          : "Paper: EMPTY (!)";
    telSensorsEl.textContent = `${lidText} · ${paperText}`;
    telSpoolEl.textContent = snap.spoolSummary;
  }

  if (snap.state !== "printing") {
    printProgressBox.style.display = "none";
  }

  syncCardPrintButtons();
}

function updateProgressUi(progress: PrintLiveProgress): void {
  printProgressBox.style.display = "flex";
  const pct =
    progress.phase === "transfer"
      ? progress.packetTransferPct
      : Math.max(progress.pagePrintPct, progress.pageFeedPct);
  printProgressFill.style.width = `${Math.min(100, Math.max(0, pct))}%`;
  printProgressLabel.textContent =
    progress.phase === "init"
      ? "Initializing B1 printhead & gap sensor..."
      : progress.phase === "transfer"
        ? `Uploading 384×400 bitmap: ${progress.packetTransferPct}%`
        : progress.phase === "printing"
          ? `Printing copy ${progress.currentPage}/${progress.totalPages} · Print ${progress.pagePrintPct}% · Feed ${progress.pageFeedPct}%`
          : progress.phase === "cleanup"
            ? "Finalizing printEnd()..."
            : "Completed";
}

function updateThresholdVisibility(): void {
  const isThreshold = state.options.ditherMode === "threshold";
  thresholdGroup.style.display = isThreshold ? "flex" : "none";
}

async function handlePrintSinglePage(page: RenderedLabelPage): Promise<void> {
  setHwStatus(
    `Printing Page ${page.pageNumber} (${state.copies} ${state.copies === 1 ? "copy" : "copies"}, density ${state.density}, LabelType=${state.labelType})...`,
  );
  try {
    await printer.printSingleLabel(page.encodedImage, {
      density: state.density,
      labelType: state.labelType,
      copies: state.copies,
    });
    setHwStatus(
      `Printed Page ${page.pageNumber} (${state.copies} ${state.copies === 1 ? "sticker" : "stickers"}) cleanly.`,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    setHwStatus(`Print failed on Page ${page.pageNumber}: ${msg}`, true);
  }
}

function renderPreviewCards(): void {
  pageCountBadge.textContent = `${state.pages.length} ${state.pages.length === 1 ? "page" : "pages"}`;

  if (state.pages.length === 0) {
    previewContainer.className = "empty-state";
    previewContainer.textContent =
      "Upload a PDF label sheet to preview the 1-bit 384×400 px output and print individual 5×5 cm stickers.";
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

    const printBtn = document.createElement("button");
    printBtn.type = "button";
    printBtn.className = "btn btn-primary card-print-btn";
    printBtn.addEventListener("click", () => {
      void handlePrintSinglePage(page);
    });

    card.append(head, frame, meta, printBtn);
    previewContainer.append(card);
  }

  syncCardPrintButtons();
}

async function runRasterPipeline(): Promise<void> {
  if (!state.pdfBytes) {
    return;
  }

  const currentSeq = ++renderSeq;
  state.isRendering = true;
  syncCardPrintButtons();
  setPdfStatus(`Rasterizing ${state.fileName ?? "PDF"} at 384×400 px...`);

  try {
    const renderedPages = await rasterizePdfDocument(state.pdfBytes, state.options);
    if (currentSeq !== renderSeq) {
      return;
    }
    state.pages = renderedPages;
    state.isRendering = false;
    renderPreviewCards();
    setPdfStatus(
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
    setPdfStatus(`PDF rasterization failed: ${message}`, true);
  }
}

async function handleSelectedFile(file: File): Promise<void> {
  if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
    setPdfStatus(`Unsupported file "${file.name}". Please choose a .pdf file.`, true);
    return;
  }

  const buffer = await file.arrayBuffer();
  state.fileName = file.name;
  state.pdfBytes = new Uint8Array(buffer);
  fileMetaEl.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
  await runRasterPipeline();
}

// Subscribe to B1 controller events
printer.onLog(appendLogEntry);
printer.onStateChange(updateHardwareUi);
printer.onProgress(updateProgressUi);

// Hardware UI listeners
usbFilterToggle.addEventListener("change", () => {
  state.filterKnownUsbVendors = usbFilterToggle.checked;
});

connectUsbBtn.addEventListener("click", async () => {
  setHwStatus("Opening WebSerial port picker (select COM9 / USB Serial Device)...");
  try {
    const connected = await printer.connectUsb({
      filterKnownVendors: state.filterKnownUsbVendors,
    });
    if (connected) {
      setHwStatus("Connected to Niimbot B1 over USB Serial.");
    } else {
      setHwStatus("USB connection cancelled.");
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    setHwStatus(msg, true);
  }
});

connectBleBtn.addEventListener("click", async () => {
  setHwStatus("Opening WebBluetooth device picker (select B1-...)...");
  try {
    const connected = await printer.connectBle();
    if (connected) {
      setHwStatus("Connected to Niimbot B1 over Bluetooth BLE.");
    } else {
      setHwStatus("Bluetooth connection cancelled.");
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    setHwStatus(msg, true);
  }
});

disconnectBtn.addEventListener("click", async () => {
  await printer.disconnect();
  setHwStatus("Printer disconnected and port released.");
});

refreshTelemetryBtn.addEventListener("click", async () => {
  try {
    await printer.refreshTelemetry();
    setHwStatus("Telemetry & RFID spool status refreshed.");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    setHwStatus(msg, true);
  }
});

labelTypeSelect.addEventListener("change", () => {
  state.labelType = parseLabelType(labelTypeSelect.value);
});

densitySlider.addEventListener("input", () => {
  const val = Number.parseInt(densitySlider.value, 10);
  state.density = val;
  densityValueEl.textContent = `${val} / 5`;
});

copiesInput.addEventListener("change", () => {
  const parsed = Number.parseInt(copiesInput.value, 10);
  const clamped = Number.isFinite(parsed) ? Math.max(1, Math.min(20, parsed)) : 1;
  state.copies = clamped;
  copiesInput.value = String(clamped);
});

feedGapBtn.addEventListener("click", async () => {
  setHwStatus("Advancing 1 blank sticker to optical die-cut gap...");
  try {
    await printer.feedBlankToGap(state.labelType);
    setHwStatus("Gap alignment feed complete — verify tear bar sits on the sticker gap.");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    setHwStatus(`Gap alignment feed failed: ${msg}`, true);
  }
});

calibrateSensorBtn.addEventListener("click", async () => {
  setHwStatus("Running B1 optical gap calibration (0x8E — feeds ~2-3 labels)...");
  try {
    await printer.calibrateGapSensor(state.labelType);
    setHwStatus("Optical gap sensor calibration finished.");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    setHwStatus(`Gap calibration failed: ${msg}`, true);
  }
});

clearLogBtn.addEventListener("click", () => {
  protocolLogEl.replaceChildren();
});

// PDF & Rasterizer UI listeners
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
