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
  MAX_SINGLE_PRINT_COPIES,
  type PrinterTelemetrySnapshot,
  type PrintLiveProgress,
  type ProtocolLogEntry,
} from "./printer/b1Client.ts";
import { createIcon } from "./ui/icons.ts";

type ThemeMode = "light" | "auto" | "dark";

const THEME_STORAGE_KEY = "niimbot-label-studio:theme";

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
  showBleedGuides: boolean;
  themeMode: ThemeMode;
  logCount: number;
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

function loadSavedTheme(): ThemeMode {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (raw === "light" || raw === "dark" || raw === "auto") {
      return raw;
    }
  } catch {
    // Ignore storage access errors in restricted frames
  }
  return "auto";
}

function applyThemeMode(mode: ThemeMode): void {
  if (mode === "light" || mode === "dark") {
    document.documentElement.dataset.theme = mode;
  } else {
    delete document.documentElement.dataset.theme;
  }
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // Ignore storage write errors
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

const initialTheme = loadSavedTheme();
applyThemeMode(initialTheme);

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
  showBleedGuides: true,
  themeMode: initialTheme,
  logCount: 0,
};

let renderSeq = 0;
let activeBatchAbort: AbortController | null = null;
let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;

const printer = new B1PrinterController();
const capabilities = detectBrowserTransportCapabilities();

const appRoot = document.querySelector<HTMLDivElement>("#app");
if (!appRoot) {
  throw new Error("Missing #app container in index.html");
}

// --- Sticky Frosted Top Navigation Bar ---
const hwDot = el("span", {
  id: "hw-dot",
  className: "hardware-dot",
  attrs: { "aria-hidden": "true" },
});
const hwBadgeText = el("span", {
  id: "hw-badge-text",
  text: "Printer: Disconnected",
});
const installPwaBtn = el(
  "button",
  {
    id: "install-pwa-btn",
    type: "button",
    className: "btn btn-tinted btn-sm is-hidden",
  },
  createIcon("downloadApp", 15),
  el("span", { text: "Install App" }),
);

const themeModes: ReadonlyArray<{
  mode: ThemeMode;
  label: string;
  icon: "sun" | "autoTheme" | "moon";
}> = [
  { mode: "light", label: "Light", icon: "sun" },
  { mode: "auto", label: "Auto", icon: "autoTheme" },
  { mode: "dark", label: "Dark", icon: "moon" },
];

const themeButtons = themeModes.map(({ mode, label, icon }) =>
  el(
    "button",
    {
      type: "button",
      role: "radio",
      className: state.themeMode === mode ? "seg-btn is-active" : "seg-btn",
      attrs: {
        "data-theme-mode": mode,
        "aria-checked": String(state.themeMode === mode),
        "aria-label": `${label} theme`,
      },
    },
    createIcon(icon, 14),
    el("span", { text: label }),
  ),
);

const themeSegmented = el(
  "div",
  {
    id: "theme-segmented",
    className: "segmented segmented-compact",
    role: "radiogroup",
    attrs: { "aria-label": "Appearance mode" },
  },
  ...themeButtons,
);

