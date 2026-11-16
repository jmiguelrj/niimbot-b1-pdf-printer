import { LabelType } from "@mmote/niimbluelib";
import "./style.css";
import {
  applyDocumentLocale,
  formatText,
  type Locale,
  resolveInitialLocale,
  TRANSLATIONS,
  type UiStrings,
} from "./i18n/translations.ts";
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
import { createManualModal } from "./ui/manualModal.ts";

type ThemeMode = "light" | "auto" | "dark";

const THEME_STORAGE_KEY = "niimbot-label-studio:theme";

interface StatusDescriptor {
  kind: "key" | "raw";
  key?: keyof UiStrings;
  params?: Record<string, string | number>;
  rawText?: string;
  isError: boolean;
}

interface FileMetaDescriptor {
  name: string;
  sizeKb: string;
}

interface AppState {
  locale: Locale;
  fileName: string | null;
  fileMeta: FileMetaDescriptor | null;
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
  lastPdfStatus: StatusDescriptor;
  lastHwStatus: StatusDescriptor;
  lastProgress: PrintLiveProgress | null;
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

const initialLocale = resolveInitialLocale();
applyDocumentLocale(initialLocale, false);

const initialTheme = loadSavedTheme();
applyThemeMode(initialTheme);

const state: AppState = {
  locale: initialLocale,
  fileName: null,
  fileMeta: null,
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
  lastPdfStatus: { kind: "key", key: "pdfReadyStatus", isError: false },
  lastHwStatus: { kind: "key", key: "hwIdleBanner", isError: false },
  lastProgress: null,
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

function t(): UiStrings {
  return TRANSLATIONS[state.locale];
}

function resolveDescriptor(desc: StatusDescriptor): string {
  if (desc.kind === "raw") {
    return desc.rawText ?? "";
  }
  const str = desc.key ? t()[desc.key] : "";
  return desc.params ? formatText(str, desc.params) : str;
}

// --- Sticky Frosted Top Navigation Bar ---
const modelBadgeEl = el("span", { className: "model-pill", text: t().modelBadge });
const topbarSubtitleEl = el("p", { className: "topbar-sub", text: t().topbarSubtitle });

const hwDot = el("span", {
  id: "hw-dot",
  className: "hardware-dot",
  attrs: { "aria-hidden": "true" },
});
const hwBadgeText = el("span", {
  id: "hw-badge-text",
  text: t().statusDisconnected,
});

const manualBtnLabel = el("span", { text: t().manualBtn });
const manualBtn = el(
  "button",
  {
    id: "manual-open-btn",
    type: "button",
    className: "btn btn-quiet btn-sm",
    title: t().manualBtnTitle,
  },
  createIcon("book", 15),
  manualBtnLabel,
);

const installPwaBtnLabel = el("span", { text: t().installApp });
const installPwaBtn = el(
  "button",
  {
    id: "install-pwa-btn",
    type: "button",
    className: "btn btn-tinted btn-sm is-hidden",
  },
  createIcon("downloadApp", 15),
  installPwaBtnLabel,
);

const localeOptions: ReadonlyArray<{ locale: Locale; code: string }> = [
  { locale: "en", code: "EN" },
  { locale: "pt-BR", code: "PT" },
];

const langButtons = localeOptions.map(({ locale, code }) =>
  el("button", {
    type: "button",
    role: "radio",
    className: state.locale === locale ? "seg-btn is-active" : "seg-btn",
    text: code,
    attrs: {
      "data-locale": locale,
      "aria-checked": String(state.locale === locale),
    },
  }),
);

const langSegmented = el(
  "div",
  {
    id: "lang-segmented",
    className: "segmented segmented-compact",
    role: "radiogroup",
    attrs: { "aria-label": t().langGroupAria },
  },
  ...langButtons,
);

const themeModes: ReadonlyArray<{
  mode: ThemeMode;
  icon: "sun" | "autoTheme" | "moon";
}> = [
  { mode: "light", icon: "sun" },
  { mode: "auto", icon: "autoTheme" },
  { mode: "dark", icon: "moon" },
];

const themeButtons = themeModes.map(({ mode, icon }) =>
  el(
    "button",
    {
      type: "button",
      role: "radio",
      className: state.themeMode === mode ? "seg-btn is-active" : "seg-btn",
      attrs: {
        "data-theme-mode": mode,
        "aria-checked": String(state.themeMode === mode),
      },
    },
    createIcon(icon, 14),
    el("span"),
  ),
);

const themeSegmented = el(
  "div",
  {
    id: "theme-segmented",
    className: "segmented segmented-compact",
    role: "radiogroup",
    attrs: { "aria-label": t().themeGroupAria },
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
      el("div", { className: "brand-title-row" }, el("h1", { text: "Label Studio" }), modelBadgeEl),
      topbarSubtitleEl,
    ),
  ),
  el(
    "div",
    { className: "topbar-actions" },
    el("div", { id: "hw-badge", className: "hardware-badge", role: "status" }, hwDot, hwBadgeText),
    manualBtn,
    installPwaBtn,
    langSegmented,
    themeSegmented,
  ),
);

const capabilityWarningNode =
  !capabilities.webSerialSupported && !capabilities.webBluetoothSupported
    ? el("div", { id: "capability-warning", className: "browser-warning", role: "alert" })
    : !capabilities.isSecureContext
      ? el("div", { id: "capability-warning", className: "browser-warning", role: "alert" })
      : null;

function renderCapabilityWarning(): void {
  if (!capabilityWarningNode) return;
  const s = t();
  if (!capabilities.webSerialSupported && !capabilities.webBluetoothSupported) {
    capabilityWarningNode.replaceChildren(
      el("strong", { text: s.warnNoHardwareTitle }),
      s.warnNoHardwareBeforeEdge,
      el("strong", { text: s.warnNoHardwareEdge }),
      s.warnNoHardwareOr,
      el("strong", { text: s.warnNoHardwareChrome }),
      s.warnNoHardwareOver,
      el("code", { text: "https://" }),
      s.warnNoHardwareOr,
      el("code", { text: "http://localhost" }),
      s.warnNoHardwareTail,
    );
    return;
  }
  capabilityWarningNode.replaceChildren(
    el("strong", { text: s.warnInsecureTitle }),
    s.warnInsecureBody,
    el("code", { text: "https://" }),
    s.warnInsecureOr,
    el("code", { text: "http://localhost" }),
    ".",
  );
}

// --- Inspector Group 1: Printer & Sensor ---
const printerPanelTitleEl = el("h2", { className: "panel-title", text: t().printerPanelTitle });
const refreshBtnLabel = el("span", { text: t().refreshBtn });
const refreshTelemetryBtn = el(
  "button",
  {
    id: "refresh-telemetry-btn",
    type: "button",
    className: "btn btn-quiet btn-sm",
    title: t().refreshBtnTitle,
    disabled: true,
  },
  createIcon("refresh", 14),
  refreshBtnLabel,
);

const devicePodImg = el("img", {
  className: "device-photo-img",
  attrs: {
    src: "./niimbot-b1.svg",
    alt: t().devicePodAlt,
    loading: "eager",
    decoding: "async",
  },
});
const devicePodTitleEl = el("span", { className: "device-pod-title", text: t().devicePodTitle });
const devicePodStatusEl = el("span", {
  id: "device-pod-status",
  className: "device-pod-status",
  text: t().statusDisconnected,
});
const devicePodSpecEl = el("span", { className: "device-pod-spec", text: t().devicePodSpec });
const devicePodGuideBtn = el("button", {
  id: "device-pod-guide-btn",
  type: "button",
  className: "device-pod-link",
  text: t().devicePodGuideLink,
});

const deviceShowcasePod = el(
  "div",
  { id: "device-showcase-pod", className: "device-showcase-pod" },
  el("div", { className: "device-photo-well" }, devicePodImg),
  el(
    "div",
    { className: "device-pod-meta" },
    el("div", { className: "device-pod-title-row" }, devicePodTitleEl, devicePodStatusEl),
    devicePodSpecEl,
    devicePodGuideBtn,
  ),
);

const connectUsbLabel = el("span", { text: t().connectUsb });
const connectUsbBtn = el(
  "button",
  {
    id: "connect-usb-btn",
    type: "button",
    className: "btn btn-primary",
    disabled: !capabilities.webSerialSupported,
  },
  createIcon("usb", 16),
  connectUsbLabel,
);

const connectBleLabel = el("span", { text: t().connectBle });
const connectBleBtn = el(
  "button",
  {
    id: "connect-ble-btn",
    type: "button",
    className: "btn btn-tinted",
    disabled: !capabilities.webBluetoothSupported,
  },
  createIcon("bluetooth", 16),
  connectBleLabel,
);

const usbFilterToggle = el("input", {
  id: "usb-filter-toggle",
  type: "checkbox",
  className: "apple-checkbox",
  checked: true,
});
const filterVidTextEl = el("span", { text: t().filterVid });
const filterVidLabelRow = el(
  "label",
  { className: "checkbox-row", title: t().filterVidTitle },
  usbFilterToggle,
  filterVidTextEl,
);

const disconnectBtnLabel = el("span", { text: t().disconnect });
const disconnectBtn = el(
  "button",
  {
    id: "disconnect-btn",
    type: "button",
    className: "btn btn-quiet btn-sm",
    disabled: true,
  },
  createIcon("disconnect", 14),
  disconnectBtnLabel,
);

const tipsSummarySpan = el("span", { text: t().tipsSummary });
const tipsListEl = el("ol");
const tipsDisclosure = el(
  "details",
  { className: "tips-disclosure" },
  el("summary", {}, createIcon("info", 14), tipsSummarySpan),
  tipsListEl,
);

function renderTipsDisclosure(): void {
  const s = t();
  tipsSummarySpan.textContent = s.tipsSummary;
  tipsListEl.replaceChildren(
    el("li", {}, el("strong", { text: s.tip1Bold }), s.tip1Text),
    el("li", {}, el("strong", { text: s.tip2Bold }), s.tip2Text),
    el("li", {}, el("strong", { text: s.tip3Bold }), s.tip3Text),
  );
}

const modelWarningEl = el("div", {
  id: "model-warning",
  className: "status-banner is-warn is-hidden",
});

const telModelKeyEl = el("span", { className: "telemetry-key", text: t().telModel });
const telBatteryKeyEl = el("span", { className: "telemetry-key", text: t().telBattery });
const telSensorsKeyEl = el("span", { className: "telemetry-key", text: t().telPaperLid });
const telSpoolKeyEl = el("span", { className: "telemetry-key", text: t().telRoll });

const telModelEl = el("span", { id: "tel-model", className: "telemetry-val", text: "—" });
const telBatteryEl = el("span", { id: "tel-battery", className: "telemetry-val", text: "—" });
const telSensorsEl = el("span", { id: "tel-sensors", className: "telemetry-val", text: "—" });
const telSpoolEl = el("span", {
  id: "tel-spool",
  className: "telemetry-val",
  text: t().statusDisconnected,
});

const sensorModeLabelEl = el("label", {
  className: "control-label",
  attrs: { for: "label-type-select" },
  text: t().sensorModeLabel,
});

const sensorOptWithGaps = el("option", {
  attrs: { value: "1", selected: "selected" },
  text: t().sensorWithGaps,
});
const sensorOptTransparent = el("option", {
  attrs: { value: "5" },
  text: t().sensorTransparent,
});
const sensorOptBlack = el("option", {
  attrs: { value: "2" },
  text: t().sensorBlackMark,
});

const labelTypeSelect = el(
  "select",
  { id: "label-type-select", className: "apple-select" },
  sensorOptWithGaps,
  sensorOptTransparent,
  sensorOptBlack,
);

const gapAlignmentLabelEl = el("span", { className: "control-label", text: t().gapAlignmentLabel });
const feedGapLabel = el("span", { text: t().feedGapBtn });
const feedGapBtn = el(
  "button",
  {
    id: "feed-gap-btn",
    type: "button",
    className: "btn btn-quiet",
    title: t().feedGapTitle,
    disabled: true,
  },
  feedGapLabel,
);

const calibrateBtnLabel = el("span", { text: t().calibrateBtn });
const calibrateSensorBtn = el(
  "button",
  {
    id: "calibrate-sensor-btn",
    type: "button",
    className: "btn btn-quiet",
    title: t().calibrateTitle,
    disabled: true,
  },
  createIcon("sparkles", 15),
  calibrateBtnLabel,
);

const printProgressLabel = el("div", { id: "print-progress-label", text: t().progIdle });
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
  text: t().hwIdleBanner,
});

