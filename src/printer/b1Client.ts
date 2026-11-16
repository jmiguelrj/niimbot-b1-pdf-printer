import {
  LabelType,
  NiimbotBluetoothClient,
  NiimbotSerialClient,
  PacketGenerator,
  PageColorType,
  PrintError,
  type CombinedRfidInfo,
  type ConnectionInfo,
  type EncodedImage,
  type HeartbeatData,
  type HeartbeatEvent,
  type HeartbeatFailedEvent,
  type NiimbotPacket,
  type PrintOptions,
  type PrintPacketProgressEvent,
  type PrintProgressEvent,
  type PrinterInfo,
  type PrinterModelMeta,
  type RfidInfoFetchedEvent,
} from "@mmote/niimbluelib";
import { LABEL_HEIGHT_PX, LABEL_WIDTH_PX } from "../pdf/binarizer.ts";

export type PrinterControllerState =
  | "disconnected"
  | "connecting"
  | "ready"
  | "calibrating"
  | "printing"
  | "error";

export type TransportKind = "usb" | "ble";

export type ProtocolLogLevel = "info" | "warn" | "error";

export interface ProtocolLogEntry {
  timestamp: string;
  level: ProtocolLogLevel;
  message: string;
}

export interface PrintLiveProgress {
  phase: "init" | "transfer" | "printing" | "cleanup" | "cancelled" | "done";
  packetTransferPct: number;
  pagePrintPct: number;
  pageFeedPct: number;
  currentPage: number;
  totalPages: number;
  currentBatchPage?: number;
  totalBatchPages?: number;
}

export interface BatchPrintProgress {
  phase: "init" | "transfer" | "printing" | "cleanup" | "cancelled" | "done";
  currentStickerIndex: number;
  totalStickers: number;
  currentPageIndex: number;
  totalDistinctPages: number;
  packetTransferPct: number;
  pagePrintPct: number;
  pageFeedPct: number;
}

export interface BatchPrintResult {
  completedPages: number;
  totalStickersPrinted: number;
  cancelled: boolean;
}

export interface PrinterTelemetrySnapshot {
  state: PrinterControllerState;
  transport: TransportKind | null;
  deviceName: string | null;
  packetIntervalMs: number | null;
  modelName: string | null;
  modelId: number | null;
  printheadPixels: number | null;
  isExpectedB1Width: boolean;
  modelWarning: string | null;
  firmwareVersion: string | null;
  hardwareVersion: string | null;
  serialNumber: string | null;
  batteryPct: number | null;
  lidClosed: boolean | null;
  paperInserted: boolean | null;
  rfidTagPresent: boolean;
  spoolSummary: string;
  remainingLabels: number | null;
  lastError: string | null;
}

export interface BrowserTransportCapabilities {
  webSerialSupported: boolean;
  webBluetoothSupported: boolean;
  isSecureContext: boolean;
}

export interface SinglePrintJobOptions {
  density?: number;
  labelType?: LabelType;
  copies?: number;
  statusPollIntervalMs?: number;
  pageTimeoutMs?: number;
  statusTimeoutMs?: number;
}

export interface BatchPrintJobOptions {
  density?: number;
  labelType?: LabelType;
  copiesPerPage?: number;
  statusPollIntervalMs?: number;
  pageTimeoutMs?: number;
  statusTimeoutMs?: number;
}

export interface UsbConnectOptions {
  filterKnownVendors?: boolean;
}

/** Minimal structural interfaces enabling deterministic unit testing without hardware */
export interface PrintTaskLike {
  printInit(): Promise<void>;
  printPage(image: EncodedImage, quantity?: number): Promise<void>;
  waitForPageFinished(): Promise<void>;
  waitForFinished(): Promise<void>;
  printEnd(): Promise<boolean>;
}

export interface ProtocolLike {
  newPrintTask(name: "B1", options?: Partial<PrintOptions>): PrintTaskLike;
  send(packet: NiimbotPacket, forceTimeout?: number): Promise<NiimbotPacket>;
  labelPositioningCalibration(value: number): Promise<boolean>;
}

