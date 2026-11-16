import { LabelType } from "@mmote/niimbluelib";
import "./style.css";
import type { DitherMode, FitMode, RotationDegrees } from "./pdf/binarizer.ts";
import {
  DEFAULT_RASTER_OPTIONS,
  MAX_PDF_BYTES,
  type RasterOptions,
  type RenderedLabelPage,
  rasterizePdfDocument,
} from "./pdf/rasterizer.ts";
import {
  B1PrinterController,
  DEFAULT_LABEL_TYPE,
  DEFAULT_PRINT_DENSITY,
  detectBrowserTransportCapabilities,
  type PrinterTelemetrySnapshot,
  type PrintLiveProgress,
  type ProtocolLogEntry,
} from "./printer/b1Client.ts";

interface AppState {
  fileName: string | null;
  pdfBytes: Uint8Array | null;
  options: RasterOptions;
  pages: RenderedLabelPage[];
  selectedPageNumbers: Set<number>;
  isRendering: boolean;
  labelType: LabelType;
  density: number;
  copies: number;
  filterKnownUsbVendors: boolean;
}

interface ElementProps {
  id?: string;
  className?: string;
  text?: string;
  title?: string;
  role?: string;
  type?: string;
  attrs?: Record<string, string>;
  disabled?: boolean;
  checked?: boolean;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: ElementProps = {},
  ...children: Array<Node | string>
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (props.id) node.id = props.id;
  if (props.className) node.className = props.className;
  if (props.text !== undefined) node.textContent = props.text;
  if (props.title) node.title = props.title;
  if (props.role) node.setAttribute("role", props.role);
  if (props.type && "type" in node) {
    (node as HTMLButtonElement | HTMLInputElement).type = props.type;
  }
  if (props.disabled !== undefined && "disabled" in node) {
    (node as HTMLButtonElement | HTMLInputElement | HTMLSelectElement).disabled = props.disabled;
  }
  if (props.checked !== undefined && node instanceof HTMLInputElement) {
    node.checked = props.checked;
  }
  if (props.attrs) {
    for (const [key, val] of Object.entries(props.attrs)) {
      node.setAttribute(key, val);
    }
  }
  for (const child of children) {
    node.append(child);
  }
  return node;
}

const state: AppState = {
  fileName: null,
  pdfBytes: null,
  options: { ...DEFAULT_RASTER_OPTIONS },
  pages: [],
  selectedPageNumbers: new Set<number>(),
  isRendering: false,
  labelType: DEFAULT_LABEL_TYPE,
  density: DEFAULT_PRINT_DENSITY,
  copies: 1,
  filterKnownUsbVendors: true,
};

let renderSeq = 0;
let activeBatchAbort: AbortController | null = null;
let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;

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

// Build DOM strictly via typed element helpers (zero innerHTML / zero inline styles)
const installPwaBtn = el("button", {
  id: "install-pwa-btn",
  type: "button",
  className: "btn btn-sm is-hidden",
  text: "Install Desktop App",
});
const hwDot = el("span", {
  id: "hw-dot",
  className: "hardware-dot",
  attrs: { "aria-hidden": "true" },
});
const hwBadgeText = el("span", {
  id: "hw-badge-text",
  text: "Printer: Disconnected",
});

const topbar = el(
  "header",
  { className: "topbar" },
  el(
    "div",
    {},
    el("h1", { text: "Niimbot B1 — 50×50 mm PDF Label Printer" }),
    el("p", {
      className: "topbar-sub",
      text: "Portable x64 & ARM64 Windows · Zero-Driver USB-C & Bluetooth BLE · 203 DPI (384×400 px)",
    }),
  ),
  el(
    "div",
    { className: "topbar-actions" },
    installPwaBtn,
    el("div", { className: "hardware-badge", role: "status" }, hwDot, hwBadgeText),
  ),
);