const hardwarePanel = el(
  "section",
  { className: "panel", attrs: { "aria-label": t().printerPanelAria } },
  el(
    "div",
    { className: "panel-title-row" },
    el("div", { className: "panel-heading" }, createIcon("printer", 17), printerPanelTitleEl),
    refreshTelemetryBtn,
  ),
  deviceShowcasePod,
  el("div", { className: "btn-grid-2" }, connectUsbBtn, connectBleBtn),
  el("div", { className: "utility-row" }, filterVidLabelRow, disconnectBtn),
  tipsDisclosure,
  modelWarningEl,
  el(
    "div",
    { className: "telemetry-grid", attrs: { "aria-live": "polite" } },
    el("div", { className: "telemetry-item" }, telModelKeyEl, telModelEl),
    el("div", { className: "telemetry-item" }, telBatteryKeyEl, telBatteryEl),
    el("div", { className: "telemetry-item full-span" }, telSensorsKeyEl, telSensorsEl),
    el("div", { className: "telemetry-item full-span" }, telSpoolKeyEl, telSpoolEl),
  ),
  el("div", { className: "control-group" }, sensorModeLabelEl, labelTypeSelect),
  el(
    "div",
    { className: "control-group" },
    gapAlignmentLabelEl,
    el("div", { className: "btn-grid-2" }, feedGapBtn, calibrateSensorBtn),
  ),
  printProgressBox,
  hwStatusBanner,
);

