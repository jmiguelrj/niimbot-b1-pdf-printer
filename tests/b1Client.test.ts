import assert from "node:assert/strict";
import test from "node:test";
import {
  AutoShutdownTime,
  ConnectResult,
  LabelType,
  NiimbotPacket,
  PageColorType,
  PrinterModel,
  type CombinedRfidInfo,
  type EncodedImage,
  type HeartbeatData,
  type PrintOptions,
  type PrinterInfo,
  type PrinterModelMeta,
} from "@mmote/niimbluelib";
import {
  B1PrinterController,
  BLE_PACKET_INTERVAL_MS,
  BLE_PAGE_TIMEOUT_MS,
  BLE_STATUS_POLL_INTERVAL_MS,
  USB_PACKET_INTERVAL_MS,
  USB_PAGE_TIMEOUT_MS,
  USB_STATUS_POLL_INTERVAL_MS,
  type PrintTaskLike,
  type SerialTransportClientLike,
  type TransportClientLike,
} from "../src/printer/b1Client.ts";

interface MockHarness {
  controller: B1PrinterController;
  callOrder: string[];
  createdTasks: Array<{ name: string; options: Partial<PrintOptions> | undefined }>;
  setFailNextWaitForFinished: (err: Error | null) => void;
  setOnPrintPageHook: (fn: ((pageCallIndex: number) => void) | null) => void;
  simulateUnexpectedDisconnect: (which: "usb" | "ble") => void;
}

function createValidEncodedImage(cols = 384, rows = 400): EncodedImage {
  return {
    cols,
    rows,
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
        dataType: "void",
        rowNumber: 200,
        repeat: 200,
        blackPixelsCount: 0,
        redPixelsCount: 0,
      },
    ],
  };
}

function createMockHarness(): MockHarness {
  const callOrder: string[] = [];
  const createdTasks: Array<{ name: string; options: Partial<PrintOptions> | undefined }> = [];
  let failNextWaitForFinished: Error | null = null;
  let onPrintPageHook: ((pageCallIndex: number) => void) | null = null;
  let printPageCounter = 0;

  const printerInfo: PrinterInfo = {
    connectResult: ConnectResult.ConnectedV3,
    protocolVersion: 3,
    modelId: 4096,
    batteryPercents: 88,
    printheadWidth: 384,
    softwareVersion: "4.12",
    hardwareVersion: "4.0",
    settings: {
      powerSound: false,
      connectionSound: false,
      autoShutdownTime: AutoShutdownTime.ShutdownTime1,
    },
  };

  const rfidInfo: CombinedRfidInfo = {
    labelRfidInfo: {
      tagPresent: false,
      uuid: "",
      barCode: "",
      serialNumber: "",
      allPaper: 0,
      usedPaper: 0,
      consumablesType: LabelType.Invalid,
    },
  };

  const heartbeat: HeartbeatData = {
    batteryPercents: 88,
    lidClosed: true,
    paperInserted: true,
  };

  const b1Meta: PrinterModelMeta = {
    model: PrinterModel.B1,
    id: [4096],
    dpi: 203,
    printDirection: "top",
    printheadPixels: 384,
    paperTypes: [LabelType.WithGaps, LabelType.Black, LabelType.Transparent],
    densityMin: 1,
    densityMax: 5,
    densityDefault: 3,
  };

  function buildClient(label: string): {
    client: SerialTransportClientLike;
    triggerDisconnect: () => void;
  } {
    let connected = false;
    let packetInterval = 10;
    const disconnectHandlers: Array<() => void> = [];

    const client: SerialTransportClientLike = {
      protocol: {
        newPrintTask(name: "B1", options?: Partial<PrintOptions>): PrintTaskLike {
          createdTasks.push({ name, options });
          return {
            async printInit() {
              callOrder.push("printInit");
            },
            async printPage(_image: EncodedImage, quantity?: number) {
              printPageCounter++;
              callOrder.push(`printPage#${printPageCounter}:${quantity ?? 1}`);
              onPrintPageHook?.(printPageCounter);
            },
            async waitForPageFinished() {
              callOrder.push(`waitForPageFinished#${printPageCounter}`);
            },
            async waitForFinished() {
              callOrder.push("waitForFinished");
              if (failNextWaitForFinished) {
                const err = failNextWaitForFinished;
                failNextWaitForFinished = null;
                throw err;
              }
            },
            async printEnd() {
              callOrder.push("printEnd");
              return true;
            },
          };
        },
        async send(packet: NiimbotPacket): Promise<NiimbotPacket> {
          callOrder.push(`send:${packet.command}`);
          return packet;
        },
        async labelPositioningCalibration(value: number): Promise<boolean> {
          callOrder.push(`labelPositioningCalibration:${value}`);
          return true;
        },
      },
      async connect() {
        connected = true;
        return { deviceName: label, result: ConnectResult.ConnectedV3 };
      },
      async disconnect() {
        connected = false;
      },
      isConnected() {
        return connected;
      },
      setPacketInterval(ms: number) {
        packetInterval = ms;
        callOrder.push(`setPacketInterval:${ms}`);
      },
      getPacketInterval() {
        return packetInterval;
      },
      startHeartbeat() {
        callOrder.push("startHeartbeat");
      },
      stopHeartbeat() {
        callOrder.push("stopHeartbeat");
      },
      async fetchPrinterInfo() {
        return printerInfo;
      },
      async fetchRfidInfo() {
        return rfidInfo;
      },
      async fetchHeartbeatData() {
        return heartbeat;
      },
      getPrinterInfo() {
        return printerInfo;
      },
      getRfidInfo() {
        return rfidInfo;
      },
      getHeartbeatData() {
        return heartbeat;
      },
      getModelMetadata() {
        return b1Meta;
      },
      on(event: string, fn: (...args: never[]) => void) {
        if (event === "disconnect") {
          disconnectHandlers.push(fn as () => void);
        }
        return client;
      },
      removeAllListeners() {
        disconnectHandlers.length = 0;
        return client;
      },
    };

    return {
      client,
      triggerDisconnect() {
        connected = false;
        for (const fn of disconnectHandlers) {
          fn();
        }
      },
    };
  }

  const usbMock = buildClient("Serial (VID:3513 PID:2)");
  const bleMock = buildClient("B1-I30707173");

  const controller = new B1PrinterController({
    createSerialClient: () => usbMock.client,
    createBluetoothClient: (): TransportClientLike => bleMock.client,
  });

  return {
    controller,
    callOrder,
    createdTasks,
    setFailNextWaitForFinished(err: Error | null) {
      failNextWaitForFinished = err;
    },
    setOnPrintPageHook(fn: ((pageCallIndex: number) => void) | null) {
      onPrintPageHook = fn;
    },
    simulateUnexpectedDisconnect(which: "usb" | "ble") {
      if (which === "usb") {
        usbMock.triggerDisconnect();
      } else {
        bleMock.triggerDisconnect();
      }
    },
  };
}

