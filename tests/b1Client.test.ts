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
  type PrintTaskLike,
  type SerialTransportClientLike,
} from "../src/printer/b1Client.ts";

interface MockHarness {
  controller: B1PrinterController;
  callOrder: string[];
  createdTasks: Array<{ name: string; options: Partial<PrintOptions> | undefined }>;
  setFailNextWaitForFinished: (err: Error | null) => void;
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
  let connected = false;
  let failNextWaitForFinished: Error | null = null;

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

  const mockClient: SerialTransportClientLike = {
    protocol: {
      newPrintTask(name: "B1", options?: Partial<PrintOptions>): PrintTaskLike {
        createdTasks.push({ name, options });
        return {
          async printInit() {
            callOrder.push("printInit");
          },
          async printPage(_image: EncodedImage, quantity?: number) {
            callOrder.push(`printPage:${quantity ?? 1}`);
          },
          async waitForPageFinished() {
            callOrder.push("waitForPageFinished");
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
      return { deviceName: "Mock Niimbot B1 (COM9)", result: ConnectResult.ConnectedV3 };
    },
    async disconnect() {
      connected = false;
    },
    isConnected() {
      return connected;
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
    on() {
      return mockClient;
    },
    removeAllListeners() {
      return mockClient;
    },
  };

  const controller = new B1PrinterController({
    createSerialClient: () => mockClient,
  });

  return {
    controller,
    callOrder,
    createdTasks,
    setFailNextWaitForFinished(err: Error | null) {
      failNextWaitForFinished = err;
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

  assert.equal(createdTasks.length, 0);
  assert.equal(controller.getState(), "ready");
});

test("printSingleLabel invokes B1PrintTask with WithGaps=1, density=3, copies and runs exact lifecycle", async () => {
  const { controller, callOrder, createdTasks } = createMockHarness();
  await controller.connectUsb({ filterKnownVendors: true });

  const snap = controller.getTelemetrySnapshot();
  assert.equal(snap.spoolSummary, "Manual 50×50 mm Gap Roll (WithGaps active)");

  callOrder.length = 0;
  const validImage = createValidEncodedImage(384, 400);

  await controller.printSingleLabel(validImage, {
    copies: 2,
  });

  assert.equal(createdTasks.length, 1);
  assert.equal(createdTasks[0].name, "B1");
  assert.equal(createdTasks[0].options?.labelType, LabelType.WithGaps);
  assert.equal(createdTasks[0].options?.labelType, 1);
  assert.equal(createdTasks[0].options?.density, 3);
  assert.equal(createdTasks[0].options?.totalPages, 2);
  assert.equal(createdTasks[0].options?.pageColor, PageColorType.SingleColor);

  assert.deepEqual(callOrder, [
    "stopHeartbeat",
    "printInit",
    "printPage:2",
    "waitForPageFinished",
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

  // Must still execute printEnd() and unlock state back to ready
  assert.ok(callOrder.includes("printEnd"), "printEnd() must run in finally on timeout");
  assert.equal(controller.getState(), "ready");
  assert.equal(controller.getTelemetrySnapshot().lastError, "Timeout waiting print status");

  // Subsequent print must not deadlock
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