const capabilityWarningNode =
  !capabilities.webSerialSupported && !capabilities.webBluetoothSupported
    ? el(
        "div",
        { className: "browser-warning", role: "alert" },
        el("strong", { text: "Browser Hardware API Unavailable: " }),
        "Neither WebSerial nor WebBluetooth is enabled in this browser. Open this app in ",
        el("strong", { text: "Microsoft Edge" }),
        " or ",
        el("strong", { text: "Google Chrome" }),
        " over ",
        el("code", { text: "https://" }),
        " or ",
        el("code", { text: "http://localhost" }),
        " on any Windows x64/ARM64 PC.",
      )
    : !capabilities.isSecureContext
      ? el(
          "div",
          { className: "browser-warning", role: "alert" },
          el("strong", { text: "Insecure Origin: " }),
          "WebSerial and WebBluetooth require ",
          el("code", { text: "https://" }),
          " or ",
          el("code", { text: "http://localhost" }),
          ".",
        )
      : null;

const refreshTelemetryBtn = el("button", {
  id: "refresh-telemetry-btn",
  type: "button",
  className: "btn btn-sm",
  text: "Refresh",
  disabled: true,
});
const connectUsbBtn = el("button", {
  id: "connect-usb-btn",
  type: "button",
  className: "btn btn-primary",
  text: "Connect USB-C (Any Windows PC)",
  disabled: !capabilities.webSerialSupported,
});
const connectBleBtn = el("button", {
  id: "connect-ble-btn",
  type: "button",
  className: "btn",
  text: "Connect Bluetooth (BLE)",
  disabled: !capabilities.webBluetoothSupported,
});
const usbFilterToggle = el("input", {
  id: "usb-filter-toggle",
  type: "checkbox",
  checked: true,
});
const disconnectBtn = el("button", {
  id: "disconnect-btn",
  type: "button",
  className: "btn btn-sm",
  text: "Disconnect",
  disabled: true,
});
const modelWarningEl = el("div", {
  id: "model-warning",
  className: "status-banner is-warn is-hidden",
});
const telModelEl = el("span", { id: "tel-model", className: "telemetry-val", text: "—" });
const telBatteryEl = el("span", { id: "tel-battery", className: "telemetry-val", text: "—" });
const telSensorsEl = el("span", { id: "tel-sensors", className: "telemetry-val", text: "—" });
const telSpoolEl = el("span", {
  id: "tel-spool",
  className: "telemetry-val",
  text: "Disconnected",
});

const labelTypeSelect = el(
  "select",
  { id: "label-type-select" },
  el("option", {
    attrs: { value: "1", selected: "selected" },
    text: "Gap Sensor — Die-Cut Stickers (WithGaps = 1)",
  }),
  el("option", {
    attrs: { value: "5" },
    text: "Transparent Gap Stickers (Transparent = 5)",
  }),
  el("option", {
    attrs: { value: "2" },
    text: "Black Mark Roll (Black = 2)",
  }),
);
const densityValueEl = el("span", {
  id: "density-value",
  className: "mono-value",
  text: `${state.density} / 5`,
});
const densitySlider = el("input", {
  id: "density-slider",
  type: "range",
  attrs: { min: "1", max: "5", step: "1", value: String(state.density) },
});
const copiesInput = el("input", {
  id: "copies-input",
  type: "number",
  attrs: { min: "1", max: "20", step: "1", value: String(state.copies) },
});
const feedGapBtn = el("button", {
  id: "feed-gap-btn",
  type: "button",
  className: "btn",
  text: "Test Gap Feed (1 Label)",
  title:
    "Recommended: Feeds 1 blank sticker (zero thermal heat) to align the next die-cut gap with the tear bar",
  disabled: true,
});
const calibrateSensorBtn = el("button", {
  id: "calibrate-sensor-btn",
  type: "button",
  className: "btn",
  text: "Calibrate Sensor (0x8E)",
  title: "Factory optical voltage calibration (0x8E): feeds ~15 cm (2-3 labels) on B1",
  disabled: true,
});
const printProgressLabel = el("div", { id: "print-progress-label", text: "Idle" });
const printProgressBar = el("progress", {
  id: "print-progress-bar",
  className: "progress-bar",
  attrs: { max: "100", value: "0" },
});
const printProgressBox = el(
  "div",
  { id: "print-progress-box", className: "progress-box is-hidden" },
  printProgressLabel,
  printProgressBar,
);
const hwStatusBanner = el("div", {
  id: "hw-status-banner",
  className: "status-banner",
  text: "Connect Niimbot B1 via USB-C or Bluetooth BLE.",
});

