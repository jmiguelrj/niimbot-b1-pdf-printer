export type Locale = "en" | "pt-BR";

export const LOCALE_STORAGE_KEY = "niimbot-label-studio:locale";

export interface UiStrings {
  // Document & Topbar
  readonly docTitle: string;
  readonly modelBadge: string;
  readonly topbarSubtitle: string;
  readonly statusDisconnected: string;
  readonly statusReadyUsb: string;
  readonly statusReadyBle: string;
  readonly statusReadyGeneric: string;
  readonly statusPrinting: string;
  readonly statusCalibrating: string;
  readonly statusConnectingUsb: string;
  readonly statusScanningBle: string;
  readonly statusError: string;
  readonly installApp: string;
  readonly manualBtn: string;
  readonly manualBtnTitle: string;
  readonly langGroupAria: string;
  readonly langEnAria: string;
  readonly langPtAria: string;
  readonly themeGroupAria: string;
  readonly themeLight: string;
  readonly themeAuto: string;
  readonly themeDark: string;

  // Browser Hardware Warnings
  readonly warnNoHardwareTitle: string;
  readonly warnNoHardwareBeforeEdge: string;
  readonly warnNoHardwareEdge: string;
  readonly warnNoHardwareOr: string;
  readonly warnNoHardwareChrome: string;
  readonly warnNoHardwareOver: string;
  readonly warnNoHardwareTail: string;
  readonly warnInsecureTitle: string;
  readonly warnInsecureBody: string;
  readonly warnInsecureOr: string;

  // Printer & Sensor Card + Device Showcase Pod
  readonly printerPanelAria: string;
  readonly printerPanelTitle: string;
  readonly refreshBtn: string;
  readonly refreshBtnTitle: string;
  readonly devicePodAlt: string;
  readonly devicePodTitle: string;
  readonly devicePodSpec: string;
  readonly devicePodGuideLink: string;
  readonly connectUsb: string;
  readonly connectBle: string;
  readonly filterVid: string;
  readonly filterVidTitle: string;
  readonly disconnect: string;
  readonly tipsSummary: string;
  readonly tip1Bold: string;
  readonly tip1Text: string;
  readonly tip2Bold: string;
  readonly tip2Text: string;
  readonly tip3Bold: string;
  readonly tip3Text: string;
  readonly telModel: string;
  readonly telBattery: string;
  readonly telPaperLid: string;
  readonly telRoll: string;
  readonly lidClosed: string;
  readonly lidOpen: string;
  readonly lidNa: string;
  readonly paperLoaded: string;
  readonly paperEmpty: string;
  readonly paperNa: string;
  readonly rollManualGap: string;
  readonly rollRfidGeneric: string;
  readonly rollSummaryRfid: string;
  readonly sensorModeLabel: string;
  readonly sensorWithGaps: string;
  readonly sensorTransparent: string;
  readonly sensorBlackMark: string;
  readonly gapAlignmentLabel: string;
  readonly feedGapBtn: string;
  readonly feedGapTitle: string;
  readonly calibrateBtn: string;
  readonly calibrateTitle: string;

  // Hardware Status & Progress Banners
  readonly hwIdleBanner: string;
  readonly hwOpeningUsb: string;
  readonly hwConnectedUsb: string;
  readonly hwCancelledUsb: string;
  readonly hwScanningBle: string;
  readonly hwConnectedBle: string;
  readonly hwCancelledBle: string;
  readonly hwDisconnected: string;
  readonly hwTelemetryRefreshed: string;
  readonly hwFeedingGap: string;
  readonly hwFedGap: string;
  readonly hwFeedFailed: string;
  readonly hwCalibrating: string;
  readonly hwCalibrated: string;
  readonly hwCalibrateFailed: string;
  readonly hwPrintingSingle: string;
  readonly hwPrintedSingle: string;
  readonly hwPrintSingleFailed: string;
  readonly hwBatchStarting: string;
  readonly hwBatchStopped: string;
  readonly hwBatchDone: string;
  readonly hwBatchFailed: string;
  readonly progIdle: string;
  readonly progBatchPrefix: string;
  readonly progInit: string;
  readonly progTransfer: string;
  readonly progPrinting: string;
  readonly progStopping: string;
  readonly progCleanup: string;
  readonly progDone: string;

  // Raster & Thermal Engine Card
  readonly rasterPanelAria: string;
  readonly rasterPanelTitle: string;
  readonly sizingModeLabel: string;
  readonly sizingGroupAria: string;
  readonly fitScale: string;
  readonly fitBleed: string;
  readonly ditherModeLabel: string;
  readonly ditherGroupAria: string;
  readonly ditherThreshold: string;
  readonly ditherAtkinson: string;
  readonly thresholdLabel: string;
  readonly rotationLabel: string;
  readonly rotationGroupAria: string;
  readonly densityLabel: string;
  readonly copiesLabel: string;
  readonly copiesDecAria: string;
  readonly copiesIncAria: string;
  readonly copiesInputAria: string;
  readonly invertLabel: string;
  readonly safeGuidesLabel: string;

  // Stage, Dropzone, Batch & Cards
  readonly stagePanelAria: string;
  readonly dropzoneAria: string;
  readonly dropzoneTitle: string;
  readonly dropzoneHint: string;
  readonly loadSampleBtn: string;
  readonly loadSampleTitle: string;
  readonly samplePdfFileName: string;
  readonly noPdfLoaded: string;
  readonly pdfReadyStatus: string;
  readonly pdfRasterizing: string;
  readonly pdfRenderedOne: string;
  readonly pdfRenderedMany: string;
  readonly pdfFailed: string;
  readonly pdfUnsupported: string;
  readonly pdfEmpty: string;
  readonly pdfOversized: string;
  readonly previewsHeading: string;
  readonly pagesCountOne: string;
  readonly pagesCountMany: string;
  readonly emptyStateText: string;
  readonly selectAll: string;
  readonly deselectAll: string;
  readonly batchSummaryOne: string;
  readonly batchSummaryMany: string;
  readonly printSelected: string;
  readonly printAll: string;
  readonly stopAfterCurrent: string;
  readonly stoppingBatch: string;
  readonly cardPage: string;
  readonly cardNon50mm: string;
  readonly cardFrameTitle: string;
  readonly cardMetaDims: string;
  readonly cardMetaInk: string;
  readonly cardPrintBtn: string;
  readonly cardPrintingBtn: string;
  readonly cardConnectBtn: string;
  readonly wordCopyOne: string;
  readonly wordCopyMany: string;
  readonly wordStickerOne: string;
  readonly wordStickerMany: string;
  readonly wordPageOne: string;
  readonly wordPageMany: string;

