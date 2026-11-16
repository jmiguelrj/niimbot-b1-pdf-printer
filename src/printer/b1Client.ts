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
  phase: "init" | "transfer" | "printing" | "cleanup" | "done";
  packetTransferPct: number;
  pagePrintPct: number;
  pageFeedPct: number;
  currentPage: number;
  totalPages: number;
}

export interface PrinterTelemetrySnapshot {
  state: PrinterControllerState;
  transport: TransportKind | null;
  deviceName: string | null;
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

/** Niimbot B1 native USB VID/PID (0x3513:0x0002 on COM9) + CH34x fallback (0x1a86) */
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
        "Failed to open USB serial port (COM9 may be locked by Niimbot Desktop, another browser tab, " +
        "or a serial monitor). Close other apps using COM9, unplug/replug USB-C if needed, and retry."
      );
    }
    return err.message;
  }
  return String(err);
}

function buildBlankGapAlignmentImage(): EncodedImage {
  // 400 white rows chunked at 200-row boundary to match ImageEncoder.encodeCanvas output
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
  private deviceName: string | null = null;
  private lastError: string | null = null;
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
            ? "Requesting WebSerial port (filtered for Niimbot VID_3513 / PID_0002 COM9)..."
            : "Requesting WebSerial port (all serial ports)...",
        );
        authorizedPort = await navigator.serial.requestPort(
          filterKnownVendors ? { filters: NIIMBOT_USB_FILTERS } : undefined,
        );
      } else if (!this.deps.createSerialClient) {
        throw new Error(
          "WebSerial API is unavailable in this browser. Open in Microsoft Edge or Google Chrome over localhost/HTTPS.",
        );
      }

      this.attachClientEvents(serialClient);
      const connInfo = await serialClient.connect(
        authorizedPort ? { authorizedPort } : undefined,
      );
      this.client = serialClient;
      this.deviceName = connInfo.deviceName ?? "Niimbot B1 (USB Serial)";
      await serialClient.fetchHeartbeatData();
      this.log("info", `Connected over USB Serial: ${this.deviceName}`);
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
        this.log("info", "USB port selection cancelled by operator.");
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
          "WebBluetooth API is unavailable in this browser. Open in Microsoft Edge or Google Chrome over localhost/HTTPS.",
        );
      }

      this.log("info", "Requesting Niimbot B1 over WebBluetooth BLE...");
      this.attachClientEvents(bleClient);
      const connInfo = await bleClient.connect();
      this.client = bleClient;
      this.deviceName = connInfo.deviceName ?? "Niimbot B1 (BLE)";
      await bleClient.fetchHeartbeatData();
      this.log("info", `Connected over Bluetooth BLE: ${this.deviceName}`);
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
        this.log("info", "Bluetooth device picker cancelled by operator.");
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
    this.client = null;
    this.deviceName = null;
    this.transport = null;
    this.operationInFlight = false;
    this.lastError = null;

    if (activeClient) {
      activeClient.stopHeartbeat();
      activeClient.removeAllListeners();
      await activeClient.disconnect().catch(() => undefined);
      this.log("info", "Disconnected printer transport and released port.");
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
    // 1. Strict 384x400 dimension guard BEFORE touching protocol or hardware
    if (encodedImage.cols !== LABEL_WIDTH_PX || encodedImage.rows !== LABEL_HEIGHT_PX) {
      throw new Error(
        `Invalid B1 label bitmap dimensions: expected ${LABEL_WIDTH_PX}x${LABEL_HEIGHT_PX} px, got ${encodedImage.cols}x${encodedImage.rows} px.`,
      );
    }

    const density = Math.max(
      MIN_PRINT_DENSITY,
      Math.min(MAX_PRINT_DENSITY, Math.round(options.density ?? DEFAULT_PRINT_DENSITY)),
    );
    const copies = Math.max(
      1,
      Math.min(MAX_SINGLE_PRINT_COPIES, Math.round(options.copies ?? 1)),
    );
    const labelType = options.labelType ?? DEFAULT_LABEL_TYPE;
    const statusPollIntervalMs = options.statusPollIntervalMs ?? 100;
    const pageTimeoutMs = options.pageTimeoutMs ?? 15_000;
    const statusTimeoutMs = options.statusTimeoutMs ?? 8_000;

    const client = this.requireIdleConnectedClient();

    this.operationInFlight = true;
    this.lastError = null;
    this.setState("printing");
    client.stopHeartbeat();

    this.emitProgress({
      phase: "init",
      packetTransferPct: 0,
      pagePrintPct: 0,
      pageFeedPct: 0,
      currentPage: 0,
      totalPages: copies,
    });

    const task = client.protocol.newPrintTask("B1", {
      totalPages: copies,
      density,
      labelType,
      pageColor: PageColorType.SingleColor,
      statusPollIntervalMs,
      statusTimeoutMs,
      pageTimeoutMs,
    });

    try {
      this.log(
        "info",
        `B1PrintTask.printInit() [density=${density}, labelType=${labelType}, totalPages=${copies}]`,
      );
      await task.printInit();

      this.emitProgress({
        phase: "transfer",
        packetTransferPct: 0,
        pagePrintPct: 0,
        pageFeedPct: 0,
        currentPage: 1,
        totalPages: copies,
      });

      this.log(
        "info",
        `B1PrintTask.printPage() [384x400 px, ${encodedImage.rowsData.length} row segments, copies=${copies}]`,
      );
      await task.printPage(encodedImage, copies);
      await task.waitForPageFinished();

      this.emitProgress({
        phase: "printing",
        packetTransferPct: 100,
        pagePrintPct: 0,
        pageFeedPct: 0,
        currentPage: 1,
        totalPages: copies,
      });

      this.log(
        "info",
        `B1PrintTask.waitForFinished() [statusPoll=${statusPollIntervalMs}ms]`,
      );
      await task.waitForFinished();

      this.emitProgress({
        phase: "done",
        packetTransferPct: 100,
        pagePrintPct: 100,
        pageFeedPct: 100,
        currentPage: copies,
        totalPages: copies,
      });
      this.log(
        "info",
        `Sticker print completed cleanly (${copies} ${copies === 1 ? "copy" : "copies"}).`,
      );
    } catch (err) {
      const formatted = formatHardwareError(err, this.transport);
      this.lastError = formatted;
      this.log("error", `Print failed: ${formatted}`);
      throw new Error(formatted);
    } finally {
      this.emitProgress({
        phase: "cleanup",
        packetTransferPct: 100,
        pagePrintPct: 100,
        pageFeedPct: 100,
        currentPage: copies,
        totalPages: copies,
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
        this.setState("error");
      }
    }
  }

  private requireIdleConnectedClient(): TransportClientLike {
    if (this.operationInFlight || this.state === "printing" || this.state === "calibrating") {
      throw new Error(`Printer is busy (${this.state}). Wait for the active job to finish.`);
    }
    if (!this.client || !this.client.isConnected()) {
      throw new Error("Niimbot B1 is not connected. Connect via USB (COM9) or Bluetooth first.");
    }
    return this.client;
  }

  private attachClientEvents(client: TransportClientLike): void {
    client.on("disconnect", () => {
      this.log("warn", "Hardware link disconnected.");
      this.client = null;
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
        currentPage: 1,
        totalPages: 1,
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