export interface TransportClientLike {
  readonly protocol: ProtocolLike;
  connect(): Promise<ConnectionInfo>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  setPacketInterval(milliseconds: number): void;
  getPacketInterval(): number;
  startHeartbeat(): void;
  stopHeartbeat(): void;
  fetchPrinterInfo(): Promise<PrinterInfo>;
  fetchRfidInfo(): Promise<CombinedRfidInfo>;
  fetchHeartbeatData(): Promise<HeartbeatData | undefined>;
  getPrinterInfo(): PrinterInfo;
  getRfidInfo(): CombinedRfidInfo;
  getHeartbeatData(): HeartbeatData;
  getModelMetadata(): PrinterModelMeta | undefined;
  on(event: "disconnect", fn: () => void): unknown;
  on(event: "heartbeat", fn: (evt: HeartbeatEvent) => void): unknown;
  on(event: "heartbeatfailed", fn: (evt: HeartbeatFailedEvent) => void): unknown;
  on(event: "rfidinfofetched", fn: (evt: RfidInfoFetchedEvent) => void): unknown;
  on(event: "printpacketprogress", fn: (evt: PrintPacketProgressEvent) => void): unknown;
  on(event: "printprogress", fn: (evt: PrintProgressEvent) => void): unknown;
  removeAllListeners(): unknown;
}

export interface SerialTransportClientLike extends TransportClientLike {
  connect(options?: { authorizedPort?: SerialPort }): Promise<ConnectionInfo>;
}

export interface B1ControllerDependencies {
  createSerialClient?: () => SerialTransportClientLike;
  createBluetoothClient?: () => TransportClientLike;
  requestUsbPort?: (filters: SerialPortFilter[]) => Promise<SerialPort>;
}

/** Niimbot B1 native USB VID/PID (0x3513:0x0002 via built-in Windows usbser.sys) + CH34x fallback (0x1a86) */
export const NIIMBOT_USB_FILTERS: SerialPortFilter[] = [
  { usbVendorId: 0x3513, usbProductId: 0x0002 },
  { usbVendorId: 0x3513 },
  { usbVendorId: 0x1a86 },
];

export const DEFAULT_PRINT_DENSITY = 3;
export const MIN_PRINT_DENSITY = 1;
export const MAX_PRINT_DENSITY = 5;
export const DEFAULT_LABEL_TYPE: LabelType = LabelType.WithGaps;
export const MAX_SINGLE_PRINT_COPIES = 20;

/** Transport-specific packet pacing & timeout defaults verified against @mmote/niimbluelib */
export const USB_PACKET_INTERVAL_MS = 10;
export const BLE_PACKET_INTERVAL_MS = 20; // Prevents Win11 GATT writeWithoutResponse 58-byte row buffer drops
export const USB_PAGE_TIMEOUT_MS = 15_000;
export const BLE_PAGE_TIMEOUT_MS = 30_000; // 400 rows * 20ms = 8s max raw transfer + generous GATT margin
export const USB_STATUS_POLL_INTERVAL_MS = 100;
export const BLE_STATUS_POLL_INTERVAL_MS = 250;
export const USB_STATUS_TIMEOUT_MS = 8_000;
export const BLE_STATUS_TIMEOUT_MS = 12_000;

export function detectBrowserTransportCapabilities(): BrowserTransportCapabilities {
  const hasNavigator = typeof navigator !== "undefined";
  const webSerialSupported = hasNavigator && typeof navigator.serial !== "undefined";
  const webBluetoothSupported = hasNavigator && typeof navigator.bluetooth !== "undefined";
  const secure = typeof window !== "undefined" ? window.isSecureContext : true;
  return {
    webSerialSupported,
    webBluetoothSupported,
    isSecureContext: secure,
  };
}

function isUserCancelledError(err: unknown): boolean {
  if (!(err instanceof Error)) {
    return false;
  }
  const msg = err.message.toLowerCase();
  return (
    err.name === "NotFoundError" ||
    msg.includes("no port selected") ||
    msg.includes("no device selected") ||
    msg.includes("user cancelled") ||
    msg.includes("user canceled")
  );
}