const hardwarePanel = el(
  "section",
  { className: "panel", attrs: { "aria-label": "Niimbot B1 Hardware Transport" } },
  el(
    "div",
    { className: "panel-title-row" },
    el("h2", { className: "panel-title", text: "Hardware Transport (USB-C / BLE)" }),
    refreshTelemetryBtn,
  ),
  el("div", { className: "btn-grid-2" }, connectUsbBtn, connectBleBtn),
  el(
    "div",
    { className: "btn-grid-2" },
    el(
      "label",
      {
        className: "checkbox-row",
        title:
          "Filters WebSerial picker to Niimbot VID_3513 (built-in Windows usbser.sys) and CH34x VID_1A86",
      },
      usbFilterToggle,
      el("span", { text: "Filter Niimbot USB (VID_3513)" }),
    ),
    disconnectBtn,
  ),
  el(
    "details",
    { className: "guide-callout" },
    el("summary", { text: "BLE & Multi-PC Connection Guide (3 Rules)" }),
    el(
      "ol",
      {},
      el(
        "li",
        {},
        el("strong", { text: "Unplug PC USB-C to use Bluetooth: " }),
        "B1 prioritizes USB data over BLE when plugged into a computer port (battery or wall brick is fine).",
      ),
      el(
        "li",
        {},
        el("strong", { text: "Disconnect phone / desktop apps: " }),
        "B1 accepts only 1 active BLE or Serial connection at a time.",
      ),
      el(
        "li",
        {},
        el("strong", { text: "Use Edge or Chrome (HTTPS / localhost): " }),
        "Works on any Intel/AMD x64 or Snapdragon ARM64 Windows PC with zero drivers.",
      ),
    ),
  ),
  modelWarningEl,
  el(
    "div",
    { className: "telemetry-grid", attrs: { "aria-live": "polite" } },
    el(
      "div",
      { className: "telemetry-item" },
      el("span", { className: "telemetry-key", text: "Model / Head" }),
      telModelEl,
    ),
    el(
      "div",
      { className: "telemetry-item" },
      el("span", { className: "telemetry-key", text: "Battery / Link" }),
      telBatteryEl,
    ),
    el(
      "div",
      { className: "telemetry-item full-span" },
      el("span", { className: "telemetry-key", text: "Cover & Paper" }),
      telSensorsEl,
    ),
    el(
      "div",
      { className: "telemetry-item full-span" },
      el("span", { className: "telemetry-key", text: "RFID / Spool Roll" }),
      telSpoolEl,
    ),
  ),
  el(
    "div",
    { className: "control-group" },
    el("label", {
      className: "control-label",
      attrs: { for: "label-type-select" },
      text: "Label Sensor Mode",
    }),
    labelTypeSelect,
  ),
  el(
    "div",
    { className: "inline-fields" },
    el(
      "div",
      { className: "control-group" },
      el(
        "div",
        { className: "threshold-row" },
        el("label", {
          className: "control-label",
          attrs: { for: "density-slider" },
          text: "Thermal Density",
        }),
        densityValueEl,
      ),
      densitySlider,
    ),
    el(
      "div",
      { className: "control-group" },
      el("label", {
        className: "control-label",
        attrs: { for: "copies-input" },
        text: "Copies / Page",
      }),
      copiesInput,
    ),
  ),
  el(
    "div",
    { className: "control-group" },
    el("span", { className: "control-label", text: "Gap Alignment & Optical Calibration" }),
    el("div", { className: "btn-grid-2" }, feedGapBtn, calibrateSensorBtn),
    el("span", {
      className: "control-hint",
      text: 'Use "Test Gap Feed" to align 1 sticker to the tear bar; "Calibrate Sensor" feeds ~2–3 labels.',
    }),
  ),
  printProgressBox,
  hwStatusBanner,
);