  // Activity Console
  readonly consoleTitle: string;
  readonly consoleSubtitle: string;
  readonly consoleClear: string;
  readonly eventsOne: string;
  readonly eventsMany: string;

  // Interactive Apple Help & User Manual
  readonly manualModalTitle: string;
  readonly manualModalSubtitle: string;
  readonly manualCloseAria: string;
  readonly manualTabQuickstart: string;
  readonly manualTabHardware: string;
  readonly manualTabConnection: string;
  readonly manualTabQuality: string;
  readonly manualTabPwa: string;

  readonly manualQuickIntro: string;
  readonly manualQuickStep1Title: string;
  readonly manualQuickStep1Body: string;
  readonly manualQuickStep2Title: string;
  readonly manualQuickStep2Body: string;
  readonly manualQuickStep3Title: string;
  readonly manualQuickStep3Body: string;
  readonly manualQuickStep4Title: string;
  readonly manualQuickStep4Body: string;

  readonly manualHwHeroTitle: string;
  readonly manualHwHeroBody: string;
  readonly manualHwImgAlt: string;
  readonly manualHwPart1Title: string;
  readonly manualHwPart1Body: string;
  readonly manualHwPart2Title: string;
  readonly manualHwPart2Body: string;
  readonly manualHwPart3Title: string;
  readonly manualHwPart3Body: string;
  readonly manualHwPart4Title: string;
  readonly manualHwPart4Body: string;
  readonly manualHwCalloutTitle: string;
  readonly manualHwCalloutBody: string;

  readonly manualConnIntro: string;
  readonly manualConnUsbTitle: string;
  readonly manualConnUsbBody: string;
  readonly manualConnBleTitle: string;
  readonly manualConnBleBody: string;
  readonly manualConnWarnTitle: string;
  readonly manualConnWarnBody: string;

  readonly manualQualIntro: string;
  readonly manualQualThreshTitle: string;
  readonly manualQualThreshBody: string;
  readonly manualQualAtkinsonTitle: string;
  readonly manualQualAtkinsonBody: string;
  readonly manualQualDensityTitle: string;
  readonly manualQualDensityBody: string;
  readonly manualQualGapTitle: string;
  readonly manualQualGapBody: string;

  readonly manualPwaIntro: string;
  readonly manualPwaInstallTitle: string;
  readonly manualPwaInstallBody: string;
  readonly manualPwaPrivacyTitle: string;
  readonly manualPwaPrivacyBody: string;
}