test("dimension guard rejects EncodedImage with cols !== 384 before newPrintTask is invoked", async () => {
  const { controller, createdTasks } = createMockHarness();
  await controller.connectUsb({ filterKnownVendors: true });
  assert.equal(controller.getState(), "ready");

  const wrongWidthImage = createValidEncodedImage(320, 400);
  await assert.rejects(
    () => controller.printSingleLabel(wrongWidthImage),
    /expected 384x400 px, got 320x400 px/,
  );

  // Also reject multi-page batch if any page in the batch has wrong dimensions
  await assert.rejects(
    () =>
      controller.printBatchLabels([
        createValidEncodedImage(384, 400),
        createValidEncodedImage(384, 350),
      ]),
    /page 2: expected 384x400 px, got 384x350 px/,
  );

  assert.equal(createdTasks.length, 0);
  assert.equal(controller.getState(), "ready");
});

test("printSingleLabel invokes B1PrintTask with WithGaps=1, density=3, copies and runs exact lifecycle", async () => {
  const { controller, callOrder, createdTasks } = createMockHarness();
  await controller.connectUsb({ filterKnownVendors: true });

  const snap = controller.getTelemetrySnapshot();
  assert.equal(snap.transport, "usb");
  assert.equal(snap.packetIntervalMs, USB_PACKET_INTERVAL_MS);
  assert.equal(snap.spoolSummary, "Manual 50×50 mm Gap Roll (WithGaps active)");

  callOrder.length = 0;
  const validImage = createValidEncodedImage(384, 400);

  await controller.printSingleLabel(validImage, {
    copies: 2,
  });

  assert.equal(createdTasks.length, 1);
  assert.equal(createdTasks[0].name, "B1");
  assert.equal(createdTasks[0].options?.labelType, LabelType.WithGaps);
  assert.equal(createdTasks[0].options?.density, 3);
  assert.equal(createdTasks[0].options?.totalPages, 2);
  assert.equal(createdTasks[0].options?.pageTimeoutMs, USB_PAGE_TIMEOUT_MS);
  assert.equal(createdTasks[0].options?.statusPollIntervalMs, USB_STATUS_POLL_INTERVAL_MS);
  assert.equal(createdTasks[0].options?.pageColor, PageColorType.SingleColor);

  assert.deepEqual(callOrder, [
    "stopHeartbeat",
    "printInit",
    "printPage#1:2",
    "waitForPageFinished#1",
    "waitForFinished",
    "printEnd",
    "startHeartbeat",
  ]);
  assert.equal(controller.getState(), "ready");
});