// --- Inspector Group 2: Raster & Thermal Engine ---
const rasterPanelTitleEl = el("h2", { className: "panel-title", text: t().rasterPanelTitle });
const sizingModeLabelEl = el("span", { className: "control-label", text: t().sizingModeLabel });

const fitModeValues: ReadonlyArray<FitMode> = ["fit", "crop-bleed"];
const fitModeButtons = fitModeValues.map((value) =>
  el("button", {
    type: "button",
    role: "radio",
    className: state.options.fitMode === value ? "seg-btn is-active" : "seg-btn",
    text: value === "fit" ? t().fitScale : t().fitBleed,
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
    attrs: { "aria-label": t().sizingGroupAria },
  },
  ...fitModeButtons,
);

const ditherModeLabelEl = el("span", { className: "control-label", text: t().ditherModeLabel });
const ditherModeValues: ReadonlyArray<DitherMode> = ["threshold", "atkinson"];
const ditherModeButtons = ditherModeValues.map((value) =>
  el("button", {
    type: "button",
    role: "radio",
    className: state.options.ditherMode === value ? "seg-btn is-active" : "seg-btn",
    text: value === "threshold" ? t().ditherThreshold : t().ditherAtkinson,
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
    attrs: { "aria-label": t().ditherGroupAria },
  },
  ...ditherModeButtons,
);

const thresholdLabelEl = el("label", {
  className: "control-label",
  attrs: { for: "threshold-slider" },
  text: t().thresholdLabel,
});
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
  el("div", { className: "threshold-row" }, thresholdLabelEl, thresholdValueEl),
  thresholdSlider,
);

const rotationLabelEl = el("span", { className: "control-label", text: t().rotationLabel });
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
    attrs: { "aria-label": t().rotationGroupAria },
  },
  ...rotationButtons,
);

const densityLabelEl = el("label", {
  className: "control-label",
  attrs: { for: "density-slider" },
  text: t().densityLabel,
});
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