export const TRANSLATIONS: Record<Locale, UiStrings> = {
  en: {
    docTitle: "Label Studio — Niimbot B1 (50×50 mm)",
    modelBadge: "Niimbot B1 · 50×50 mm",
    topbarSubtitle: "Zero-driver USB-C & Bluetooth BLE · 203 DPI · 384×400 px Thermal Print Center",
    statusDisconnected: "Disconnected",
    statusReadyUsb: "Ready · USB-C",
    statusReadyBle: "Ready · Bluetooth",
    statusReadyGeneric: "Ready",
    statusPrinting: "Printing…",
    statusCalibrating: "Calibrating…",
    statusConnectingUsb: "Connecting USB-C…",
    statusScanningBle: "Scanning Bluetooth…",
    statusError: "Printer Error",
    installApp: "Install App",
    manualBtn: "Manual",
    manualBtnTitle: "Open Niimbot B1 User Manual & Troubleshooting",
    langGroupAria: "Language",
    langEnAria: "English",
    langPtAria: "Brazilian Portuguese",
    themeGroupAria: "Appearance mode",
    themeLight: "Light",
    themeAuto: "Auto",
    themeDark: "Dark",

    warnNoHardwareTitle: "Browser Hardware API Unavailable: ",
    warnNoHardwareBeforeEdge: "Neither WebSerial nor WebBluetooth is enabled here. Open in ",
    warnNoHardwareEdge: "Microsoft Edge",
    warnNoHardwareOr: " or ",
    warnNoHardwareChrome: "Google Chrome",
    warnNoHardwareOver: " over ",
    warnNoHardwareTail: " on any Windows x64/ARM64 PC.",
    warnInsecureTitle: "Insecure Origin: ",
    warnInsecureBody: "WebSerial and WebBluetooth require ",
    warnInsecureOr: " or ",

    printerPanelAria: "Printer and Sensor",
    printerPanelTitle: "Printer & Sensor",
    refreshBtn: "Refresh",
    refreshBtnTitle: "Refresh printer battery, cover, and RFID spool telemetry",
    devicePodAlt: "Niimbot B1 thermal label printer",
    devicePodTitle: "Niimbot B1",
    devicePodSpec: "203 DPI · 48 mm Head (384×400 px)",
    devicePodGuideLink: "Setup & LED Guide →",
    connectUsb: "Connect USB-C",
    connectBle: "Connect Bluetooth",
    filterVid: "Filter VID_3513",
    filterVidTitle:
      "Filters WebSerial picker to Niimbot VID_3513 (built-in Windows usbser.sys) and CH34x VID_1A86",
    disconnect: "Disconnect",
    tipsSummary: "Windows BLE & Multi-PC Tips",
    tip1Bold: "Unplug PC USB-C for BLE: ",
    tip1Text: "B1 prioritizes USB data over Bluetooth when plugged into a computer port.",
    tip2Bold: "Single host at a time: ",
    tip2Text: "Close mobile or desktop Niimbot apps before scanning.",
    tip3Bold: "Zero drivers needed: ",
    tip3Text:
      "Works in Edge or Chrome on Intel/AMD x64 and Snapdragon ARM64 over HTTPS or localhost.",
    telModel: "Model",
    telBattery: "Battery",
    telPaperLid: "Paper & Lid",
    telRoll: "Roll",
    lidClosed: "Lid: Closed",
    lidOpen: "Lid: OPEN (!)",
    lidNa: "Lid: n/a",
    paperLoaded: "Paper: Loaded",
    paperEmpty: "Paper: EMPTY (!)",
    paperNa: "Paper: n/a",
    rollManualGap: "50×50 mm Gap Roll (WithGaps)",
    rollRfidGeneric: "RFID Spool",
    rollSummaryRfid: "{size} · {remaining}/{all} left (SN: {sn})",
    sensorModeLabel: "Label Sensor Mode",
    sensorWithGaps: "Die-Cut Gap (WithGaps = 1)",
    sensorTransparent: "Transparent (Transparent = 5)",
    sensorBlackMark: "Black Mark (Black = 2)",
    gapAlignmentLabel: "Gap Alignment",
    feedGapBtn: "Test 1-Label Gap Feed",
    feedGapTitle:
      "Recommended: Feeds 1 blank sticker (zero thermal heat) to align the next die-cut gap with the tear bar",
    calibrateBtn: "Calibrate Sensor",
    calibrateTitle: "Factory optical voltage calibration (0x8E): feeds ~15 cm (2–3 labels) on B1",

    hwIdleBanner: "Connect Niimbot B1 via USB-C or Bluetooth BLE.",
    hwOpeningUsb: "Opening WebSerial picker (select Niimbot B1 USB Serial Device)…",
    hwConnectedUsb: "USB Serial Connected — ready to print 50×50 mm gap labels.",
    hwCancelledUsb: "USB-C connection cancelled.",
    hwScanningBle: "Scanning Bluetooth BLE (unplug PC USB-C cable from B1 and select B1-…)…",
    hwConnectedBle: "Bluetooth BLE Connected — 20 ms wireless packet pacing active.",
    hwCancelledBle: "Bluetooth BLE connection cancelled.",
    hwDisconnected: "Printer disconnected cleanly.",
    hwTelemetryRefreshed: "Telemetry & RFID spool status refreshed.",
    hwFeedingGap: "Advancing 1 blank sticker to optical die-cut gap…",
    hwFedGap: "Gap alignment feed complete — verify the tear bar sits on the gap.",
    hwFeedFailed: "Gap alignment feed failed: {err}",
    hwCalibrating: "Running B1 optical gap calibration (0x8E — feeds ~2–3 labels)…",
    hwCalibrated: "Optical gap sensor calibration finished.",
    hwCalibrateFailed: "Gap calibration failed: {err}",
    hwPrintingSingle:
      "Printing Page {page} ({copies} {copyWord}, density {density}, LabelType={labelType})…",
    hwPrintedSingle: "Printed Page {page} ({copies} {stickerWord}) cleanly.",
    hwPrintSingleFailed: "Print failed on Page {page}: {err}",
    hwBatchStarting: "Starting batch print: {pages} {pageWord} ({stickers} {stickerWord})…",
    hwBatchStopped:
      "Batch stopped cleanly after {printed} {stickerWord} ({completed}/{selected} pages).",
    hwBatchDone: "Batch completed cleanly: printed {printed} {stickerWord}.",
    hwBatchFailed: "Batch print failed: {err}",
    progIdle: "Idle",
    progBatchPrefix: "Sticker {current} of {total} (Page {batchPage}/{batchTotal}) · ",
    progInit: "{prefix}Initializing B1 printhead & gap sensor…",
    progTransfer: "{prefix}Uploading 384×400 bitmap: {pct}%",
    progPrinting: "{prefix}Printing {current}/{total} · Print {printPct}% · Feed {feedPct}%",
    progStopping: "Stopping batch after active sticker…",
    progCleanup: "Finalizing printEnd()…",
    progDone: "Completed",

    rasterPanelAria: "Raster and Thermal Engine",
    rasterPanelTitle: "Raster & Thermal Engine",
    sizingModeLabel: "Sizing Mode",
    sizingGroupAria: "Sizing mode",
    fitScale: "Scale to Fit",
    fitBleed: "1:1 Bleed Crop",
    ditherModeLabel: "1-Bit Engine",
    ditherGroupAria: "1-bit binarization mode",
    ditherThreshold: "Sharp Threshold",
    ditherAtkinson: "Atkinson Dither",
    thresholdLabel: "Threshold",
    rotationLabel: "Rotation",
    rotationGroupAria: "Page rotation",
    densityLabel: "Thermal Density",
    copiesLabel: "Copies",
    copiesDecAria: "Decrease copies",
    copiesIncAria: "Increase copies",
    copiesInputAria: "Copies per sticker",
    invertLabel: "Invert Colors",
    safeGuidesLabel: "1 mm Safe Guides",

    stagePanelAria: "Label Previews and Batch Queue",
    dropzoneAria: "Select or drop PDF file",
    dropzoneTitle: "Drop 50×50 mm PDF Label Sheet",
    dropzoneHint: "Click to browse · Up to 25 MB / 100 pages · Local offline rendering",
    loadSampleBtn: "Load Sample 50×50 mm Sticker",
    loadSampleTitle: "Generate and preview a built-in 50×50 mm calibration PDF",
    samplePdfFileName: "calibration-50x50mm.pdf",
    noPdfLoaded: "No PDF loaded",
    pdfReadyStatus: "Ready for PDF input.",
    pdfRasterizing: "Rasterizing {name} at 384×400 px…",
    pdfRenderedOne: "Rendered {count} label (384×400 1-bit verified).",
    pdfRenderedMany: "Rendered {count} labels (384×400 1-bit verified).",
    pdfFailed: "PDF rasterization failed: {err}",
    pdfUnsupported: 'Unsupported file "{name}". Please choose a .pdf file.',
    pdfEmpty: '"{name}" is empty (0 bytes).',
    pdfOversized: '"{name}" ({size} MB) exceeds the {max} MB safety limit.',
    previewsHeading: "50×50 mm Die-Cut Label Previews",
    pagesCountOne: "{n} page",
    pagesCountMany: "{n} pages",
    emptyStateText:
      "Drop a single- or multi-page 50×50 mm PDF above to inspect 1-bit 384×400 px stickers on silicone release liners.",
    selectAll: "Select All",
    deselectAll: "Deselect",
    batchSummaryOne: "{selected}/{total} selected · {stickers} sticker",
    batchSummaryMany: "{selected}/{total} selected · {stickers} stickers",
    printSelected: "Print Selected ({n})",
    printAll: "Print All ({n})",
    stopAfterCurrent: "Stop After Current",
    stoppingBatch: "Stopping…",
    cardPage: "Page {n}",
    cardNon50mm: "Non-50mm: {w}×{h} mm",
    cardFrameTitle: "Hairline side bands mark 1 mm (8 px) unprintable thermal margins",
    cardMetaDims: "{w}×{h} px · 203 DPI · {pkts} pkts",
    cardMetaInk: "Ink: {dots} dots ({pct}%)",
    cardPrintBtn: "Print Sticker",
    cardPrintingBtn: "Printing…",
    cardConnectBtn: "Connect B1",
    wordCopyOne: "copy",
    wordCopyMany: "copies",
    wordStickerOne: "sticker",
    wordStickerMany: "stickers",
    wordPageOne: "page",
    wordPageMany: "pages",

    consoleTitle: "Activity & Protocol Console",
    consoleSubtitle:
      "WebSerial / BLE GATT negotiation, optical gap calibration, and B1PrintTask packet states.",
    consoleClear: "Clear",
    eventsOne: "{n} event",
    eventsMany: "{n} events",

    manualModalTitle: "Niimbot B1 User Manual",
    manualModalSubtitle: "Complete setup, USB/Bluetooth pairing, and print-quality reference.",
    manualCloseAria: "Close User Manual",
    manualTabQuickstart: "Quick Start",
    manualTabHardware: "Hardware & LEDs",
    manualTabConnection: "USB & Bluetooth",
    manualTabQuality: "Quality & Gaps",
    manualTabPwa: "Install App",

    manualQuickIntro:
      "Print razor-sharp 50×50 mm thermal labels in four quick steps directly from Microsoft Edge or Google Chrome — zero installers required.",
    manualQuickStep1Title: "1. Load the 50×50 mm Roll",
    manualQuickStep1Body:
      "Push the left-side release lever down to open the translucent blue cover. Place the roll so stickers feed out from the top with the print surface facing UP toward the exit slot, leaving ~2 mm past the tear bar before snapping the lid shut.",
    manualQuickStep2Title: "2. Connect the Printer",
    manualQuickStep2Body:
      "Turn the B1 on (hold the round power button 3 s). Plug in USB-C and click Connect USB-C — or unplug USB-C from the PC and click Connect Bluetooth.",
    manualQuickStep3Title: "3. Drop Your 50×50 mm PDF",
    manualQuickStep3Body:
      "Drag a single- or multi-page 5×5 cm PDF onto the dropzone. Everything stays 100% inside your browser; nothing is ever uploaded.",
    manualQuickStep4Title: "4. Align & Print",
    manualQuickStep4Body:
      "If you just reloaded labels, click Test 1-Label Gap Feed once so the optical gap sensor aligns at the tear bar. Choose Sharp Threshold for QR codes/text, then click Print Sticker or Print All.",

    manualHwHeroTitle: "Niimbot B1 Anatomy (384 × 400 px @ 203 DPI)",
    manualHwHeroBody:
      "Your B1 houses a 48 mm ceramic thermal printhead (384 dots) centered above the paper exit slot. Each 50 mm sticker naturally has 1 mm (8 px) unprintable safety borders on the left and right edges.",
    manualHwImgAlt: "Niimbot B1 portable thermal label printer front view",
    manualHwPart1Title: "Left Release Lever",
    manualHwPart1Body:
      "Grey push-latch on the left side releases the translucent cover for paper loading and printhead cleaning.",
    manualHwPart2Title: "Translucent Cover & Tear Bar",
    manualHwPart2Body:
      "Holds 20–50 mm rolls; keep the dark optical gap sensor window clear of adhesive residue.",
    manualHwPart3Title: "Power & Feed Button",
    manualHwPart3Body:
      "Hold 3 seconds to power On/Off. Tap once while idle to feed one label to the next gap.",
    manualHwPart4Title: "Front Status LED Indicator",
    manualHwPart4Body:
      "Green/Blue steady = Ready · Slow flash = Bluetooth advertising · Red flash = Lid open, empty roll, or low battery.",
    manualHwCalloutTitle: "Keep the Printhead Clean",
    manualHwCalloutBody:
      "If faint vertical white streaks appear across labels, power off the B1 and gently wipe the dark thermal bar under the exit slot with an isopropyl alcohol swab.",

    manualConnIntro:
      "Label Studio supports every Windows 10/11 PC (ARM64 Snapdragon laptops and Intel/AMD x64 desktops) without third-party drivers.",
    manualConnUsbTitle: "USB-C Wired (Recommended for Batch Runs)",
    manualConnUsbBody:
      "Windows automatically binds its built-in usbser.sys serial driver to VID_3513:PID_0002. Keep Filter VID_3513 enabled, select the USB Serial Device (COMx) in the popup, and print at full 10 ms packet speed. Close Niimbot Desktop first so the COM port isn't locked.",
    manualConnBleTitle: "Bluetooth Low Energy (Wireless)",
    manualConnBleBody:
      "Do NOT pair inside Windows Settings Bluetooth menus. Keep Windows Bluetooth ON, click Connect Bluetooth directly inside this app, choose B1-…, and pair in Chrome/Edge's prompt (automatic 20 ms GATT pacing prevents Win11 packet drops).",
    manualConnWarnTitle: "Why Doesn't My B1 Appear Over Bluetooth?",
    manualConnWarnBody:
      "When a USB-C data cable is plugged into a computer, the Niimbot B1 disables Bluetooth advertising and prioritizes USB. Unplug the PC USB-C cable (or use a wall charger only) and disconnect any phone app before scanning BLE.",

    manualQualIntro:
      "Match the 1-bit engine and gap alignment tool to your artwork for dark, smudge-free 203 DPI prints.",
    manualQualThreshTitle: "Sharp Threshold (QR Codes, Barcodes & Fine Text)",
    manualQualThreshBody:
      "Forces pure crisp black/white cutoffs with zero speckle patterns so smartphone scanners and shipping readers decode small QR codes instantly. Raise Threshold (170–195) if strokes look too thin.",
    manualQualAtkinsonTitle: "Atkinson Dither (Logos & Illustrations)",
    manualQualAtkinsonBody:
      "Uses clean Bill Atkinson error diffusion to preserve tonal shading and curved brand marks without muddy blotches.",
    manualQualDensityTitle: "Thermal Density (1–5)",
    manualQualDensityBody:
      "Default 3 suits genuine Niimbot matte white rolls. Use 2 for sensitive glossy stock, or 4 for deeper contrast on third-party matte paper.",
    manualQualGapTitle: "Test 1-Label Feed vs. Calibrate Sensor",
    manualQualGapBody:
      "Click Test 1-Label Gap Feed after loading paper (wastes only 1 blank label, zero heat). Use Calibrate Sensor (0x8E, feeds ~2–3 labels) ONLY when switching paper brands or if prints creep across sticker gaps.",

    manualPwaIntro:
      "Install Label Studio as a native-feeling desktop app for one-click launch and offline PDF printing.",
    manualPwaInstallTitle: "1-Click Edge / Chrome Desktop Install",
    manualPwaInstallBody:
      "Click the Install App button in the top bar (or the install icon in your browser address bar) to pin Label Studio to your Windows Start Menu or Taskbar. All scripts and the PDF engine stay cached locally in Service Worker storage.",
    manualPwaPrivacyTitle: "Zero-Cloud Privacy & Site Isolation",
    manualPwaPrivacyBody:
      "PDF decoding and dithering execute exclusively in an isolated offline Web Worker inside your browser. Documents, QR payloads, and session cookies from any other app are never accessed or transmitted.",
  },

  "pt-BR": {
    docTitle: "Label Studio — Niimbot B1 (50×50 mm)",
    modelBadge: "Niimbot B1 · 50×50 mm",
    topbarSubtitle:
      "Central de Impressão Térmica · USB-C e Bluetooth BLE sem driver · 203 DPI · 384×400 px",
    statusDisconnected: "Desconectado",
    statusReadyUsb: "Pronto · USB-C",
    statusReadyBle: "Pronto · Bluetooth",
    statusReadyGeneric: "Pronto",
    statusPrinting: "Imprimindo…",
    statusCalibrating: "Calibrando…",
    statusConnectingUsb: "Conectando USB-C…",
    statusScanningBle: "Buscando Bluetooth…",
    statusError: "Erro na Impressora",
    installApp: "Instalar App",
    manualBtn: "Ajuda",
    manualBtnTitle: "Abrir Manual de Uso e Solução de Problemas da Niimbot B1",
    langGroupAria: "Idioma",
    langEnAria: "Inglês",
    langPtAria: "Português (Brasil)",
    themeGroupAria: "Modo de aparência",
    themeLight: "Claro",
    themeAuto: "Auto",
    themeDark: "Escuro",

    warnNoHardwareTitle: "API de Hardware Indisponível no Navegador: ",
    warnNoHardwareBeforeEdge: "Nem WebSerial nem WebBluetooth estão habilitados aqui. Abra no ",
    warnNoHardwareEdge: "Microsoft Edge",
    warnNoHardwareOr: " ou ",
    warnNoHardwareChrome: "Google Chrome",
    warnNoHardwareOver: " em ",
    warnNoHardwareTail: " em qualquer PC Windows x64 ou ARM64.",
    warnInsecureTitle: "Origem Insegura: ",
    warnInsecureBody: "WebSerial e WebBluetooth exigem ",
    warnInsecureOr: " ou ",

    printerPanelAria: "Impressora e Sensor",
    printerPanelTitle: "Impressora e Sensor",
    refreshBtn: "Atualizar",
    refreshBtnTitle: "Atualizar bateria, tampa e telemetria RFID do rolo",
    devicePodAlt: "Impressora térmica de etiquetas Niimbot B1",
    devicePodTitle: "Niimbot B1",
    devicePodSpec: "203 DPI · Cabeça 48 mm (384×400 px)",
    devicePodGuideLink: "Guia de Uso e LEDs →",
    connectUsb: "Conectar USB-C",
    connectBle: "Conectar Bluetooth",
    filterVid: "Filtrar VID_3513",
    filterVidTitle:
      "Filtra o seletor WebSerial para Niimbot VID_3513 (usbser.sys nativo do Windows) e CH34x VID_1A86",
    disconnect: "Desconectar",
    tipsSummary: "Dicas de Bluetooth e Múltiplos PCs",
    tip1Bold: "Desconecte o USB-C para usar BLE: ",
    tip1Text: "A B1 prioriza o cabo USB quando conectada a uma porta de computador.",
    tip2Bold: "Um computador por vez: ",
    tip2Text: "Feche outros apps Niimbot no celular ou PC antes de parear.",
    tip3Bold: "Sem drivers extras: ",
    tip3Text:
      "Funciona no Edge ou Chrome em Windows x64 (Intel/AMD) e Snapdragon ARM64 via HTTPS ou localhost.",
    telModel: "Modelo",
    telBattery: "Bateria",
    telPaperLid: "Papel e Tampa",
    telRoll: "Rolo",
    lidClosed: "Tampa: Fechada",
    lidOpen: "Tampa: ABERTA (!)",
    lidNa: "Tampa: n/d",
    paperLoaded: "Papel: Carregado",
    paperEmpty: "Papel: VAZIO (!)",
    paperNa: "Papel: n/d",
    rollManualGap: "Rolo Adesivo 50×50 mm (Sensor de Espaço)",
    rollRfidGeneric: "Rolo RFID",
    rollSummaryRfid: "{size} · {remaining}/{all} restantes (SN: {sn})",
    sensorModeLabel: "Modo do Sensor de Etiqueta",
    sensorWithGaps: "Sensor de Espaço — Etiqueta Adesiva (WithGaps = 1)",
    sensorTransparent: "Etiqueta Transparente (Transparent = 5)",
    sensorBlackMark: "Rolo com Tarja Preta (Black = 2)",
    gapAlignmentLabel: "Alinhamento de Etiqueta",
    feedGapBtn: "Testar Avanço (1 Etiqueta)",
    feedGapTitle:
      "Recomendado: Avança 1 etiqueta em branco (sem aquecer) para alinhar o espaço à serrilha",
    calibrateBtn: "Calibrar Sensor",
    calibrateTitle:
      "Calibração óptica de fábrica (0x8E): avança cerca de 15 cm (2–3 etiquetas) na B1",

    hwIdleBanner: "Conecte a Niimbot B1 via cabo USB-C ou Bluetooth BLE.",
    hwOpeningUsb: "Abrindo seletor WebSerial (selecione Dispositivo Serial USB Niimbot B1)…",
    hwConnectedUsb: "USB Serial Conectado — pronto para imprimir etiquetas 50×50 mm.",
    hwCancelledUsb: "Conexão USB-C cancelada.",
    hwScanningBle: "Buscando Bluetooth BLE (desplugue o USB-C do PC e escolha B1-…)…",
    hwConnectedBle: "Bluetooth BLE Conectado — ritmo sem fio de 20 ms ativo.",
    hwCancelledBle: "Conexão Bluetooth BLE cancelada.",
    hwDisconnected: "Impressora desconectada com segurança.",
    hwTelemetryRefreshed: "Telemetria e status do rolo RFID atualizados.",
    hwFeedingGap: "Avançando 1 etiqueta em branco até o espaço óptico…",
    hwFedGap:
      "Avanço concluído — confirme se a serrilha está exatamente no espaço entre etiquetas.",
    hwFeedFailed: "Falha ao avançar etiqueta: {err}",
    hwCalibrating: "Executando calibração óptica B1 (0x8E — avança 2–3 etiquetas)…",
    hwCalibrated: "Calibração do sensor óptico concluída.",
    hwCalibrateFailed: "Falha na calibração do sensor: {err}",
    hwPrintingSingle:
      "Imprimindo Página {page} ({copies} {copyWord}, densidade {density}, Sensor={labelType})…",
    hwPrintedSingle: "Página {page} ({copies} {stickerWord}) impressa com sucesso.",
    hwPrintSingleFailed: "Falha ao imprimir Página {page}: {err}",
    hwBatchStarting: "Iniciando lote: {pages} {pageWord} ({stickers} {stickerWord})…",
    hwBatchStopped:
      "Lote interrompido com segurança após {printed} {stickerWord} ({completed}/{selected} páginas).",
    hwBatchDone: "Lote concluído: {printed} {stickerWord} impressa(s) com sucesso.",
    hwBatchFailed: "Falha na impressão em lote: {err}",
    progIdle: "Ocioso",
    progBatchPrefix: "Etiqueta {current} de {total} (Pág. {batchPage}/{batchTotal}) · ",
    progInit: "{prefix}Inicializando cabeça térmica B1 e sensor de espaço…",
    progTransfer: "{prefix}Enviando matriz 384×400 px: {pct}%",
    progPrinting:
      "{prefix}Imprimindo {current}/{total} · Impressão {printPct}% · Avanço {feedPct}%",
    progStopping: "Parando o lote após a etiqueta atual…",
    progCleanup: "Finalizando printEnd()…",
    progDone: "Concluído",

    rasterPanelAria: "Motor Gráfico e Térmico",
    rasterPanelTitle: "Motor Gráfico e Térmico",
    sizingModeLabel: "Ajuste de Tamanho",
    sizingGroupAria: "Modo de ajuste de tamanho",
    fitScale: "Ajustar (Seguro)",
    fitBleed: "Corte Real 1:1",
    ditherModeLabel: "Modo Monocromático (1-Bit)",
    ditherGroupAria: "Modo de binarização 1-bit",
    ditherThreshold: "Nitidez (QR e Texto)",
    ditherAtkinson: "Pontilhado (Logos)",
    thresholdLabel: "Limiar",
    rotationLabel: "Rotação",
    rotationGroupAria: "Rotação da página",
    densityLabel: "Densidade Térmica",
    copiesLabel: "Cópias",
    copiesDecAria: "Diminuir cópias",
    copiesIncAria: "Aumentar cópias",
    copiesInputAria: "Cópias por etiqueta",
    invertLabel: "Inverter Cores",
    safeGuidesLabel: "Guias de Margem (1 mm)",

    stagePanelAria: "Pré-visualização e Fila em Lote",
    dropzoneAria: "Selecionar ou soltar arquivo PDF",
    dropzoneTitle: "Solte o PDF de Etiquetas 50×50 mm",
    dropzoneHint: "Clique para escolher · Até 25 MB / 100 páginas · Processamento local offline",
    loadSampleBtn: "Carregar Etiqueta Exemplo 50×50 mm",
    loadSampleTitle: "Gerar e visualizar uma etiqueta PDF de calibração 50×50 mm integrada",
    samplePdfFileName: "calibracao-50x50mm.pdf",
    noPdfLoaded: "Nenhum PDF carregado",
    pdfReadyStatus: "Pronto para receber PDF.",
    pdfRasterizing: "Convertendo {name} para 384×400 px…",
    pdfRenderedOne: "{count} etiqueta convertida (384×400 px 1-bit verificada).",
    pdfRenderedMany: "{count} etiquetas convertidas (384×400 px 1-bit verificadas).",
    pdfFailed: "Falha ao converter PDF: {err}",
    pdfUnsupported: 'Arquivo não suportado ("{name}"). Selecione um arquivo .pdf.',
    pdfEmpty: '"{name}" está vazio (0 bytes).',
    pdfOversized: '"{name}" ({size} MB) excede o limite de segurança de {max} MB.',
    previewsHeading: "Pré-visualização das Etiquetas 50×50 mm",
    pagesCountOne: "{n} página",
    pagesCountMany: "{n} páginas",
    emptyStateText:
      "Solte um PDF 50×50 mm (uma ou várias páginas) acima para conferir os pontos térmicos 384×400 px sobre o papel adesivo.",
    selectAll: "Selecionar Tudo",
    deselectAll: "Limpar Seleção",
    batchSummaryOne: "{selected}/{total} selecionada(s) · {stickers} etiqueta",
    batchSummaryMany: "{selected}/{total} selecionada(s) · {stickers} etiquetas",
    printSelected: "Imprimir Selecionadas ({n})",
    printAll: "Imprimir Todas ({n})",
    stopAfterCurrent: "Parar Após Atual",
    stoppingBatch: "Parando…",
    cardPage: "Página {n}",
    cardNon50mm: "Fora de 50mm: {w}×{h} mm",
    cardFrameTitle: "Faixas laterais indicam a margem não imprimível de 1 mm (8 px)",
    cardMetaDims: "{w}×{h} px · 203 DPI · {pkts} pcts",
    cardMetaInk: "Tinta: {dots} pontos ({pct}%)",
    cardPrintBtn: "Imprimir Etiqueta",
    cardPrintingBtn: "Imprimindo…",
    cardConnectBtn: "Conecte a B1",
    wordCopyOne: "cópia",
    wordCopyMany: "cópias",
    wordStickerOne: "etiqueta",
    wordStickerMany: "etiquetas",
    wordPageOne: "página",
    wordPageMany: "páginas",

    consoleTitle: "Console de Atividade e Protocolo",
    consoleSubtitle:
      "Negociação WebSerial / BLE GATT, calibração óptica e estados de pacote B1PrintTask.",
    consoleClear: "Limpar",
    eventsOne: "{n} evento",
    eventsMany: "{n} eventos",

    manualModalTitle: "Manual da Impressora Niimbot B1",
    manualModalSubtitle: "Guia completo de instalação, conexão USB/Bluetooth e qualidade térmica.",
    manualCloseAria: "Fechar Manual de Uso",
    manualTabQuickstart: "Passo Rápido",
    manualTabHardware: "Hardware e LEDs",
    manualTabConnection: "USB e Bluetooth",
    manualTabQuality: "Qualidade e Sensor",
    manualTabPwa: "Instalar App",

    manualQuickIntro:
      "Imprima etiquetas térmicas 50×50 mm com nitidez máxima em quatro passos rápidos direto pelo Microsoft Edge ou Google Chrome — sem instalar drivers.",
    manualQuickStep1Title: "1. Carregue o Rolo 50×50 mm",
    manualQuickStep1Body:
      "Empurre a trava cinza na lateral esquerda para abrir a tampa azul translúcida. Coloque o rolo com o lado adesivo/impresso voltado para CIMA na saída de papel, puxando cerca de 2 mm além da serrilha antes de fechar a tampa com firmeza.",
    manualQuickStep2Title: "2. Conecte a Impressora",
    manualQuickStep2Body:
      "Ligue a B1 (segure o botão circular por 3 s). Conecte via cabo USB-C e clique em Conectar USB-C — ou desplugue o cabo USB-C do computador e clique em Conectar Bluetooth.",
    manualQuickStep3Title: "3. Solte seu PDF 50×50 mm",
    manualQuickStep3Body:
      "Arraste um PDF de 5×5 cm (página única ou lote) para a área de envio. Todo o processamento ocorre localmente no navegador; nada é enviado à nuvem.",
    manualQuickStep4Title: "4. Alinhe e Imprima",
    manualQuickStep4Body:
      "Ao trocar de rolo, clique em Testar Avanço (1 Etiqueta) uma vez para o sensor óptico alinhar o espaço na serrilha. Use Nitidez (QR e Texto) para códigos QR e clique em Imprimir Etiqueta ou Imprimir Todas.",

    manualHwHeroTitle: "Anatomia da Niimbot B1 (384 × 400 px @ 203 DPI)",
    manualHwHeroBody:
      "A B1 possui cabeça térmica cerâmica de 48 mm (384 pontos) centralizada sob a saída de papel. Em etiquetas de 50 mm, sobram naturalmente 1 mm (8 px) de margem de segurança à esquerda e à direita.",
    manualHwImgAlt: "Vista frontal da impressora térmica portátil Niimbot B1",
    manualHwPart1Title: "Trava Lateral Esquerda",
    manualHwPart1Body:
      "Alavanca cinza na lateral esquerda que destrava a tampa translúcida para troca de rolo e limpeza.",
    manualHwPart2Title: "Tampa Azul e Serrilha de Corte",
    manualHwPart2Body:
      "Comporta rolos de 20 a 50 mm; mantenha o sensor óptico de espaço sempre livre de cola e poeira.",
    manualHwPart3Title: "Botão Liga/Desliga e Avanço",
    manualHwPart3Body:
      "Segure 3 segundos para Ligar/Desligar. Dê um toque rápido em espera para avançar 1 etiqueta até o próximo espaço.",
    manualHwPart4Title: "Indicador LED Frontal",
    manualHwPart4Body:
      "Verde/Azul fixo = Pronta · Piscando lento = Aguardando Bluetooth · Vermelho piscando = Tampa aberta, sem papel ou bateria baixa.",
    manualHwCalloutTitle: "Limpeza da Cabeça Térmica",
    manualHwCalloutBody:
      "Se surgirem faixas verticais brancas falhadas na impressão, desligue a B1 e passe suavemente um cotonete com álcool isopropílico na barra térmica escura abaixo da saída.",

    manualConnIntro:
      "O Label Studio funciona em qualquer PC Windows 10/11 (notebooks ARM64 Snapdragon e desktops Intel/AMD x64) sem drivers proprietários.",
    manualConnUsbTitle: "USB-C com Cabo (Recomendado para Lotes)",
    manualConnUsbBody:
      "O Windows associa nativamente o driver serial usbser.sys ao VID_3513:PID_0002. Mantenha Filtrar VID_3513 ativado, selecione Dispositivo Serial USB (COMx) no aviso do navegador e imprima na velocidade máxima de 10 ms. Feche o app Niimbot Desktop antes para não travar a porta COM.",
    manualConnBleTitle: "Bluetooth Low Energy (Sem Fio)",
    manualConnBleBody:
      "NÃO pareie pelas Configurações de Bluetooth do Windows. Mantenha o Bluetooth ligado, clique direto em Conectar Bluetooth aqui no app e escolha B1-… na janela do Edge/Chrome (o controle automático de 20 ms evita perda de pacotes no Windows 11).",
    manualConnWarnTitle: "Por que a B1 não aparece no Bluetooth?",
    manualConnWarnBody:
      "Quando o cabo USB-C está plugado em um computador, a Niimbot B1 desativa o Bluetooth e prioriza o cabo. Desconecte o cabo USB-C do PC (carregador de tomada pode ficar ligado) e feche o aplicativo do celular antes de buscar.",

    manualQualIntro:
      "Escolha o algoritmo 1-bit e a ferramenta de avanço ideais para impressões escuras e legíveis em 203 DPI.",
    manualQualThreshTitle: "Nitidez (QR Codes, Códigos de Barras e Textos)",
    manualQualThreshBody:
      "Aplica corte puro preto/branco sem pontilhados, garantindo leitura instantânea em celulares e leitores. Aumente o Limiar (170–195) se letras finas parecerem claras demais.",
    manualQualAtkinsonTitle: "Pontilhado Atkinson (Logotipos e Ilustrações)",
    manualQualAtkinsonBody:
      "Emprega difusão de erro de Bill Atkinson para preservar gradientes e contornos suaves em logotipos sem borrões.",
    manualQualDensityTitle: "Densidade Térmica (1–5)",
    manualQualDensityBody:
      "O padrão 3 é ideal para rolos originais foscos Niimbot. Use 2 para etiquetas brilhosas sensíveis ao calor, ou 4 para maior contraste em papel térmico paralelo.",
    manualQualGapTitle: "Testar Avanço (1 Etiqueta) vs. Calibrar Sensor",
    manualQualGapBody:
      "Use Testar Avanço (1 Etiqueta) sempre que inserir um rolo novo (usa só 1 etiqueta, sem aquecer). Use Calibrar Sensor (0x8E, avança 2–3 etiquetas) apenas se trocar de fabricante ou se a impressão desalinhar da divisão.",

    manualPwaIntro:
      "Instale o Label Studio como aplicativo independente no Windows para abertura em um clique e impressão offline.",
    manualPwaInstallTitle: "Instalação em 1 Clique no Edge / Chrome",
    manualPwaInstallBody:
      "Clique em Instalar App na barra superior (ou no ícone de instalação na barra de endereços) para fixar o Label Studio no Menu Iniciar ou Barra de Tarefas. Todo o motor de PDF fica em cache local.",
    manualPwaPrivacyTitle: "Privacidade Local e Isolamento de Origem",
    manualPwaPrivacyBody:
      "A leitura do PDF e a conversão térmica rodam 100% em um Web Worker local no seu computador. Documentos, QR codes e cookies de outros aplicativos nunca saem do navegador.",
  },
};

export function formatText(template: string, params: Record<string, string | number>): string {
  let out = template;
  for (const [key, value] of Object.entries(params)) {
    out = out.split(`{${key}}`).join(String(value));
  }
  return out;
}

export function resolveInitialLocale(
  storage?: Pick<Storage, "getItem"> | null,
  navigatorLang?: string,
): Locale {
  try {
    const store =
      storage === undefined && typeof localStorage !== "undefined" ? localStorage : storage;
    const saved = store?.getItem(LOCALE_STORAGE_KEY);
    if (saved === "pt-BR" || saved === "en") {
      return saved;
    }
  } catch {
    // Ignore storage access errors
  }

  const lang = navigatorLang ?? (typeof navigator !== "undefined" ? navigator.language : "en");
  return /^pt\b/i.test(lang) ? "pt-BR" : "en";
}

export function applyDocumentLocale(locale: Locale, persist = true): void {
  if (typeof document !== "undefined") {
    document.documentElement.lang = locale;
    document.title = TRANSLATIONS[locale].docTitle;
  }
  if (persist) {
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(LOCALE_STORAGE_KEY, locale);
      }
    } catch {
      // Ignore storage write errors
    }
  }
}