const fileInput = el("input", {
  id: "pdf-input",
  type: "file",
  className: "hidden-input",
  attrs: { accept: "application/pdf,.pdf" },
});
const dropzone = el(
  "div",
  {
    id: "dropzone",
    className: "dropzone",
    role: "button",
    attrs: { tabindex: "0", "aria-label": "Select or drop PDF file" },
  },
  el("div", { className: "dropzone-title", text: "Drop 50×50 mm PDF here or click to browse" }),
  el("div", {
    className: "dropzone-hint",
    text: "Single or multi-page PDF · Max 25 MB / 100 pages · Scripting disabled",
  }),
  fileInput,
);
const fileMetaEl = el("div", { id: "file-meta", className: "file-meta", text: "No PDF loaded" });
const fitModeSelect = el(
  "select",
  { id: "fit-mode" },
  el("option", { attrs: { value: "fit" }, text: "Scale to Fit (384×400 px - Safe)" }),
  el("option", {
    attrs: { value: "crop-bleed" },
    text: "1:1 Physical Crop (Trim 1mm side bleed)",
  }),
);
const ditherModeSelect = el(
  "select",
  { id: "dither-mode" },
  el("option", {
    attrs: { value: "threshold" },
    text: "Sharp Threshold (Text / QR / Barcodes)",
  }),
  el("option", {
    attrs: { value: "atkinson" },
    text: "Atkinson Dither (Logos / Grayscale)",
  }),
);
const thresholdValueEl = el("span", {
  id: "threshold-value",
  className: "mono-value",
  text: String(state.options.threshold),
});
const thresholdSlider = el("input", {
  id: "threshold-slider",
  type: "range",
  attrs: { min: "80", max: "230", step: "1", value: String(state.options.threshold) },
});
const thresholdGroup = el(
  "div",
  { id: "threshold-group", className: "control-group" },
  el(
    "div",
    { className: "threshold-row" },
    el("label", {
      className: "control-label",
      attrs: { for: "threshold-slider" },
      text: "Luminance Threshold",
    }),
    thresholdValueEl,
  ),
  thresholdSlider,
);

const rotationButtons = (["0", "90", "180", "270"] as const).map((deg) =>
  el("button", {
    type: "button",
    className: deg === "0" ? "rot-btn is-active" : "rot-btn",
    text: `${deg}°`,
    attrs: { "data-rot": deg },
  }),
);
const invertToggle = el("input", { id: "invert-toggle", type: "checkbox" });
const statusBanner = el("div", {
  id: "status-banner",
  className: "status-banner",
  text: "Ready for PDF input.",
});

const rasterPanel = el(
  "section",
  { className: "panel", attrs: { "aria-label": "PDF and Raster Controls" } },
  el("h2", { className: "panel-title", text: "PDF Source & 1-Bit Rasterization" }),
  dropzone,
  fileMetaEl,
  el(
    "div",
    { className: "control-group" },
    el("label", {
      className: "control-label",
      attrs: { for: "fit-mode" },
      text: "Sizing Mode",
    }),
    fitModeSelect,
  ),
  el(
    "div",
    { className: "control-group" },
    el("label", {
      className: "control-label",
      attrs: { for: "dither-mode" },
      text: "1-Bit Binarization Mode",
    }),
    ditherModeSelect,
  ),
  thresholdGroup,
  el(
    "div",
    { className: "control-group" },
    el("span", { className: "control-label", text: "Rotation" }),
    el(
      "div",
      {
        id: "rotation-group",
        className: "rotation-group",
        role: "group",
        attrs: { "aria-label": "Page rotation" },
      },
      ...rotationButtons,
    ),
  ),
  el(
    "label",
    { className: "checkbox-row" },
    invertToggle,
    el("span", { text: "Invert polarity (white on black)" }),
  ),
  statusBanner,
);