test("mid-print timeout/error still executes printEnd() cleanup and resets state so next print succeeds", async () => {
  const { controller, callOrder, createdTasks, setFailNextWaitForFinished } = createMockHarness();
  await controller.connectUsb({ filterKnownVendors: true });

  callOrder.length = 0;
  setFailNextWaitForFinished(new Error("Timeout waiting print status"));

  const validImage = createValidEncodedImage(384, 400);
  await assert.rejects(
    () => controller.printSingleLabel(validImage, { copies: 1 }),
    /Timeout waiting print status/,
  );

  assert.ok(callOrder.includes("printEnd"), "printEnd() must run in finally on timeout");
  assert.equal(controller.getState(), "ready");
  assert.equal(controller.getTelemetrySnapshot().lastError, "Timeout waiting print status");

  callOrder.length = 0;
  await controller.printSingleLabel(validImage, { copies: 1, density: 4 });
  assert.equal(createdTasks.length, 2);
  assert.equal(createdTasks[1].options?.density, 4);
  assert.ok(callOrder.includes("printEnd"));
  assert.equal(controller.getState(), "ready");
});

test("calibrateGapSensor sends SetLabelType(35) followed by labelPositioningCalibration(1)", async () => {
  const { controller, callOrder } = createMockHarness();
  await controller.connectUsb({ filterKnownVendors: true });

  callOrder.length = 0;
  const ok = await controller.calibrateGapSensor(LabelType.WithGaps);
  assert.equal(ok, true);
  assert.deepEqual(callOrder, [
    "stopHeartbeat",
    "send:35",
    "labelPositioningCalibration:1",
    "startHeartbeat",
  ]);
  assert.equal(controller.getState(), "ready");
});

test("printBatchLabels executes printInit once, loops printPage + waitForPageFinished per page, then waitForFinished and printEnd", async () => {
  const { controller, callOrder, createdTasks } = createMockHarness();
  await controller.connectUsb({ filterKnownVendors: true });

  callOrder.length = 0;
  const pages = [
    createValidEncodedImage(384, 400),
    createValidEncodedImage(384, 400),
    createValidEncodedImage(384, 400),
  ];

  const result = await controller.printBatchLabels(pages, {
    density: 3,
    labelType: LabelType.WithGaps,
    copiesPerPage: 2,
  });

  assert.deepEqual(result, {
    completedPages: 3,
    totalStickersPrinted: 6,
    cancelled: false,
  });
  assert.equal(createdTasks.length, 1);
  assert.equal(createdTasks[0].options?.totalPages, 6);

  assert.deepEqual(callOrder, [
    "stopHeartbeat",
    "printInit",
    "printPage#1:2",
    "waitForPageFinished#1",
    "printPage#2:2",
    "waitForPageFinished#2",
    "printPage#3:2",
    "waitForPageFinished#3",
    "waitForFinished",
    "printEnd",
    "startHeartbeat",
  ]);
});

test("printBatchLabels honours AbortController mid-batch, stops remaining pages, and runs printEnd()", async () => {
  const { controller, callOrder, setOnPrintPageHook } = createMockHarness();
  await controller.connectUsb({ filterKnownVendors: true });

  callOrder.length = 0;
  const abortController = new AbortController();

  // Trigger abort while page 1 is printing so pages 2 and 3 are never sent
  setOnPrintPageHook((pageCallIndex) => {
    if (pageCallIndex === 1) {
      abortController.abort();
    }
  });

  const pages = [
    createValidEncodedImage(384, 400),
    createValidEncodedImage(384, 400),
    createValidEncodedImage(384, 400),
  ];

  const result = await controller.printBatchLabels(
    pages,
    { copiesPerPage: 1 },
    undefined,
    abortController.signal,
  );

  assert.deepEqual(result, {
    completedPages: 1,
    totalStickersPrinted: 1,
    cancelled: true,
  });
  assert.deepEqual(callOrder, [
    "stopHeartbeat",
    "printInit",
    "printPage#1:1",
    "waitForPageFinished#1",
    "printEnd",
    "startHeartbeat",
  ]);
  assert.equal(controller.getState(), "ready");
});

test("connectBle configures Windows BLE packet pacing (20ms), extended pageTimeout (30s), and handles unexpected BLE disconnect", async () => {
  const { controller, callOrder, createdTasks, simulateUnexpectedDisconnect } = createMockHarness();
  await controller.connectBle();

  const snap = controller.getTelemetrySnapshot();
  assert.equal(snap.transport, "ble");
  assert.equal(snap.deviceName, "B1-I30707173");
  assert.equal(snap.packetIntervalMs, BLE_PACKET_INTERVAL_MS);
  assert.ok(callOrder.includes(`setPacketInterval:${BLE_PACKET_INTERVAL_MS}`));

  await controller.printSingleLabel(createValidEncodedImage(384, 400), { copies: 1 });
  assert.equal(createdTasks.length, 1);
  assert.equal(createdTasks[0].options?.pageTimeoutMs, BLE_PAGE_TIMEOUT_MS);
  assert.equal(createdTasks[0].options?.statusPollIntervalMs, BLE_STATUS_POLL_INTERVAL_MS);

  simulateUnexpectedDisconnect("ble");
  assert.equal(controller.getState(), "disconnected");
  assert.equal(controller.getTransport(), null);
  assert.match(controller.getTelemetrySnapshot().lastError ?? "", /Bluetooth BLE link lost/);
});