const topbar = el(
  "header",
  { className: "topbar" },
  el(
    "div",
    { className: "topbar-brand" },
    el(
      "div",
      { className: "brand-emblem", attrs: { "aria-hidden": "true" } },
      createIcon("brandMark", 20),
    ),
    el(
      "div",
      { className: "brand-titles" },
      el(
        "div",
        { className: "brand-title-row" },
        el("h1", { text: "Label Studio" }),
        el("span", { className: "model-pill", text: "Niimbot B1 · 50×50 mm" }),
      ),
      el("p", {
        className: "topbar-sub",
        text: "Zero-driver USB-C & Bluetooth BLE · 203 DPI · 384×400 px Thermal Print Center",
      }),
    ),
  ),
  el(
    "div",
    { className: "topbar-actions" },
    el("div", { id: "hw-badge", className: "hardware-badge", role: "status" }, hwDot, hwBadgeText),
    installPwaBtn,
    themeSegmented,
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

// --- Inspector Group 1: Printer & Sensor ---
const refreshTelemetryBtn = el(
  "button",
  {
    id: "refresh-telemetry-btn",
    type: "button",
    className: "btn btn-quiet btn-sm",
    title: "Refresh printer battery, cover, and RFID spool telemetry",
    disabled: true,
  },
  createIcon("refresh", 14),
  el("span", { text: "Refresh" }),
);

const connectUsbBtn = el(
  "button",
  {
    id: "connect-usb-btn",
    type: "button",
    className: "btn btn-primary",
    disabled: !capabilities.webSerialSupported,
  },
  createIcon("usb", 16),
  el("span", { text: "Connect USB-C" }),
);

const connectBleBtn = el(
  "button",
  {
    id: "connect-ble-btn",
    type: "button",
    className: "btn btn-tinted",
    disabled: !capabilities.webBluetoothSupported,
  },
  createIcon("bluetooth", 16),
  el("span", { text: "Connect Bluetooth" }),
);

const usbFilterToggle = el("input", {
  id: "usb-filter-toggle",
  type: "checkbox",
  className: "apple-checkbox",
  checked: true,
});

const disconnectBtn = el(
  "button",
  {
    id: "disconnect-btn",
    type: "button",
    className: "btn btn-quiet btn-sm",
    disabled: true,
  },
  createIcon("disconnect", 14),
  el("span", { text: "Disconnect" }),
);

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
  { id: "label-type-select", className: "apple-select" },
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

const feedGapBtn = el(
  "button",
  {
    id: "feed-gap-btn",
    type: "button",
    className: "btn btn-quiet",
    title:
      "Recommended: Feeds 1 blank sticker (zero thermal heat) to align the next die-cut gap with the tear bar",
    disabled: true,
  },
  el("span", { text: "Test 1-Label Gap Feed" }),
);

const calibrateSensorBtn = el(
  "button",
  {
    id: "calibrate-sensor-btn",
    type: "button",
    className: "btn btn-quiet",
    title: "Factory optical voltage calibration (0x8E): feeds ~15 cm (2–3 labels) on B1",
    disabled: true,
  },
  createIcon("sparkles", 15),
  el("span", { text: "Calibrate Sensor" }),
);

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
  { className: "panel", attrs: { "aria-label": "Printer and Sensor" } },
  el(
    "div",
    { className: "panel-title-row" },
    el(
      "div",
      { className: "panel-heading" },
      createIcon("printer", 17),
      el("h2", { className: "panel-title", text: "Printer & Sensor" }),
    ),
    refreshTelemetryBtn,
  ),
  el("div", { className: "btn-grid-2" }, connectUsbBtn, connectBleBtn),
  el(
    "div",
    { className: "utility-row" },
    el(
      "label",
      {
        className: "checkbox-row",
        title:
          "Filters WebSerial picker to Niimbot VID_3513 (built-in Windows usbser.sys) and CH34x VID_1A86",
      },
      usbFilterToggle,
      el("span", { text: "Filter VID_3513" }),
    ),
    disconnectBtn,
  ),
  el(
    "details",
    { className: "tips-disclosure" },
    el("summary", {}, createIcon("info", 14), el("span", { text: "Windows BLE & Multi-PC Tips" })),
    el(
      "ol",
      {},
      el(
        "li",
        {},
        el("strong", { text: "Unplug PC USB-C for BLE: " }),
        "B1 prioritizes USB data over Bluetooth when connected to a computer port.",
      ),
      el(
        "li",
        {},
        el("strong", { text: "Single host at a time: " }),
        "Close mobile or desktop Niimbot apps before scanning.",
      ),
      el(
        "li",
        {},
        el("strong", { text: "Zero drivers needed: " }),
        "Works in Edge or Chrome on Intel/AMD x64 and Snapdragon ARM64 over HTTPS or localhost.",
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
      el("span", { className: "telemetry-key", text: "Spool / RFID" }),
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
    { className: "control-group" },
    el("span", { className: "control-label", text: "Gap Alignment" }),
    el("div", { className: "btn-grid-2" }, feedGapBtn, calibrateSensorBtn),
  ),
  printProgressBox,
  hwStatusBanner,
);

// --- Inspector Group 2: Raster & Thermal Engine ---
const fitModeOptions: ReadonlyArray<{ value: FitMode; label: string }> = [
  { value: "fit", label: "Scale to Fit" },
  { value: "crop-bleed", label: "1:1 Bleed Crop" },
];
const fitModeButtons = fitModeOptions.map(({ value, label }) =>
  el("button", {
    type: "button",
    role: "radio",
    className: state.options.fitMode === value ? "seg-btn is-active" : "seg-btn",
    text: label,
    attrs: {
      "data-fit-mode": value,
      "aria-checked": String(state.options.fitMode === value),
    },
  }),
);
const fitModeSegmented = el(
  "div",
  {
    id: "fit-mode-segmented",
    className: "segmented",
    role: "radiogroup",
    attrs: { "aria-label": "Sizing mode" },
  },
  ...fitModeButtons,
);

const ditherModeOptions: ReadonlyArray<{ value: DitherMode; label: string }> = [
  { value: "threshold", label: "Sharp Threshold" },
  { value: "atkinson", label: "Atkinson Dither" },
];
const ditherModeButtons = ditherModeOptions.map(({ value, label }) =>
  el("button", {
    type: "button",
    role: "radio",
    className: state.options.ditherMode === value ? "seg-btn is-active" : "seg-btn",
    text: label,
    attrs: {
      "data-dither-mode": value,
      "aria-checked": String(state.options.ditherMode === value),
    },
  }),
);
const ditherModeSegmented = el(
  "div",
  {
    id: "dither-mode-segmented",
    className: "segmented",
    role: "radiogroup",
    attrs: { "aria-label": "1-Bit binarization mode" },
  },
  ...ditherModeButtons,
);

const thresholdValueEl = el("span", {
  id: "threshold-value",
  className: "value-pill",
  text: String(state.options.threshold),
});
const thresholdSlider = el("input", {
  id: "threshold-slider",
  type: "range",
  className: "apple-range",
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

const rotationValues: ReadonlyArray<RotationDegrees> = [0, 90, 180, 270];
const rotationButtons = rotationValues.map((deg) =>
  el("button", {
    type: "button",
    role: "radio",
    className: state.options.rotation === deg ? "seg-btn is-active" : "seg-btn",
    text: `${deg}°`,
    attrs: {
      "data-rot": String(deg),
      "aria-checked": String(state.options.rotation === deg),
    },
  }),
);
const rotationSegmented = el(
  "div",
  {
    id: "rotation-group",
    className: "segmented",
    role: "radiogroup",
    attrs: { "aria-label": "Page rotation" },
  },
  ...rotationButtons,
);

const densityValueEl = el("span", {
  id: "density-value",
  className: "value-pill",
  text: `${state.density} / 5`,
});
const densitySlider = el("input", {
  id: "density-slider",
  type: "range",
  className: "apple-range",
  attrs: { min: "1", max: "5", step: "1", value: String(state.density) },
});

const copiesDecBtn = el("button", {
  id: "copies-dec-btn",
  type: "button",
  className: "stepper-btn",
  text: "−",
  attrs: { "aria-label": "Decrease copies" },
});
const copiesInput = el("input", {
  id: "copies-input",
  type: "number",
  className: "stepper-input",
  attrs: {
    min: "1",
    max: String(MAX_SINGLE_PRINT_COPIES),
    step: "1",
    value: String(state.copies),
    "aria-label": "Copies per sticker",
  },
});
const copiesIncBtn = el("button", {
  id: "copies-inc-btn",
  type: "button",
  className: "stepper-btn",
  text: "+",
  attrs: { "aria-label": "Increase copies" },
});

const invertToggle = el("input", {
  id: "invert-toggle",
  type: "checkbox",
  className: "apple-switch",
});
const bleedGuidesToggle = el("input", {
  id: "bleed-guides-toggle",
  type: "checkbox",
  className: "apple-switch",
  checked: true,
});

const rasterPanel = el(
  "section",
  { className: "panel", attrs: { "aria-label": "Raster and Thermal Engine" } },
  el(
    "div",
    { className: "panel-title-row" },
    el(
      "div",
      { className: "panel-heading" },
      createIcon("sparkles", 17),
      el("h2", { className: "panel-title", text: "Raster & Thermal Engine" }),
    ),
  ),
  el(
    "div",
    { className: "control-group" },
    el("span", { className: "control-label", text: "Sizing Mode" }),
    fitModeSegmented,
  ),
  el(
    "div",
    { className: "control-group" },
    el("span", { className: "control-label", text: "1-Bit Engine" }),
    ditherModeSegmented,
  ),
  thresholdGroup,
  el(
    "div",
    { className: "control-group" },
    el("span", { className: "control-label", text: "Rotation" }),
    rotationSegmented,
  ),
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
    { className: "stepper-row" },
    el("label", {
      className: "control-label",
      attrs: { for: "copies-input" },
      text: "Copies / Sticker",
    }),
    el("div", { className: "stepper" }, copiesDecBtn, copiesInput, copiesIncBtn),
  ),
  el(
    "div",
    { className: "toggles-group" },
    el(
      "label",
      { className: "switch-row" },
      el("span", { text: "Invert polarity (white on black)" }),
      invertToggle,
    ),
    el(
      "label",
      { className: "switch-row" },
      el("span", { text: "Show 1 mm margin hairlines" }),
      bleedGuidesToggle,
    ),
  ),
);

// --- Right Main Canvas Stage ---
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
  el("div", { className: "dropzone-icon-badge" }, createIcon("uploadPdf", 24)),
  el(
    "div",
    { className: "dropzone-copy" },
    el("div", { className: "dropzone-title", text: "Drop 50×50 mm PDF Label Sheet" }),
    el("div", {
      className: "dropzone-hint",
      text: "Click to browse · Up to 25 MB / 100 pages · Local offline rendering",
    }),
  ),
  fileInput,
);

const fileMetaEl = el("div", { id: "file-meta", className: "file-meta", text: "No PDF loaded" });
const statusBanner = el("div", {
  id: "status-banner",
  className: "status-banner",
  text: "Ready for PDF input.",
});

const pageCountBadge = el("span", {
  id: "page-count-badge",
  className: "value-pill",
  text: "0 pages",
});

const selectAllBtn = el("button", {
  id: "select-all-btn",
  type: "button",
  className: "btn btn-quiet btn-sm",
  text: "Select All",
});
const selectNoneBtn = el("button", {
  id: "select-none-btn",
  type: "button",
  className: "btn btn-quiet btn-sm",
  text: "Deselect",
});
const batchSummaryEl = el("span", {
  id: "batch-summary",
  className: "batch-summary",
  text: "0 selected",
});
const cancelBatchBtn = el(
  "button",
  {
    id: "cancel-batch-btn",
    type: "button",
    className: "btn btn-danger btn-sm is-hidden",
  },
  createIcon("stop", 14),
  el("span", { text: "Stop After Current" }),
);
const printBatchBtnLabel = el("span", { text: "Print Selected (0)" });
const printBatchBtn = el(
  "button",
  {
    id: "print-batch-btn",
    type: "button",
    className: "btn btn-primary",
    disabled: true,
  },
  createIcon("play", 15),
  printBatchBtnLabel,
);

const batchToolbar = el(
  "div",
  { id: "batch-toolbar", className: "batch-toolbar is-hidden" },
  el("div", { className: "batch-toolbar-left" }, selectAllBtn, selectNoneBtn, batchSummaryEl),
  el("div", { className: "batch-toolbar-right" }, cancelBatchBtn, printBatchBtn),
);

const previewContainer = el("div", {
  id: "preview-container",
  className: "empty-state",
  text: "Drop a single- or multi-page 50×50 mm PDF above to inspect 1-bit 384×400 px stickers on silicone release liners.",
});

const stagePanel = el(
  "section",
  { className: "panel stage-panel", attrs: { "aria-label": "Label Previews and Batch Queue" } },
  dropzone,
  el("div", { className: "stage-status-row" }, fileMetaEl, statusBanner),
  el(
    "div",
    { className: "preview-header" },
    el("h2", { text: "50×50 mm Die-Cut Label Previews" }),
    pageCountBadge,
  ),
  batchToolbar,
  previewContainer,
);

// --- Bottom Collapsible Activity Console ---
const logCountPill = el("span", {
  id: "log-count-pill",
  className: "value-pill",
  text: "0 events",
});
const clearLogBtn = el("button", {
  id: "clear-log-btn",
  type: "button",
  className: "btn btn-quiet btn-sm",
  text: "Clear",
});
const protocolLogEl = el("div", {
  id: "protocol-log",
  className: "protocol-log-output",
  role: "log",
  attrs: { "aria-live": "polite" },
});
const protocolDrawer = el(
  "details",
  { className: "protocol-drawer" },
  el(
    "summary",
    {},
    el(
      "div",
      { className: "drawer-summary-left" },
      createIcon("terminal", 16),
      el("span", { text: "Activity & Protocol Console" }),
    ),
    logCountPill,
  ),
  el(
    "div",
    { className: "protocol-drawer-toolbar" },
    el("span", {
      text: "WebSerial / BLE GATT negotiation, optical gap calibration, and B1PrintTask packet states.",
    }),
    clearLogBtn,
  ),
  protocolLogEl,
);

const workspaceGrid = el(
  "main",
  { className: "workspace-grid" },
  el("aside", { className: "sidebar-stack" }, hardwarePanel, rasterPanel),
  stagePanel,
);

const appShell = el("div", { className: "app-shell" }, topbar);
if (capabilityWarningNode) {
  appShell.append(capabilityWarningNode);
}
appShell.append(workspaceGrid, protocolDrawer);
appRoot.replaceChildren(appShell);

// --- UI State & Render Helpers ---
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
  state.logCount++;
  logCountPill.textContent = `${state.logCount} ${state.logCount === 1 ? "event" : "events"}`;
}

function getSelectedPages(): RenderedLabelPage[] {
  return state.pages.filter((p) => state.selectedPageNumbers.has(p.pageNumber));
}

function syncCopiesStepper(): void {
  copiesInput.value = String(state.copies);
  copiesDecBtn.disabled = state.copies <= 1;
  copiesIncBtn.disabled = state.copies >= MAX_SINGLE_PRINT_COPIES;
}

function syncPrintAndBatchControls(): void {
  const pState = printer.getState();
  const isReady = pState === "ready" && !state.isRendering;
  const isPrinting = pState === "printing";

  const cardButtons = document.querySelectorAll<HTMLButtonElement>(".card-print-btn");
  for (const btn of cardButtons) {
    btn.disabled = !isReady;
    const labelSpan = btn.querySelector<HTMLSpanElement>(".card-print-btn-label");
    if (labelSpan) {
      labelSpan.textContent = isPrinting
        ? "Printing..."
        : pState === "ready"
          ? "Print Sticker"
          : "Connect B1";
    }
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

  batchSummaryEl.textContent = `${selectedCount}/${state.pages.length} selected · ${totalStickers} ${totalStickers === 1 ? "sticker" : "stickers"}`;
  selectAllBtn.disabled = isPrinting || selectedCount === state.pages.length;
  selectNoneBtn.disabled = isPrinting || selectedCount === 0;

  const isAllSelected = selectedCount === state.pages.length;
  printBatchBtn.disabled = !isReady || selectedCount === 0;
  printBatchBtnLabel.textContent = isAllSelected
    ? `Print All (${totalStickers})`
    : `Print Selected (${totalStickers})`;

  const showCancel = activeBatchAbort !== null && isPrinting;
  cancelBatchBtn.classList.toggle("is-hidden", !showCancel);
  cancelBatchBtn.disabled = activeBatchAbort?.signal.aborted ?? true;
  const cancelLabel = cancelBatchBtn.querySelector("span");
  if (cancelLabel) {
    cancelLabel.textContent = activeBatchAbort?.signal.aborted
      ? "Stopping..."
      : "Stop After Current";
  }
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
    const linkName = snap.transport === "ble" ? "BLE" : "USB-C";
    const battTag = snap.batteryPct !== null ? ` · ${snap.batteryPct}%` : "";
    const statusTag = snap.state === "ready" ? "Ready" : snap.state.toUpperCase();
    hwBadgeText.textContent = `${snap.deviceName ?? "Niimbot B1"} (${linkName}${battTag}) · ${statusTag}`;
  } else if (snap.state === "connecting") {
    hwBadgeText.textContent = snap.transport === "ble" ? "Scanning BLE..." : "Connecting USB-C...";
  } else if (snap.state === "error") {
    hwBadgeText.textContent = "Printer Error";
  } else {
    hwBadgeText.textContent = "Disconnected";
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
      "Drop a single- or multi-page 50×50 mm PDF above to inspect 1-bit 384×400 px stickers on silicone release liners.";
    syncPrintAndBatchControls();
    return;
  }

  previewContainer.className = state.showBleedGuides
    ? "preview-grid"
    : "preview-grid hide-bleed-guides";
  previewContainer.replaceChildren();

  for (const page of state.pages) {
    const isChecked = state.selectedPageNumbers.has(page.pageNumber);
    const card = document.createElement("article");
    card.className = `sticker-card${isChecked ? " is-selected" : " is-excluded"}`;

    const head = document.createElement("div");
    head.className = "sticker-card-head";

    const selectPill = document.createElement("label");
    selectPill.className = `sticker-select-pill${isChecked ? " is-checked" : ""}`;
    const check = document.createElement("input");
    check.type = "checkbox";
    check.className = "card-batch-check hidden-input";
    check.checked = isChecked;
    const checkBoxBadge = el("span", { className: "select-check-circle" }, createIcon("check", 12));
    const title = el("span", { text: `Page ${page.pageNumber}` });
    selectPill.append(check, checkBoxBadge, title);

    check.addEventListener("change", () => {
      if (check.checked) {
        state.selectedPageNumbers.add(page.pageNumber);
      } else {
        state.selectedPageNumbers.delete(page.pageNumber);
      }
      selectPill.classList.toggle("is-checked", check.checked);
      card.classList.toggle("is-selected", check.checked);
      card.classList.toggle("is-excluded", !check.checked);
      syncPrintAndBatchControls();
    });

    const sizePill = document.createElement("span");
    sizePill.className = `pill ${page.isExpected50x50Mm ? "pill-ok" : "pill-warn"}`;
    sizePill.textContent = page.isExpected50x50Mm
      ? `${page.sourceWidthMm.toFixed(1)}×${page.sourceHeightMm.toFixed(1)} mm`
      : `Non-50mm: ${page.sourceWidthMm.toFixed(1)}×${page.sourceHeightMm.toFixed(1)} mm`;
    head.append(selectPill, sizePill);

    const frame = document.createElement("div");
    frame.className = "sticker-frame";
    frame.title = "Hairline side bands mark 1 mm (8 px) unprintable thermal margins";
    page.canvas.className = "sticker-canvas";
    frame.append(page.canvas);

    const liner = document.createElement("div");
    liner.className = "sticker-liner";
    liner.append(frame);

    const meta = document.createElement("div");
    meta.className = "sticker-meta";

    const totalPixels = page.widthPx * page.heightPx;
    const coveragePct = ((page.blackPixelsCount / totalPixels) * 100).toFixed(1);

    meta.append(
      el("div", {
        text: `${page.widthPx}×${page.heightPx} px · 203 DPI · ${page.encodedImage.rowsData.length} pkts`,
      }),
      el("div", { text: `Ink: ${page.blackPixelsCount.toLocaleString()} dots (${coveragePct}%)` }),
    );

    const printBtn = el(
      "button",
      {
        type: "button",
        className: "btn btn-primary card-print-btn",
      },
      createIcon("printer", 15),
      el("span", { className: "card-print-btn-label", text: "Print Sticker" }),
    );
    printBtn.addEventListener("click", () => {
      void handlePrintSinglePage(page);
    });

    card.append(head, liner, meta, printBtn);
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
      `Rendered ${renderedPages.length} ${renderedPages.length === 1 ? "label" : "labels"} (384×400 1-bit verified).`,
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

// --- Subscriptions & Event Listeners ---
printer.onLog(appendLogEntry);
printer.onStateChange(updateHardwareUi);
printer.onProgress(updateProgressUi);

for (const btn of themeButtons) {
  btn.addEventListener("click", () => {
    const mode = btn.dataset.themeMode;
    if (mode !== "light" && mode !== "auto" && mode !== "dark") {
      return;
    }
    state.themeMode = mode;
    applyThemeMode(mode);
    for (const item of themeButtons) {
      const active = item === btn;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-checked", String(active));
    }
  });
}

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
    void navigator.serviceWorker.register("./sw.js", { scope: "./" });
  });
}

usbFilterToggle.addEventListener("change", () => {
  state.filterKnownUsbVendors = usbFilterToggle.checked;
});

connectUsbBtn.addEventListener("click", async () => {
  setHwStatus("Opening WebSerial picker (select Niimbot B1 USB Serial Device)...");
  try {
    const connected = await printer.connectUsb({
      filterKnownVendors: state.filterKnownUsbVendors,
    });
    setHwStatus(
      connected
        ? "USB Serial Connected — ready to print 50×50 mm gap labels."
        : "USB-C connection cancelled.",
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    setHwStatus(msg, true);
  }
});

connectBleBtn.addEventListener("click", async () => {
  setHwStatus("Scanning Bluetooth BLE (unplug PC USB-C cable from B1 and select B1-...)...");
  try {
    const connected = await printer.connectBle();
    setHwStatus(
      connected
        ? "Bluetooth BLE Connected — 20ms wireless packet pacing active."
        : "Bluetooth BLE connection cancelled.",
    );
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

function setCopies(nextVal: number): void {
  const clamped = Number.isFinite(nextVal)
    ? Math.max(1, Math.min(MAX_SINGLE_PRINT_COPIES, Math.round(nextVal)))
    : 1;
  state.copies = clamped;
  syncCopiesStepper();
  syncPrintAndBatchControls();
}

copiesDecBtn.addEventListener("click", () => setCopies(state.copies - 1));
copiesIncBtn.addEventListener("click", () => setCopies(state.copies + 1));
copiesInput.addEventListener("change", () => {
  setCopies(Number.parseInt(copiesInput.value, 10));
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
  setHwStatus("Running B1 optical gap calibration (0x8E — feeds ~2–3 labels)...");
  try {
    await printer.calibrateGapSensor(state.labelType);
    setHwStatus("Optical gap sensor calibration finished.");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    setHwStatus(`Gap calibration failed: ${msg}`, true);
  }
});

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
  state.logCount = 0;
  logCountPill.textContent = "0 events";
});

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

for (const btn of fitModeButtons) {
  btn.addEventListener("click", () => {
    const nextFit: FitMode = btn.dataset.fitMode === "crop-bleed" ? "crop-bleed" : "fit";
    state.options.fitMode = nextFit;
    for (const item of fitModeButtons) {
      const active = item === btn;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-checked", String(active));
    }
    void runRasterPipeline(false);
  });
}

for (const btn of ditherModeButtons) {
  btn.addEventListener("click", () => {
    const nextDither: DitherMode = btn.dataset.ditherMode === "atkinson" ? "atkinson" : "threshold";
    state.options.ditherMode = nextDither;
    for (const item of ditherModeButtons) {
      const active = item === btn;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-checked", String(active));
    }
    updateThresholdVisibility();
    void runRasterPipeline(false);
  });
}

thresholdSlider.addEventListener("input", () => {
  const value = Number.parseInt(thresholdSlider.value, 10);
  state.options.threshold = value;
  thresholdValueEl.textContent = String(value);
  void runRasterPipeline(false);
});

for (const btn of rotationButtons) {
  btn.addEventListener("click", () => {
    const raw = btn.dataset.rot;
    const nextRot: RotationDegrees =
      raw === "90" ? 90 : raw === "180" ? 180 : raw === "270" ? 270 : 0;
    state.options.rotation = nextRot;
    for (const item of rotationButtons) {
      const active = item === btn;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-checked", String(active));
    }
    void runRasterPipeline(false);
  });
}

invertToggle.addEventListener("change", () => {
  state.options.invert = invertToggle.checked;
  void runRasterPipeline(false);
});

bleedGuidesToggle.addEventListener("change", () => {
  state.showBleedGuides = bleedGuidesToggle.checked;
  if (state.pages.length > 0) {
    previewContainer.classList.toggle("hide-bleed-guides", !state.showBleedGuides);
  }
});

updateThresholdVisibility();
syncCopiesStepper();