const pageCountBadge = el("span", {
  id: "page-count-badge",
  className: "mono-value",
  text: "0 pages",
});
const selectAllBtn = el("button", {
  id: "select-all-btn",
  type: "button",
  className: "btn btn-sm",
  text: "Select All",
});
const selectNoneBtn = el("button", {
  id: "select-none-btn",
  type: "button",
  className: "btn btn-sm",
  text: "Clear Selection",
});
const batchSummaryEl = el("span", {
  id: "batch-summary",
  className: "batch-summary",
  text: "0 selected",
});
const cancelBatchBtn = el("button", {
  id: "cancel-batch-btn",
  type: "button",
  className: "btn btn-danger btn-sm is-hidden",
  text: "Stop After Current Sticker",
});
const printBatchBtn = el("button", {
  id: "print-batch-btn",
  type: "button",
  className: "btn btn-primary",
  text: "Print All Pages (0 Stickers)",
  disabled: true,
});
const batchToolbar = el(
  "div",
  { id: "batch-toolbar", className: "batch-toolbar is-hidden" },
  el("div", { className: "batch-toolbar-left" }, selectAllBtn, selectNoneBtn, batchSummaryEl),
  el("div", { className: "batch-toolbar-right" }, cancelBatchBtn, printBatchBtn),
);
const previewContainer = el("div", {
  id: "preview-container",
  className: "empty-state",
  text: "Upload a single- or multi-page 50×50 mm PDF to preview 1-bit 384×400 px stickers and print individually or as a batch.",
});

const previewPanel = el(
  "section",
  { className: "panel", attrs: { "aria-label": "Label Previews and Batch Queue" } },
  el(
    "div",
    { className: "preview-header" },
    el("h2", { text: "50×50 mm Thermal Sticker Previews" }),
    pageCountBadge,
  ),
  batchToolbar,
  previewContainer,
);

const clearLogBtn = el("button", {
  id: "clear-log-btn",
  type: "button",
  className: "btn btn-sm",
  text: "Clear View",
});
const protocolLogEl = el("div", {
  id: "protocol-log",
  className: "protocol-log-output",
  role: "log",
  attrs: { "aria-live": "polite" },
});
const protocolDrawer = el(
  "details",
  { className: "protocol-drawer", attrs: { open: "" } },
  el("summary", { text: "Live B1 Protocol & Batch Lifecycle Log" }),
  el(
    "div",
    { className: "protocol-drawer-toolbar" },
    el("span", {
      text: "Shows dynamic USB WebSerial / BLE GATT negotiation, pacing, RFID/Heartbeat, and B1PrintTask batch states.",
    }),
    clearLogBtn,
  ),
  protocolLogEl,
);

const workspaceGrid = el(
  "main",
  { className: "workspace-grid" },
  el("div", { className: "sidebar-stack" }, hardwarePanel, rasterPanel),
  previewPanel,
);

const appShell = el("div", { className: "app-shell" }, topbar);
if (capabilityWarningNode) {
  appShell.append(capabilityWarningNode);
}
appShell.append(workspaceGrid, protocolDrawer);
appRoot.replaceChildren(appShell);

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

function getSelectedPages(): RenderedLabelPage[] {
  return state.pages.filter((p) => state.selectedPageNumbers.has(p.pageNumber));
}

function syncPrintAndBatchControls(): void {
  const pState = printer.getState();
  const isReady = pState === "ready" && !state.isRendering;
  const isPrinting = pState === "printing";

  const cardButtons = document.querySelectorAll<HTMLButtonElement>(".card-print-btn");
  for (const btn of cardButtons) {
    btn.disabled = !isReady;
    btn.textContent = isPrinting
      ? "Printing..."
      : pState === "ready"
        ? "Print This Sticker (5×5 cm)"
        : "Connect B1 to Print";
  }

  const cardChecks = document.querySelectorAll<HTMLInputElement>(".card-batch-check");
  for (const chk of cardChecks) {
    chk.disabled = isPrinting;
  }

  if (state.pages.length === 0) {
    batchToolbar.classList.add("is-hidden");
    return;
  }

  batchToolbar.classList.remove("is-hidden");
  const selectedCount = getSelectedPages().length;
  const totalStickers = selectedCount * state.copies;

  batchSummaryEl.textContent = `${selectedCount}/${state.pages.length} pages selected · ${totalStickers} ${totalStickers === 1 ? "sticker" : "stickers"}`;
  selectAllBtn.disabled = isPrinting || selectedCount === state.pages.length;
  selectNoneBtn.disabled = isPrinting || selectedCount === 0;

  const isAllSelected = selectedCount === state.pages.length;
  printBatchBtn.disabled = !isReady || selectedCount === 0;
  printBatchBtn.textContent = isAllSelected
    ? `Print All Pages (${totalStickers} ${totalStickers === 1 ? "Sticker" : "Stickers"})`
    : `Print Selected (${totalStickers} ${totalStickers === 1 ? "Sticker" : "Stickers"})`;

  const showCancel = activeBatchAbort !== null && isPrinting;
  cancelBatchBtn.classList.toggle("is-hidden", !showCancel);
  cancelBatchBtn.disabled = activeBatchAbort?.signal.aborted ?? true;
  cancelBatchBtn.textContent = activeBatchAbort?.signal.aborted
    ? "Stopping After Sticker..."
    : "Stop After Current Sticker";
}