export function formatHardwareError(err: unknown, transport: TransportKind | null): string {
  if (err instanceof PrintError) {
    return `Printer reported error (code ${err.reasonId}): ${err.message}`;
  }
  if (err instanceof Error) {
    const lower = err.message.toLowerCase();
    if (
      transport === "usb" &&
      (err.name === "NetworkError" ||
        lower.includes("failed to open serial port") ||
        lower.includes("access is denied"))
    ) {
      return (
        "Failed to open USB serial port (the Windows COM port may be locked by Niimbot Desktop, another browser tab, " +
        "or a serial monitor). Close other apps using the printer, unplug/replug USB-C if needed, and retry."
      );
    }
    if (
      transport === "ble" &&
      (err.name === "NetworkError" ||
        lower.includes("gatt") ||
        lower.includes("bluetooth adapter not available"))
    ) {
      return (
        `Bluetooth BLE connection failed (${err.message}). Ensure Windows Bluetooth is ON, unplug any PC USB-C data cable ` +
        "from the B1, disconnect the mobile Niimbot app, and wake the printer."
      );
    }
    return err.message;
  }
  return String(err);
}

function buildBlankGapAlignmentImage(): EncodedImage {
  return {
    cols: LABEL_WIDTH_PX,
    rows: LABEL_HEIGHT_PX,
    pageColor: PageColorType.SingleColor,
    rowsData: [
      {
        dataType: "void",
        rowNumber: 0,
        repeat: 200,
        blackPixelsCount: 0,
        redPixelsCount: 0,
      },
      {
        dataType: "check",
        rowNumber: 199,
        repeat: 0,
        blackPixelsCount: 0,
        redPixelsCount: 0,
      },
      {
        dataType: "void",
        rowNumber: 200,
        repeat: 200,
        blackPixelsCount: 0,
        redPixelsCount: 0,
      },
      {
        dataType: "check",
        rowNumber: 399,
        repeat: 0,
        blackPixelsCount: 0,
        redPixelsCount: 0,
      },
    ],
  };
}

function describeSpool(rfid: CombinedRfidInfo): {
  tagPresent: boolean;
  summary: string;
  remaining: number | null;
} {
  const tag = rfid.labelRfidInfo;
  const paper = rfid.paperInfo;

  if (tag?.tagPresent) {
    const remaining = Math.max(0, tag.allPaper - tag.usedPaper);
    const sizeText =
      paper?.valid && paper.paperWidth && paper.paperHeight
        ? `${paper.paperWidth}×${paper.paperHeight} mm`
        : "RFID Spool";
    return {
      tagPresent: true,
      summary: `${sizeText} · ${remaining}/${tag.allPaper} stickers left (SN: ${tag.serialNumber || "n/a"})`,
      remaining,
    };
  }

  return {
    tagPresent: false,
    summary: "Manual 50×50 mm Gap Roll (WithGaps active)",
    remaining: null,
  };
}

export class B1PrinterController {
  private state: PrinterControllerState = "disconnected";
  private transport: TransportKind | null = null;
  private client: TransportClientLike | null = null;
  private operationInFlight = false;
  private intentionalDisconnect = false;
  private deviceName: string | null = null;
  private lastError: string | null = null;
  private activeBatchPageIndex = 1;
  private activeBatchTotalPages = 1;
  private readonly logs: ProtocolLogEntry[] = [];

  private readonly stateListeners = new Set<(snapshot: PrinterTelemetrySnapshot) => void>();
  private readonly logListeners = new Set<(entry: ProtocolLogEntry) => void>();
  private readonly progressListeners = new Set<(progress: PrintLiveProgress) => void>();

  private readonly deps: B1ControllerDependencies;
  private readonly beforeUnloadHandler: () => void;