const copiesLabelEl = el("label", {
  className: "control-label",
  attrs: { for: "copies-input" },
  text: t().copiesLabel,
});
const copiesDecBtn = el("button", {
  id: "copies-dec-btn",
  type: "button",
  className: "stepper-btn",
  text: "−",
  attrs: { "aria-label": t().copiesDecAria },
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
    "aria-label": t().copiesInputAria,
  },
});
const copiesIncBtn = el("button", {
  id: "copies-inc-btn",
  type: "button",
  className: "stepper-btn",
  text: "+",
  attrs: { "aria-label": t().copiesIncAria },
});

const invertLabelEl = el("span", { text: t().invertLabel });
const invertToggle = el("input", {
  id: "invert-toggle",
  type: "checkbox",
  className: "apple-switch",
});
const safeGuidesLabelEl = el("span", { text: t().safeGuidesLabel });
const bleedGuidesToggle = el("input", {
  id: "bleed-guides-toggle",
  type: "checkbox",
  className: "apple-switch",
  checked: true,
});

const rasterPanel = el(
  "section",
  { className: "panel", attrs: { "aria-label": t().rasterPanelAria } },
  el(
    "div",
    { className: "panel-title-row" },
    el("div", { className: "panel-heading" }, createIcon("sparkles", 17), rasterPanelTitleEl),
  ),
  el("div", { className: "control-group" }, sizingModeLabelEl, fitModeSegmented),
  el("div", { className: "control-group" }, ditherModeLabelEl, ditherModeSegmented),
  thresholdGroup,
  el("div", { className: "control-group" }, rotationLabelEl, rotationSegmented),
  el(
    "div",
    { className: "control-group" },
    el("div", { className: "threshold-row" }, densityLabelEl, densityValueEl),
    densitySlider,
  ),
  el(
    "div",
    { className: "stepper-row" },
    copiesLabelEl,
    el("div", { className: "stepper" }, copiesDecBtn, copiesInput, copiesIncBtn),
  ),
  el(
    "div",
    { className: "toggles-group" },
    el("label", { className: "switch-row" }, invertLabelEl, invertToggle),
    el("label", { className: "switch-row" }, safeGuidesLabelEl, bleedGuidesToggle),
  ),
);

// --- Right Main Canvas Stage ---
const fileInput = el("input", {
  id: "pdf-input",
  type: "file",
  className: "hidden-input",
  attrs: { accept: "application/pdf,.pdf" },
});
const dropzoneTitleEl = el("div", { className: "dropzone-title", text: t().dropzoneTitle });
const dropzoneHintEl = el("div", { className: "dropzone-hint", text: t().dropzoneHint });
const dropzone = el(
  "div",
  {
    id: "dropzone",
    className: "dropzone",
    role: "button",
    attrs: { tabindex: "0", "aria-label": t().dropzoneAria },
  },
  el("div", { className: "dropzone-icon-badge" }, createIcon("uploadPdf", 24)),
  el("div", { className: "dropzone-copy" }, dropzoneTitleEl, dropzoneHintEl),
  fileInput,
);

const fileMetaEl = el("div", { id: "file-meta", className: "file-meta", text: t().noPdfLoaded });
const statusBanner = el("div", {
  id: "status-banner",
  className: "status-banner",
  text: t().pdfReadyStatus,
});

const previewsHeadingEl = el("h2", { text: t().previewsHeading });
const pageCountBadge = el("span", {
  id: "page-count-badge",
  className: "value-pill",
  text: formatText(t().pagesCountMany, { n: 0 }),
});

const selectAllBtn = el("button", {
  id: "select-all-btn",
  type: "button",
  className: "btn btn-quiet btn-sm",
  text: t().selectAll,
});
const selectNoneBtn = el("button", {
  id: "select-none-btn",
  type: "button",
  className: "btn btn-quiet btn-sm",
  text: t().deselectAll,
});
const batchSummaryEl = el("span", {
  id: "batch-summary",
  className: "batch-summary",
  text: "",
});
const cancelBatchLabel = el("span", { text: t().stopAfterCurrent });
const cancelBatchBtn = el(
  "button",
  {
    id: "cancel-batch-btn",
    type: "button",
    className: "btn btn-danger btn-sm is-hidden",
  },
  createIcon("stop", 14),
  cancelBatchLabel,
);
const printBatchBtnLabel = el("span", { text: "" });
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
  text: t().emptyStateText,
});

const stagePanel = el(
  "section",
  { className: "panel stage-panel", attrs: { "aria-label": t().stagePanelAria } },
  dropzone,
  el("div", { className: "stage-status-row" }, fileMetaEl, statusBanner),
  el("div", { className: "preview-header" }, previewsHeadingEl, pageCountBadge),
  batchToolbar,
  previewContainer,
);

// --- Bottom Collapsible Activity Console ---
const consoleTitleEl = el("span", { text: t().consoleTitle });
const logCountPill = el("span", {
  id: "log-count-pill",
  className: "value-pill",
  text: formatText(t().eventsMany, { n: 0 }),
});
const consoleSubtitleEl = el("span", { text: t().consoleSubtitle });
const clearLogBtn = el("button", {
  id: "clear-log-btn",
  type: "button",
  className: "btn btn-quiet btn-sm",
  text: t().consoleClear,
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
    el("div", { className: "drawer-summary-left" }, createIcon("terminal", 16), consoleTitleEl),
    logCountPill,
  ),
  el("div", { className: "protocol-drawer-toolbar" }, consoleSubtitleEl, clearLogBtn),
  protocolLogEl,
);