function updateHardwareUi(snap: PrinterTelemetrySnapshot): void {
  const isBusy =
    snap.state === "connecting" || snap.state === "calibrating" || snap.state === "printing";
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

  if (isConnected) {
    const badgePrefix =
      snap.transport === "ble"
        ? `Bluetooth BLE Connected: ${snap.deviceName ?? "B1"}`
        : `USB Serial Connected: ${snap.deviceName ?? "B1"}`;
    hwBadgeText.textContent =
      snap.state === "ready" ? badgePrefix : `${badgePrefix} (${snap.state.toUpperCase()})`;
  } else if (snap.state === "connecting") {
    hwBadgeText.textContent =
      snap.transport === "ble" ? "Scanning Bluetooth BLE..." : "Opening USB Serial...";
  } else if (snap.state === "error") {
    hwBadgeText.textContent = "Printer: Error";
  } else {
    hwBadgeText.textContent = "Printer: Disconnected";
    if (snap.lastError) {
      setHwStatus(snap.lastError, true);
    }
  }

  connectUsbBtn.disabled = !capabilities.webSerialSupported || isBusy;
  connectBleBtn.disabled = !capabilities.webBluetoothSupported || isBusy;
  disconnectBtn.disabled = !isConnected && snap.state !== "error";
  refreshTelemetryBtn.disabled = !isReady;
  feedGapBtn.disabled = !isReady;
  calibrateSensorBtn.disabled = !isReady;

  modelWarningEl.classList.toggle("is-hidden", !snap.modelWarning);
  if (snap.modelWarning) {
    modelWarningEl.textContent = snap.modelWarning;
  }

  if (!isConnected) {
    telModelEl.textContent = "—";
    telBatteryEl.textContent = "—";
    telSensorsEl.textContent = "—";
    telSpoolEl.textContent = "Disconnected";
  } else {
    const fw = snap.firmwareVersion ? ` (FW ${snap.firmwareVersion})` : "";
    telModelEl.textContent = `${snap.modelName ?? "B1"} · ${snap.printheadPixels ?? 384}px${fw}`;
    const batt = snap.batteryPct !== null ? `${snap.batteryPct}%` : "n/a";
    const pacing = snap.packetIntervalMs !== null ? `${snap.packetIntervalMs}ms` : "";
    telBatteryEl.textContent = `${batt} · ${snap.transport?.toUpperCase() ?? ""} ${pacing}`.trim();

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

  printProgressBox.classList.toggle("is-hidden", snap.state !== "printing");
  syncPrintAndBatchControls();
}

function updateProgressUi(progress: PrintLiveProgress): void {
  printProgressBox.classList.remove("is-hidden");
  const pct =
    progress.phase === "transfer"
      ? progress.packetTransferPct
      : Math.max(progress.pagePrintPct, progress.pageFeedPct);
  printProgressBar.value = Math.min(100, Math.max(0, pct));

  const batchPrefix =
    progress.totalBatchPages && progress.totalBatchPages > 1
      ? `Sticker ${progress.currentPage} of ${progress.totalPages} (Page ${progress.currentBatchPage}/${progress.totalBatchPages}) · `
      : "";

  printProgressLabel.textContent =
    progress.phase === "init"
      ? `${batchPrefix}Initializing B1 printhead & gap sensor...`
      : progress.phase === "transfer"
        ? `${batchPrefix}Uploading 384×400 bitmap: ${progress.packetTransferPct}%`
        : progress.phase === "printing"
          ? `${batchPrefix}Printing ${progress.currentPage}/${progress.totalPages} · Print ${progress.pagePrintPct}% · Feed ${progress.pageFeedPct}%`
          : progress.phase === "cancelled"
            ? "Stopping batch after active sticker..."
            : progress.phase === "cleanup"
              ? "Finalizing printEnd()..."
              : "Completed";
}

function updateThresholdVisibility(): void {
  const isThreshold = state.options.ditherMode === "threshold";
  thresholdGroup.classList.toggle("is-hidden", !isThreshold);
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

async function handlePrintBatch(): Promise<void> {
  const selected = getSelectedPages();
  if (selected.length === 0) {
    return;
  }

  const totalStickers = selected.length * state.copies;
  activeBatchAbort = new AbortController();
  syncPrintAndBatchControls();

  setHwStatus(
    `Starting batch print: ${selected.length} ${selected.length === 1 ? "page" : "pages"} (${totalStickers} ${totalStickers === 1 ? "sticker" : "stickers"})...`,
  );

  try {
    const result = await printer.printBatchLabels(
      selected.map((p) => p.encodedImage),
      {
        density: state.density,
        labelType: state.labelType,
        copiesPerPage: state.copies,
      },
      undefined,
      activeBatchAbort.signal,
    );

    if (result.cancelled) {
      setHwStatus(
        `Batch stopped cleanly after ${result.totalStickersPrinted} ${result.totalStickersPrinted === 1 ? "sticker" : "stickers"} (${result.completedPages}/${selected.length} pages).`,
      );
    } else {
      setHwStatus(
        `Batch completed cleanly: printed ${result.totalStickersPrinted} ${result.totalStickersPrinted === 1 ? "sticker" : "stickers"}.`,
      );
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    setHwStatus(`Batch print failed: ${msg}`, true);
  } finally {
    activeBatchAbort = null;
    syncPrintAndBatchControls();
  }
}

function renderPreviewCards(): void {
  pageCountBadge.textContent = `${state.pages.length} ${state.pages.length === 1 ? "page" : "pages"}`;

  if (state.pages.length === 0) {
    previewContainer.className = "empty-state";
    previewContainer.textContent =
      "Upload a single- or multi-page 50×50 mm PDF to preview 1-bit 384×400 px stickers and print individually or as a batch.";
    syncPrintAndBatchControls();
    return;
  }

  previewContainer.className = "preview-grid";
  previewContainer.replaceChildren();

  for (const page of state.pages) {
    const isChecked = state.selectedPageNumbers.has(page.pageNumber);
    const card = document.createElement("article");
    card.className = `sticker-card${isChecked ? "" : " is-excluded"}`;

    const head = document.createElement("div");
    head.className = "sticker-card-head";

    const selectLabel = document.createElement("label");
    selectLabel.className = "checkbox-row";
    const check = document.createElement("input");
    check.type = "checkbox";
    check.className = "card-batch-check";
    check.checked = isChecked;
    check.addEventListener("change", () => {
      if (check.checked) {
        state.selectedPageNumbers.add(page.pageNumber);
      } else {
        state.selectedPageNumbers.delete(page.pageNumber);
      }
      card.classList.toggle("is-excluded", !check.checked);
      syncPrintAndBatchControls();
    });
    const title = document.createElement("span");
    title.textContent = `Page ${page.pageNumber}`;
    selectLabel.append(check, title);

    const sizePill = document.createElement("span");
    sizePill.className = `pill ${page.isExpected50x50Mm ? "pill-ok" : "pill-warn"}`;
    sizePill.textContent = page.isExpected50x50Mm
      ? `${page.sourceWidthMm.toFixed(1)}×${page.sourceHeightMm.toFixed(1)} mm`
      : `Non-50mm: ${page.sourceWidthMm.toFixed(1)}×${page.sourceHeightMm.toFixed(1)} mm`;
    head.append(selectLabel, sizePill);

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

  syncPrintAndBatchControls();
}

async function runRasterPipeline(resetSelection = false): Promise<void> {
  if (!state.pdfBytes) {
    return;
  }

  const currentSeq = ++renderSeq;
  state.isRendering = true;
  syncPrintAndBatchControls();
  setPdfStatus(`Rasterizing ${state.fileName ?? "PDF"} at 384×400 px...`);

  try {
    const renderedPages = await rasterizePdfDocument(state.pdfBytes, state.options);
    if (currentSeq !== renderSeq) {
      return;
    }
    state.pages = renderedPages;
    if (resetSelection) {
      state.selectedPageNumbers = new Set(renderedPages.map((p) => p.pageNumber));
    }
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
    state.selectedPageNumbers.clear();
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
  if (file.size === 0) {
    setPdfStatus(`"${file.name}" is empty (0 bytes).`, true);
    return;
  }
  if (file.size > MAX_PDF_BYTES) {
    setPdfStatus(
      `"${file.name}" (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the 25 MB safety limit.`,
      true,
    );
    return;
  }

  const buffer = await file.arrayBuffer();
  state.fileName = file.name;
  state.pdfBytes = new Uint8Array(buffer);
  fileMetaEl.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
  await runRasterPipeline(true);
}

// Subscribe to B1 controller events
printer.onLog(appendLogEntry);
printer.onStateChange(updateHardwareUi);
printer.onProgress(updateProgressUi);

// PWA Desktop Install prompt + Offline Service Worker registration
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  installPwaBtn.classList.remove("is-hidden");
});

installPwaBtn.addEventListener("click", async () => {
  if (!deferredInstallPrompt) {
    return;
  }
  await deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  installPwaBtn.classList.add("is-hidden");
});

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("./sw.js");
  });
}