  constructor(deps: B1ControllerDependencies = {}) {
    this.deps = deps;
    this.beforeUnloadHandler = () => {
      void this.disconnect();
    };
    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", this.beforeUnloadHandler);
    }
  }

  getState(): PrinterControllerState {
    return this.state;
  }

  getTransport(): TransportKind | null {
    return this.transport;
  }

  getLogs(): readonly ProtocolLogEntry[] {
    return this.logs;
  }

  onStateChange(listener: (snapshot: PrinterTelemetrySnapshot) => void): () => void {
    this.stateListeners.add(listener);
    listener(this.getTelemetrySnapshot());
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  onLog(listener: (entry: ProtocolLogEntry) => void): () => void {
    this.logListeners.add(listener);
    return () => {
      this.logListeners.delete(listener);
    };
  }

  onProgress(listener: (progress: PrintLiveProgress) => void): () => void {
    this.progressListeners.add(listener);
    return () => {
      this.progressListeners.delete(listener);
    };
  }

  getTelemetrySnapshot(): PrinterTelemetrySnapshot {
    const info = this.client?.getPrinterInfo();
    const meta = this.client?.getModelMetadata();
    const hb = this.client?.getHeartbeatData();
    const rfid = this.client?.getRfidInfo() ?? {};
    const spool = describeSpool(rfid);

    const detectedPixels = meta?.printheadPixels ?? info?.printheadWidth ?? null;
    const isExpectedB1Width = detectedPixels === null || detectedPixels === LABEL_WIDTH_PX;
    const modelName = meta?.model ?? null;

    let modelWarning: string | null = null;
    if (this.client?.isConnected()) {
      if (detectedPixels !== null && detectedPixels !== LABEL_WIDTH_PX) {
        modelWarning = `Connected model (${modelName ?? "Unknown"}) has ${detectedPixels}px printhead; rasterizer targets 384px B1 head.`;
      } else if (modelName && !modelName.startsWith("B1") && detectedPixels !== LABEL_WIDTH_PX) {
        modelWarning = `Connected model is ${modelName} (expected Niimbot B1 384px).`;
      }
    }

    return {
      state: this.state,
      transport: this.transport,
      deviceName: this.deviceName,
      packetIntervalMs: this.client?.isConnected() ? this.client.getPacketInterval() : null,
      modelName,
      modelId: info?.modelId ?? null,
      printheadPixels: detectedPixels,
      isExpectedB1Width,
      modelWarning,
      firmwareVersion: info?.softwareVersion ?? null,
      hardwareVersion: info?.hardwareVersion ?? null,
      serialNumber: info?.serial ?? null,
      batteryPct: hb?.batteryPercents ?? info?.batteryPercents ?? null,
      lidClosed: hb?.lidClosed ?? null,
      paperInserted: hb?.paperInserted ?? null,
      rfidTagPresent: spool.tagPresent,
      spoolSummary: this.client?.isConnected() ? spool.summary : "Disconnected",
      remainingLabels: spool.remaining,
      lastError: this.lastError,
    };
  }

  async connectUsb(options: UsbConnectOptions = {}): Promise<boolean> {
    if (this.operationInFlight) {
      throw new Error("Another printer operation is currently in progress.");
    }

    await this.disconnect();
    this.operationInFlight = true;
    this.transport = "usb";
    this.lastError = null;
    this.setState("connecting");

    const filterKnownVendors = options.filterKnownVendors ?? true;
    const serialClient =
      this.deps.createSerialClient?.() ?? new NiimbotSerialClient();

    try {
      let authorizedPort: SerialPort | undefined;
      if (this.deps.requestUsbPort) {
        authorizedPort = await this.deps.requestUsbPort(
          filterKnownVendors ? NIIMBOT_USB_FILTERS : [],
        );
      } else if (typeof navigator !== "undefined" && navigator.serial) {
        this.log(
          "info",
          filterKnownVendors
            ? "Requesting WebSerial port (filtered for Niimbot VID_3513 / PID_0002 — dynamic Windows COM port)..."
            : "Requesting WebSerial port (showing all Windows COM ports)...",
        );
        authorizedPort = await navigator.serial.requestPort(
          filterKnownVendors ? { filters: NIIMBOT_USB_FILTERS } : undefined,
        );
      } else if (!this.deps.createSerialClient) {
        throw new Error(
          "WebSerial API is unavailable in this browser. Open in Microsoft Edge or Google Chrome over HTTPS or localhost.",
        );
      }

      serialClient.setPacketInterval(USB_PACKET_INTERVAL_MS);
      this.attachClientEvents(serialClient, "usb");
      const connInfo = await serialClient.connect(
        authorizedPort ? { authorizedPort } : undefined,
      );
      this.client = serialClient;
      this.deviceName = connInfo.deviceName ?? "USB Serial (VID:3513 PID:0002)";
      await serialClient.fetchHeartbeatData();
      this.log(
        "info",
        `USB Serial Connected: ${this.deviceName} [packetInterval=${serialClient.getPacketInterval()}ms]`,
      );
      this.operationInFlight = false;
      this.setState("ready");
      return true;
    } catch (err) {
      this.operationInFlight = false;
      serialClient.removeAllListeners();
      await serialClient.disconnect().catch(() => undefined);
      this.client = null;

      if (isUserCancelledError(err)) {
        this.transport = null;
        this.log("info", "USB-C port picker closed without selection.");
        this.setState("disconnected");
        return false;
      }

      const formatted = formatHardwareError(err, "usb");
      this.lastError = formatted;
      this.log("error", `USB connect failed: ${formatted}`);
      this.setState("error");
      throw new Error(formatted);
    }
  }

  async connectBle(): Promise<boolean> {
    if (this.operationInFlight) {
      throw new Error("Another printer operation is currently in progress.");
    }

    await this.disconnect();
    this.operationInFlight = true;
    this.transport = "ble";
    this.lastError = null;
    this.setState("connecting");

    const bleClient =
      this.deps.createBluetoothClient?.() ?? new NiimbotBluetoothClient();

    try {
      if (
        !this.deps.createBluetoothClient &&
        (typeof navigator === "undefined" || !navigator.bluetooth)
      ) {
        throw new Error(
          "WebBluetooth API is unavailable in this browser. Open in Microsoft Edge or Google Chrome over HTTPS or localhost.",
        );
      }

      bleClient.setPacketInterval(BLE_PACKET_INTERVAL_MS);
      this.log(
        "info",
        `Scanning for Niimbot B1 over WebBluetooth BLE (service e7810a71-..., packetInterval=${BLE_PACKET_INTERVAL_MS}ms)...`,
      );
      this.attachClientEvents(bleClient, "ble");
      const connInfo = await bleClient.connect();
      this.client = bleClient;
      this.deviceName = connInfo.deviceName ?? "B1";
      await bleClient.fetchHeartbeatData();
      this.log(
        "info",
        `Bluetooth BLE Connected: ${this.deviceName} [packetInterval=${bleClient.getPacketInterval()}ms]`,
      );
      this.operationInFlight = false;
      this.setState("ready");
      return true;
    } catch (err) {
      this.operationInFlight = false;
      bleClient.removeAllListeners();
      await bleClient.disconnect().catch(() => undefined);
      this.client = null;

      if (isUserCancelledError(err)) {
        this.transport = null;
        this.log("info", "Bluetooth BLE picker closed without selection.");
        this.setState("disconnected");
        return false;
      }

      const formatted = formatHardwareError(err, "ble");
      this.lastError = formatted;
      this.log("error", `BLE connect failed: ${formatted}`);
      this.setState("error");
      throw new Error(formatted);
    }
  }

  async disconnect(): Promise<void> {
    const activeClient = this.client;
    this.intentionalDisconnect = true;
    this.client = null;
    this.deviceName = null;
    this.transport = null;
    this.operationInFlight = false;
    this.lastError = null;

    try {
      if (activeClient) {
        activeClient.stopHeartbeat();
        activeClient.removeAllListeners();
        await activeClient.disconnect().catch(() => undefined);
        this.log("info", "Disconnected printer transport cleanly.");
      }
    } finally {
      this.intentionalDisconnect = false;
    }

    this.setState("disconnected");
  }

  async refreshTelemetry(): Promise<PrinterTelemetrySnapshot> {
    const client = this.requireIdleConnectedClient();
    this.log("info", "Refreshing heartbeat & RFID spool telemetry...");
    await client.fetchHeartbeatData();
    await client.fetchRfidInfo();
    const snap = this.getTelemetrySnapshot();
    this.emitState();
    return snap;
  }

  /**
   * Advances strictly 1 blank 50x50mm sticker (zero thermal head heat) using `LabelType.WithGaps`
   * so the die-cut gap aligns cleanly with the tear bar without wasting ~15cm of paper.
   */
  async feedBlankToGap(labelType: LabelType = DEFAULT_LABEL_TYPE): Promise<void> {
    const blankImage = buildBlankGapAlignmentImage();
    this.log("info", `Advancing 1 blank sticker to optical gap (labelType=${labelType})...`);
    await this.printSingleLabel(blankImage, {
      density: MIN_PRINT_DENSITY,
      labelType,
      copies: 1,
    });
  }

  /**
   * Sends `SetLabelType` (0x23) followed by `LabelPositioningCalibration` (0x8E).
   * Note: On Niimbot B1 firmware, 0x8E runs factory optical voltage calibration and feeds ~15cm (~2-3 stickers).
   */
  async calibrateGapSensor(labelType: LabelType = DEFAULT_LABEL_TYPE): Promise<boolean> {
    const client = this.requireIdleConnectedClient();
    this.operationInFlight = true;
    this.lastError = null;
    this.setState("calibrating");
    client.stopHeartbeat();

    const calibrationValue = labelType === LabelType.Black ? 2 : 1;

    try {
      this.log(
        "info",
        `Calibrating optical gap sensor: SetLabelType(${labelType}) -> LabelPositioningCalibration(${calibrationValue}) [0x8E]...`,
      );
      await client.protocol.send(PacketGenerator.setLabelType(labelType));
      const calibrated = await client.protocol.labelPositioningCalibration(calibrationValue);
      this.log(
        calibrated ? "info" : "warn",
        `Optical gap calibration finished (acknowledged=${String(calibrated)}).`,
      );
      await client.fetchHeartbeatData();
      return calibrated;
    } catch (err) {
      const formatted = formatHardwareError(err, this.transport);
      this.lastError = formatted;
      this.log("error", `Gap calibration failed: ${formatted}`);
      throw new Error(formatted);
    } finally {
      this.operationInFlight = false;
      if (client.isConnected()) {
        client.startHeartbeat();
        this.setState("ready");
      } else {
        this.setState("error");
      }
    }
  }

  async printSingleLabel(
    encodedImage: EncodedImage,
    options: SinglePrintJobOptions = {},
  ): Promise<void> {
    await this.printBatchLabels([encodedImage], {
      density: options.density,
      labelType: options.labelType,
      copiesPerPage: options.copies,
      statusPollIntervalMs: options.statusPollIntervalMs,
      pageTimeoutMs: options.pageTimeoutMs,
      statusTimeoutMs: options.statusTimeoutMs,
    });
  }

  async printBatchLabels(
    pages: readonly EncodedImage[],
    options: BatchPrintJobOptions = {},
    onBatchProgress?: (progress: BatchPrintProgress) => void,
    abortSignal?: AbortSignal,
  ): Promise<BatchPrintResult> {
    if (pages.length === 0) {
      throw new Error("Batch print requires at least 1 label page.");
    }

    // 1. Validate ALL pages upfront before touching protocol or hardware
    for (let i = 0; i < pages.length; i++) {
      const img = pages[i];
      if (img.cols !== LABEL_WIDTH_PX || img.rows !== LABEL_HEIGHT_PX) {
        throw new Error(
          `Invalid B1 label bitmap dimensions on page ${i + 1}: expected ${LABEL_WIDTH_PX}x${LABEL_HEIGHT_PX} px, got ${img.cols}x${img.rows} px.`,
        );
      }
    }

    if (abortSignal?.aborted) {
      return { completedPages: 0, totalStickersPrinted: 0, cancelled: true };
    }

    const client = this.requireIdleConnectedClient();
    const isBle = this.transport === "ble";

    const density = Math.max(
      MIN_PRINT_DENSITY,
      Math.min(MAX_PRINT_DENSITY, Math.round(options.density ?? DEFAULT_PRINT_DENSITY)),
    );
    const copiesPerPage = Math.max(
      1,
      Math.min(MAX_SINGLE_PRINT_COPIES, Math.round(options.copiesPerPage ?? 1)),
    );
    const labelType = options.labelType ?? DEFAULT_LABEL_TYPE;
    const statusPollIntervalMs =
      options.statusPollIntervalMs ??
      (isBle ? BLE_STATUS_POLL_INTERVAL_MS : USB_STATUS_POLL_INTERVAL_MS);
    const pageTimeoutMs =
      options.pageTimeoutMs ?? (isBle ? BLE_PAGE_TIMEOUT_MS : USB_PAGE_TIMEOUT_MS);
    const statusTimeoutMs =
      options.statusTimeoutMs ?? (isBle ? BLE_STATUS_TIMEOUT_MS : USB_STATUS_TIMEOUT_MS);

    const totalDistinctPages = pages.length;
    const totalStickers = totalDistinctPages * copiesPerPage;

    this.operationInFlight = true;
    this.lastError = null;
    this.activeBatchPageIndex = 1;
    this.activeBatchTotalPages = totalDistinctPages;
    this.setState("printing");
    client.stopHeartbeat();

    const reportBoth = (p: BatchPrintProgress): void => {
      onBatchProgress?.(p);
      this.emitProgress({
        phase: p.phase,
        packetTransferPct: p.packetTransferPct,
        pagePrintPct: p.pagePrintPct,
        pageFeedPct: p.pageFeedPct,
        currentPage: p.currentStickerIndex,
        totalPages: p.totalStickers,
        currentBatchPage: p.currentPageIndex,
        totalBatchPages: p.totalDistinctPages,
      });
    };

    reportBoth({
      phase: "init",
      currentStickerIndex: 0,
      totalStickers,
      currentPageIndex: 1,
      totalDistinctPages,
      packetTransferPct: 0,
      pagePrintPct: 0,
      pageFeedPct: 0,
    });

    const task = client.protocol.newPrintTask("B1", {
      totalPages: totalStickers,
      density,
      labelType,
      pageColor: PageColorType.SingleColor,
      statusPollIntervalMs,
      statusTimeoutMs,
      pageTimeoutMs,
    });

    let completedPages = 0;
    let completedStickers = 0;
    let cancelled = false;

    try {
      this.log(
        "info",
        `B1PrintTask.printInit() [${this.transport?.toUpperCase() ?? "LINK"} · density=${density}, labelType=${labelType}, pages=${totalDistinctPages}, copiesPerPage=${copiesPerPage}, totalStickers=${totalStickers}, pageTimeout=${pageTimeoutMs}ms]`,
      );
      await task.printInit();

      for (let idx = 0; idx < pages.length; idx++) {
        if (abortSignal?.aborted) {
          cancelled = true;
          this.log(
            "warn",
            `Batch stop requested — halting cleanly after ${completedPages}/${totalDistinctPages} page(s).`,
          );
          break;
        }

        const pageImg = pages[idx];
        this.activeBatchPageIndex = idx + 1;
        const startingStickerNumber = completedStickers + 1;

        reportBoth({
          phase: "transfer",
          currentStickerIndex: startingStickerNumber,
          totalStickers,
          currentPageIndex: idx + 1,
          totalDistinctPages,
          packetTransferPct: 0,
          pagePrintPct: 0,
          pageFeedPct: 0,
        });

        this.log(
          "info",
          `B1PrintTask.printPage(${idx + 1}/${totalDistinctPages}) [384x400 px, ${pageImg.rowsData.length} row segments, copies=${copiesPerPage}]`,
        );
        await task.printPage(pageImg, copiesPerPage);
        await task.waitForPageFinished();

        completedPages++;
        completedStickers += copiesPerPage;

        if (abortSignal?.aborted && idx < pages.length - 1) {
          cancelled = true;
          this.log(
            "warn",
            `Stop After Current Sticker triggered — stopping after page ${completedPages}/${totalDistinctPages}.`,
          );
          break;
        }
      }

      if (!cancelled) {
        reportBoth({
          phase: "printing",
          currentStickerIndex: completedStickers,
          totalStickers,
          currentPageIndex: totalDistinctPages,
          totalDistinctPages,
          packetTransferPct: 100,
          pagePrintPct: 0,
          pageFeedPct: 0,
        });

        this.log(
          "info",
          `B1PrintTask.waitForFinished() [totalStickers=${totalStickers}, statusPoll=${statusPollIntervalMs}ms]`,
        );
        await task.waitForFinished();

        reportBoth({
          phase: "done",
          currentStickerIndex: totalStickers,
          totalStickers,
          currentPageIndex: totalDistinctPages,
          totalDistinctPages,
          packetTransferPct: 100,
          pagePrintPct: 100,
          pageFeedPct: 100,
        });
        this.log(
          "info",
          `Print job completed cleanly (${totalStickers} ${totalStickers === 1 ? "sticker" : "stickers"}).`,
        );
      } else {
        reportBoth({
          phase: "cancelled",
          currentStickerIndex: completedStickers,
          totalStickers,
          currentPageIndex: completedPages,
          totalDistinctPages,
          packetTransferPct: 100,
          pagePrintPct: 100,
          pageFeedPct: 100,
        });
      }

      return {
        completedPages,
        totalStickersPrinted: completedStickers,
        cancelled,
      };
    } catch (err) {
      const formatted = formatHardwareError(err, this.transport);
      this.lastError = formatted;
      this.log("error", `Print failed: ${formatted}`);
      throw new Error(formatted);
    } finally {
      reportBoth({
        phase: "cleanup",
        currentStickerIndex: completedStickers,
        totalStickers,
        currentPageIndex: Math.max(1, completedPages),
        totalDistinctPages,
        packetTransferPct: 100,
        pagePrintPct: 100,
        pageFeedPct: 100,
      });

      const endOk = await task.printEnd().catch((cleanupErr: unknown) => {
        const msg = cleanupErr instanceof Error ? cleanupErr.message : String(cleanupErr);
        this.log("warn", `printEnd() cleanup warning: ${msg}`);
        return false;
      });
      this.log("info", `B1PrintTask.printEnd() -> ${String(endOk)}`);

      this.operationInFlight = false;
      if (client.isConnected()) {
        client.startHeartbeat();
        this.setState("ready");
      } else {
        this.setState("disconnected");
      }
    }
  }

  private requireIdleConnectedClient(): TransportClientLike {
    if (this.operationInFlight || this.state === "printing" || this.state === "calibrating") {
      throw new Error(`Printer is busy (${this.state}). Wait for the active job to finish.`);
    }
    if (!this.client || !this.client.isConnected()) {
      throw new Error("Niimbot B1 is not connected. Connect via USB-C or Bluetooth BLE first.");
    }
    return this.client;
  }

  private attachClientEvents(client: TransportClientLike, transportKind: TransportKind): void {
    client.on("disconnect", () => {
      if (this.intentionalDisconnect) {
        return;
      }
      const dropReason =
        transportKind === "ble"
          ? "Bluetooth BLE link lost (printer powered off or moved out of range)."
          : "USB-C cable unplugged or Windows serial port closed.";
      this.lastError = dropReason;
      this.log("warn", dropReason);
      this.client = null;
      this.deviceName = null;
      this.transport = null;
      this.operationInFlight = false;
      this.setState("disconnected");
    });

    client.on("heartbeat", () => {
      this.emitState();
    });

    client.on("heartbeatfailed", (evt) => {
      this.log("warn", `Heartbeat missed (attempt ${evt.failedAttempts}).`);
    });

    client.on("rfidinfofetched", () => {
      const snap = this.getTelemetrySnapshot();
      this.log("info", `Spool check: ${snap.spoolSummary}`);
      this.emitState();
    });

    client.on("printpacketprogress", (evt) => {
      this.emitProgress({
        phase: "transfer",
        packetTransferPct: evt.progress,
        pagePrintPct: 0,
        pageFeedPct: 0,
        currentPage: this.activeBatchPageIndex,
        totalPages: this.activeBatchTotalPages,
        currentBatchPage: this.activeBatchPageIndex,
        totalBatchPages: this.activeBatchTotalPages,
      });
    });

    client.on("printprogress", (evt) => {
      this.emitProgress({
        phase: "printing",
        packetTransferPct: 100,
        pagePrintPct: evt.pagePrintProgress,
        pageFeedPct: evt.pageFeedProgress,
        currentPage: evt.page,
        totalPages: evt.pagesTotal,
        currentBatchPage: this.activeBatchPageIndex,
        totalBatchPages: this.activeBatchTotalPages,
      });
    });
  }

  private setState(next: PrinterControllerState): void {
    this.state = next;
    this.emitState();
  }

  private emitState(): void {
    const snapshot = this.getTelemetrySnapshot();
    for (const listener of this.stateListeners) {
      listener(snapshot);
    }
  }

  private emitProgress(progress: PrintLiveProgress): void {
    for (const listener of this.progressListeners) {
      listener(progress);
    }
  }

  private log(level: ProtocolLogLevel, message: string): void {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    const ms = String(now.getMilliseconds()).padStart(3, "0");
    const entry: ProtocolLogEntry = {
      timestamp: `${hh}:${mm}:${ss}.${ms}`,
      level,
      message,
    };
    this.logs.push(entry);
    if (this.logs.length > 250) {
      this.logs.shift();
    }
    for (const listener of this.logListeners) {
      listener(entry);
    }
  }
}