const manualModal = createManualModal(state.locale, (nextLocale) => {
  setLocale(nextLocale);
});

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
appShell.append(workspaceGrid, protocolDrawer, manualModal.element);
appRoot.replaceChildren(appShell);

// --- UI State, Localization & Render Helpers ---
function renderStatusBanners(): void {
  statusBanner.textContent = resolveDescriptor(state.lastPdfStatus);
  statusBanner.classList.toggle("is-error", state.lastPdfStatus.isError);

  hwStatusBanner.textContent = resolveDescriptor(state.lastHwStatus);
  hwStatusBanner.classList.toggle("is-error", state.lastHwStatus.isError);
}

function setPdfStatusKey(
  key: keyof UiStrings,
  params?: Record<string, string | number>,
  isError = false,
): void {
  state.lastPdfStatus = { kind: "key", key, params, isError };
  renderStatusBanners();
}

function setHwStatusKey(
  key: keyof UiStrings,
  params?: Record<string, string | number>,
  isError = false,
): void {
  state.lastHwStatus = { kind: "key", key, params, isError };
  renderStatusBanners();
}

function setHwStatusRaw(rawText: string, isError = false): void {
  state.lastHwStatus = { kind: "raw", rawText, isError };
  renderStatusBanners();
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
  const s = t();
  logCountPill.textContent = formatText(state.logCount === 1 ? s.eventsOne : s.eventsMany, {
    n: state.logCount,
  });
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
  const s = t();
  const pState = printer.getState();
  const isReady = pState === "ready" && !state.isRendering;
  const isPrinting = pState === "printing";

  const cardButtons = document.querySelectorAll<HTMLButtonElement>(".card-print-btn");
  for (const btn of cardButtons) {
    btn.disabled = !isReady;
    const labelSpan = btn.querySelector<HTMLSpanElement>(".card-print-btn-label");
    if (labelSpan) {
      labelSpan.textContent = isPrinting
        ? s.cardPrintingBtn
        : pState === "ready"
          ? s.cardPrintBtn
          : s.cardConnectBtn;
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

  batchSummaryEl.textContent = formatText(
    totalStickers === 1 ? s.batchSummaryOne : s.batchSummaryMany,
    {
      selected: selectedCount,
      total: state.pages.length,
      stickers: totalStickers,
    },
  );
  selectAllBtn.disabled = isPrinting || selectedCount === state.pages.length;
  selectNoneBtn.disabled = isPrinting || selectedCount === 0;

  const isAllSelected = selectedCount === state.pages.length;
  printBatchBtn.disabled = !isReady || selectedCount === 0;
  printBatchBtnLabel.textContent = formatText(isAllSelected ? s.printAll : s.printSelected, {
    n: totalStickers,
  });

  const showCancel = activeBatchAbort !== null && isPrinting;
  cancelBatchBtn.classList.toggle("is-hidden", !showCancel);
  cancelBatchBtn.disabled = activeBatchAbort?.signal.aborted ?? true;
  cancelBatchLabel.textContent = activeBatchAbort?.signal.aborted
    ? s.stoppingBatch
    : s.stopAfterCurrent;
}

function resolveTelemetryStateLabel(snap: PrinterTelemetrySnapshot): string {
  const s = t();
  if (snap.state === "printing") return s.statusPrinting;
  if (snap.state === "calibrating") return s.statusCalibrating;
  if (snap.state === "connecting") {
    return snap.transport === "ble" ? s.statusScanningBle : s.statusConnectingUsb;
  }
  if (snap.state === "error") return s.statusError;
  if (snap.state === "ready") {
    return snap.transport === "ble"
      ? s.statusReadyBle
      : snap.transport === "usb"
        ? s.statusReadyUsb
        : s.statusReadyGeneric;
  }
  return s.statusDisconnected;
}

function updateHardwareUi(snap: PrinterTelemetrySnapshot): void {
  const s = t();
  const isBusy =
    snap.state === "connecting" || snap.state === "calibrating" || snap.state === "printing";
  const isReady = snap.state === "ready";
  const isConnected = isReady || snap.state === "calibrating" || snap.state === "printing";

  hwDot.className = "hardware-dot";
  deviceShowcasePod.className = "device-showcase-pod";
  if (isReady) {
    hwDot.classList.add("is-ready");
    deviceShowcasePod.classList.add("is-ready");
  } else if (isBusy) {
    hwDot.classList.add("is-busy");
    deviceShowcasePod.classList.add("is-busy");
  } else if (snap.state === "error") {
    hwDot.classList.add("is-error");
  }

  const stateLabel = resolveTelemetryStateLabel(snap);
  devicePodStatusEl.textContent = stateLabel;

  if (isConnected) {
    const battTag = snap.batteryPct !== null ? ` · ${snap.batteryPct}%` : "";
    const devLabel = snap.deviceName ?? "Niimbot B1";
    const statusText =
      snap.state === "ready"
        ? stateLabel
        : `${stateLabel} (${snap.transport === "ble" ? "BLE" : "USB-C"})`;
    hwBadgeText.textContent = `${devLabel}${battTag} · ${statusText}`;
  } else {
    hwBadgeText.textContent = stateLabel;
    if (snap.state === "disconnected" && snap.lastError) {
      setHwStatusRaw(snap.lastError, true);
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
    telSpoolEl.textContent = s.statusDisconnected;
  } else {
    const fw = snap.firmwareVersion ? ` (FW ${snap.firmwareVersion})` : "";
    telModelEl.textContent = `${snap.modelName ?? "B1"} · ${snap.printheadPixels ?? 384}px${fw}`;
    const batt = snap.batteryPct !== null ? `${snap.batteryPct}%` : "n/a";
    const pacing = snap.packetIntervalMs !== null ? `${snap.packetIntervalMs}ms` : "";
    telBatteryEl.textContent = `${batt} · ${snap.transport?.toUpperCase() ?? ""} ${pacing}`.trim();

    const lidText = snap.lidClosed === null ? s.lidNa : snap.lidClosed ? s.lidClosed : s.lidOpen;
    const paperText =
      snap.paperInserted === null ? s.paperNa : snap.paperInserted ? s.paperLoaded : s.paperEmpty;
    telSensorsEl.textContent = `${lidText} · ${paperText}`;
    telSpoolEl.textContent = snap.rfidTagPresent ? snap.spoolSummary : s.rollManualGap;
  }

  printProgressBox.classList.toggle("is-hidden", snap.state !== "printing");
  syncPrintAndBatchControls();
}

function updateProgressUi(progress: PrintLiveProgress): void {
  state.lastProgress = progress;
  const s = t();
  printProgressBox.classList.remove("is-hidden");
  const pct =
    progress.phase === "transfer"
      ? progress.packetTransferPct
      : Math.max(progress.pagePrintPct, progress.pageFeedPct);
  printProgressBar.value = Math.min(100, Math.max(0, pct));

  const batchPrefix =
    progress.totalBatchPages && progress.totalBatchPages > 1
      ? formatText(s.progBatchPrefix, {
          current: progress.currentPage,
          total: progress.totalPages,
          batchPage: progress.currentBatchPage ?? progress.currentPage,
          batchTotal: progress.totalBatchPages,
        })
      : "";

  printProgressLabel.textContent =
    progress.phase === "init"
      ? formatText(s.progInit, { prefix: batchPrefix })
      : progress.phase === "transfer"
        ? formatText(s.progTransfer, { prefix: batchPrefix, pct: progress.packetTransferPct })
        : progress.phase === "printing"
          ? formatText(s.progPrinting, {
              prefix: batchPrefix,
              current: progress.currentPage,
              total: progress.totalPages,
              printPct: progress.pagePrintPct,
              feedPct: progress.pageFeedPct,
            })
          : progress.phase === "cancelled"
            ? s.progStopping
            : progress.phase === "cleanup"
              ? s.progCleanup
              : s.progDone;
}

function updateThresholdVisibility(): void {
  const isThreshold = state.options.ditherMode === "threshold";
  thresholdGroup.classList.toggle("is-hidden", !isThreshold);
}

async function handlePrintSinglePage(page: RenderedLabelPage): Promise<void> {
  const s = t();
  setHwStatusKey("hwPrintingSingle", {
    page: page.pageNumber,
    copies: state.copies,
    copyWord: state.copies === 1 ? s.wordCopyOne : s.wordCopyMany,
    density: state.density,
    labelType: state.labelType,
  });
  try {
    await printer.printSingleLabel(page.encodedImage, {
      density: state.density,
      labelType: state.labelType,
      copies: state.copies,
    });
    const cur = t();
    setHwStatusKey("hwPrintedSingle", {
      page: page.pageNumber,
      copies: state.copies,
      stickerWord: state.copies === 1 ? cur.wordStickerOne : cur.wordStickerMany,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    setHwStatusKey("hwPrintSingleFailed", { page: page.pageNumber, err: msg }, true);
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

  const s = t();
  setHwStatusKey("hwBatchStarting", {
    pages: selected.length,
    pageWord: selected.length === 1 ? s.wordPageOne : s.wordPageMany,
    stickers: totalStickers,
    stickerWord: totalStickers === 1 ? s.wordStickerOne : s.wordStickerMany,
  });

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

    const cur = t();
    if (result.cancelled) {
      setHwStatusKey("hwBatchStopped", {
        printed: result.totalStickersPrinted,
        stickerWord: result.totalStickersPrinted === 1 ? cur.wordStickerOne : cur.wordStickerMany,
        completed: result.completedPages,
        selected: selected.length,
      });
    } else {
      setHwStatusKey("hwBatchDone", {
        printed: result.totalStickersPrinted,
        stickerWord: result.totalStickersPrinted === 1 ? cur.wordStickerOne : cur.wordStickerMany,
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    setHwStatusKey("hwBatchFailed", { err: msg }, true);
  } finally {
    activeBatchAbort = null;
    syncPrintAndBatchControls();
  }
}

function renderPreviewCards(): void {
  const s = t();
  pageCountBadge.textContent = formatText(
    state.pages.length === 1 ? s.pagesCountOne : s.pagesCountMany,
    { n: state.pages.length },
  );

  if (state.pages.length === 0) {
    previewContainer.className = "empty-state";
    previewContainer.textContent = s.emptyStateText;
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
    const title = el("span", {
      text: formatText(s.cardPage, { n: page.pageNumber }),
    });
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
      : formatText(s.cardNon50mm, {
          w: page.sourceWidthMm.toFixed(1),
          h: page.sourceHeightMm.toFixed(1),
        });
    head.append(selectPill, sizePill);

    const frame = document.createElement("div");
    frame.className = "sticker-frame";
    frame.title = s.cardFrameTitle;
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
        text: formatText(s.cardMetaDims, {
          w: page.widthPx,
          h: page.heightPx,
          pkts: page.encodedImage.rowsData.length,
        }),
      }),
      el("div", {
        text: formatText(s.cardMetaInk, {
          dots: page.blackPixelsCount.toLocaleString(state.locale),
          pct: coveragePct,
        }),
      }),
    );

    const printBtn = el(
      "button",
      {
        type: "button",
        className: "btn btn-primary card-print-btn",
      },
      createIcon("printer", 15),
      el("span", { className: "card-print-btn-label", text: s.cardPrintBtn }),
    );
    printBtn.addEventListener("click", () => {
      void handlePrintSinglePage(page);
    });

    card.append(head, liner, meta, printBtn);
    previewContainer.append(card);
  }

  syncPrintAndBatchControls();
}

function applyAllTranslations(): void {
  const s = t();

  // Topbar
  modelBadgeEl.textContent = s.modelBadge;
  topbarSubtitleEl.textContent = s.topbarSubtitle;
  manualBtn.title = s.manualBtnTitle;
  manualBtnLabel.textContent = s.manualBtn;
  installPwaBtnLabel.textContent = s.installApp;
  langSegmented.setAttribute("aria-label", s.langGroupAria);
  for (const btn of langButtons) {
    const btnLoc = btn.dataset.locale;
    const active = btnLoc === state.locale;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-checked", String(active));
    btn.setAttribute("aria-label", btnLoc === "pt-BR" ? s.langPtAria : s.langEnAria);
  }
  themeSegmented.setAttribute("aria-label", s.themeGroupAria);
  for (const btn of themeButtons) {
    const mode = btn.dataset.themeMode as ThemeMode;
    const label = mode === "light" ? s.themeLight : mode === "dark" ? s.themeDark : s.themeAuto;
    btn.setAttribute("aria-label", label);
    const span = btn.querySelector("span");
    if (span) {
      span.textContent = label;
    }
  }

  renderCapabilityWarning();

  // Printer & Sensor Card
  hardwarePanel.setAttribute("aria-label", s.printerPanelAria);
  printerPanelTitleEl.textContent = s.printerPanelTitle;
  refreshTelemetryBtn.title = s.refreshBtnTitle;
  refreshBtnLabel.textContent = s.refreshBtn;

  devicePodImg.alt = s.devicePodAlt;
  devicePodTitleEl.textContent = s.devicePodTitle;
  devicePodSpecEl.textContent = s.devicePodSpec;
  devicePodGuideBtn.textContent = s.devicePodGuideLink;

  connectUsbLabel.textContent = s.connectUsb;
  connectBleLabel.textContent = s.connectBle;
  filterVidLabelRow.title = s.filterVidTitle;
  filterVidTextEl.textContent = s.filterVid;
  disconnectBtnLabel.textContent = s.disconnect;
  renderTipsDisclosure();

  telModelKeyEl.textContent = s.telModel;
  telBatteryKeyEl.textContent = s.telBattery;
  telSensorsKeyEl.textContent = s.telPaperLid;
  telSpoolKeyEl.textContent = s.telRoll;

  sensorModeLabelEl.textContent = s.sensorModeLabel;
  sensorOptWithGaps.textContent = s.sensorWithGaps;
  sensorOptTransparent.textContent = s.sensorTransparent;
  sensorOptBlack.textContent = s.sensorBlackMark;

  gapAlignmentLabelEl.textContent = s.gapAlignmentLabel;
  feedGapBtn.title = s.feedGapTitle;
  feedGapLabel.textContent = s.feedGapBtn;
  calibrateSensorBtn.title = s.calibrateTitle;
  calibrateBtnLabel.textContent = s.calibrateBtn;

  // Raster & Thermal Engine Card
  rasterPanel.setAttribute("aria-label", s.rasterPanelAria);
  rasterPanelTitleEl.textContent = s.rasterPanelTitle;
  sizingModeLabelEl.textContent = s.sizingModeLabel;
  fitModeSegmented.setAttribute("aria-label", s.sizingGroupAria);
  for (const btn of fitModeButtons) {
    btn.textContent = btn.dataset.fitMode === "fit" ? s.fitScale : s.fitBleed;
  }

  ditherModeLabelEl.textContent = s.ditherModeLabel;
  ditherModeSegmented.setAttribute("aria-label", s.ditherGroupAria);
  for (const btn of ditherModeButtons) {
    btn.textContent = btn.dataset.ditherMode === "threshold" ? s.ditherThreshold : s.ditherAtkinson;
  }

  thresholdLabelEl.textContent = s.thresholdLabel;
  rotationLabelEl.textContent = s.rotationLabel;
  rotationSegmented.setAttribute("aria-label", s.rotationGroupAria);
  densityLabelEl.textContent = s.densityLabel;
  copiesLabelEl.textContent = s.copiesLabel;
  copiesDecBtn.setAttribute("aria-label", s.copiesDecAria);
  copiesIncBtn.setAttribute("aria-label", s.copiesIncAria);
  copiesInput.setAttribute("aria-label", s.copiesInputAria);
  invertLabelEl.textContent = s.invertLabel;
  safeGuidesLabelEl.textContent = s.safeGuidesLabel;

  // Stage & Previews
  stagePanel.setAttribute("aria-label", s.stagePanelAria);
  dropzone.setAttribute("aria-label", s.dropzoneAria);
  dropzoneTitleEl.textContent = s.dropzoneTitle;
  dropzoneHintEl.textContent = s.dropzoneHint;
  fileMetaEl.textContent = state.fileMeta
    ? `${state.fileMeta.name} (${state.fileMeta.sizeKb} KB)`
    : s.noPdfLoaded;

  previewsHeadingEl.textContent = s.previewsHeading;
  selectAllBtn.textContent = s.selectAll;
  selectNoneBtn.textContent = s.deselectAll;

  // Activity Console
  consoleTitleEl.textContent = s.consoleTitle;
  consoleSubtitleEl.textContent = s.consoleSubtitle;
  clearLogBtn.textContent = s.consoleClear;
  logCountPill.textContent = formatText(state.logCount === 1 ? s.eventsOne : s.eventsMany, {
    n: state.logCount,
  });

  // Live dynamic states
  updateHardwareUi(printer.getTelemetrySnapshot());
  if (state.lastProgress && printer.getState() === "printing") {
    updateProgressUi(state.lastProgress);
  } else {
    printProgressLabel.textContent = s.progIdle;
  }
  renderStatusBanners();
  renderPreviewCards();
  manualModal.setLocale(state.locale);
}

function setLocale(nextLocale: Locale): void {
  if (state.locale === nextLocale) {
    return;
  }
  state.locale = nextLocale;
  applyDocumentLocale(nextLocale, true);
  applyAllTranslations();
}

async function runRasterPipeline(resetSelection = false): Promise<void> {
  if (!state.pdfBytes) {
    return;
  }

  const currentSeq = ++renderSeq;
  state.isRendering = true;
  syncPrintAndBatchControls();
  setPdfStatusKey("pdfRasterizing", { name: state.fileName ?? "PDF" });

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
    setPdfStatusKey(renderedPages.length === 1 ? "pdfRenderedOne" : "pdfRenderedMany", {
      count: renderedPages.length,
    });
  } catch (err) {
    if (currentSeq !== renderSeq) {
      return;
    }
    state.isRendering = false;
    state.pages = [];
    state.selectedPageNumbers.clear();
    renderPreviewCards();
    const message = err instanceof Error ? err.message : String(err);
    setPdfStatusKey("pdfFailed", { err: message }, true);
  }
}

async function handleSelectedFile(file: File): Promise<void> {
  if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
    setPdfStatusKey("pdfUnsupported", { name: file.name }, true);
    return;
  }
  if (file.size === 0) {
    setPdfStatusKey("pdfEmpty", { name: file.name }, true);
    return;
  }
  if (file.size > MAX_PDF_BYTES) {
    setPdfStatusKey(
      "pdfOversized",
      {
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(1),
        max: Math.round(MAX_PDF_BYTES / (1024 * 1024)),
      },
      true,
    );
    return;
  }

  const buffer = await file.arrayBuffer();
  state.fileName = file.name;
  state.fileMeta = {
    name: file.name,
    sizeKb: (file.size / 1024).toFixed(1),
  };
  state.pdfBytes = new Uint8Array(buffer);
  fileMetaEl.textContent = `${state.fileMeta.name} (${state.fileMeta.sizeKb} KB)`;
  await runRasterPipeline(true);
}

// --- Subscriptions & Event Listeners ---
printer.onLog(appendLogEntry);
printer.onStateChange(updateHardwareUi);
printer.onProgress(updateProgressUi);

manualBtn.addEventListener("click", () => {
  manualModal.open("quickstart");
});

devicePodGuideBtn.addEventListener("click", () => {
  manualModal.open("hardware");
});

for (const btn of langButtons) {
  btn.addEventListener("click", () => {
    const loc = btn.dataset.locale;
    if (loc !== "en" && loc !== "pt-BR") {
      return;
    }
    setLocale(loc);
  });
}

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
  setHwStatusKey("hwOpeningUsb");
  try {
    const connected = await printer.connectUsb({
      filterKnownVendors: state.filterKnownUsbVendors,
    });
    setHwStatusKey(connected ? "hwConnectedUsb" : "hwCancelledUsb");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    setHwStatusRaw(msg, true);
  }
});

connectBleBtn.addEventListener("click", async () => {
  setHwStatusKey("hwScanningBle");
  try {
    const connected = await printer.connectBle();
    setHwStatusKey(connected ? "hwConnectedBle" : "hwCancelledBle");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    setHwStatusRaw(msg, true);
  }
});

disconnectBtn.addEventListener("click", async () => {
  await printer.disconnect();
  setHwStatusKey("hwDisconnected");
});

refreshTelemetryBtn.addEventListener("click", async () => {
  try {
    await printer.refreshTelemetry();
    setHwStatusKey("hwTelemetryRefreshed");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    setHwStatusRaw(msg, true);
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
  setHwStatusKey("hwFeedingGap");
  try {
    await printer.feedBlankToGap(state.labelType);
    setHwStatusKey("hwFedGap");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    setHwStatusKey("hwFeedFailed", { err: msg }, true);
  }
});

calibrateSensorBtn.addEventListener("click", async () => {
  setHwStatusKey("hwCalibrating");
  try {
    await printer.calibrateGapSensor(state.labelType);
    setHwStatusKey("hwCalibrated");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    setHwStatusKey("hwCalibrateFailed", { err: msg }, true);
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
  logCountPill.textContent = formatText(t().eventsMany, { n: 0 });
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

applyAllTranslations();
updateThresholdVisibility();
syncCopiesStepper();