// Hardware UI listeners
usbFilterToggle.addEventListener("change", () => {
  state.filterKnownUsbVendors = usbFilterToggle.checked;
});

connectUsbBtn.addEventListener("click", async () => {
  setHwStatus("Opening WebSerial picker (select the Niimbot B1 USB Serial Device on this PC)...");
  try {
    const connected = await printer.connectUsb({
      filterKnownVendors: state.filterKnownUsbVendors,
    });
    if (connected) {
      setHwStatus("USB Serial Connected — ready to print 50×50 mm gap labels.");
    } else {
      setHwStatus("USB-C connection cancelled.");
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    setHwStatus(msg, true);
  }
});

connectBleBtn.addEventListener("click", async () => {
  setHwStatus(
    "Scanning Bluetooth BLE (ensure PC USB-C cable is unplugged from B1 and select B1-...)...",
  );
  try {
    const connected = await printer.connectBle();
    if (connected) {
      setHwStatus("Bluetooth BLE Connected — wireless packet pacing (20ms) active.");
    } else {
      setHwStatus("Bluetooth BLE connection cancelled.");
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    setHwStatus(msg, true);
  }
});

disconnectBtn.addEventListener("click", async () => {
  await printer.disconnect();
  setHwStatus("Printer disconnected cleanly.");
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
  syncPrintAndBatchControls();
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

// Batch toolbar listeners
selectAllBtn.addEventListener("click", () => {
  state.selectedPageNumbers = new Set(state.pages.map((p) => p.pageNumber));
  renderPreviewCards();
});

selectNoneBtn.addEventListener("click", () => {
  state.selectedPageNumbers.clear();
  renderPreviewCards();
});

printBatchBtn.addEventListener("click", () => {
  void handlePrintBatch();
});

cancelBatchBtn.addEventListener("click", () => {
  if (activeBatchAbort) {
    activeBatchAbort.abort();
    syncPrintAndBatchControls();
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
  void runRasterPipeline(false);
});

ditherModeSelect.addEventListener("change", () => {
  state.options.ditherMode = parseDitherMode(ditherModeSelect.value);
  updateThresholdVisibility();
  void runRasterPipeline(false);
});

thresholdSlider.addEventListener("input", () => {
  const value = Number.parseInt(thresholdSlider.value, 10);
  state.options.threshold = value;
  thresholdValueEl.textContent = String(value);
  void runRasterPipeline(false);
});

for (const btn of rotationButtons) {
  btn.addEventListener("click", () => {
    const rot = parseRotation(btn.dataset.rot);
    state.options.rotation = rot;
    for (const item of rotationButtons) {
      item.classList.toggle("is-active", item === btn);
    }
    void runRasterPipeline(false);
  });
}

invertToggle.addEventListener("change", () => {
  state.options.invert = invertToggle.checked;
  void runRasterPipeline(false);
});

updateThresholdVisibility();
