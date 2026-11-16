# ADR-001: Zero-Driver WebSerial & WebBluetooth PWA Architecture Across Windows ARM64 and x86_64

- **Status**: Accepted (`v1.0.0` — `v1.2.0`)
- **Date**: 2026-11-16
- **Context**: Windows on ARM64 (Qualcomm Snapdragon) hosts fail to install legacy x86 vendor thermal printer spooler drivers, while corporate/multi-PC workstations frequently disallow unprivileged local installers, USB filter drivers, or Electron/Node background daemons. Meanwhile, Chromium browsers (`Microsoft Edge` and `Google Chrome >= 117`) natively expose W3C WebSerial and WebBluetooth over secure origins (`https://` or `http://localhost`), and Windows 10/11 automatically binds the built-in CDC-ACM driver (`usbser.sys`) to the Niimbot B1 USB interface (`VID_3513:PID_0002`).

## Decision
Build **Label Studio** as an offline-capable static browser PWA (`Vite + TypeScript` with `base: "./"` and relative Service Worker caching) communicating directly with the Niimbot B1 via `@mmote/niimbluelib`:
1. **Dynamic WebSerial Enumeration**: Filter browser port pickers to `VID_3513:PID_0002` / `VID_1A86` without hardcoding host-specific COM port numbers (`COM3`, `COM9`, etc.), guaranteeing identical behavior across ARM64 and x86_64 Windows PCs.
2. **Untethered WebBluetooth GATT Fallback**: Support wireless BLE printing via service UUID `e7810a71-73ae-499d-8c15-faa9aef0c3f2` with zero native companion bridge.
3. **100% Client-Side RAM Execution**: Parse PDFs, dither bitmaps, and stream protocol packets solely in browser memory without any server backend or persistent cloud storage.

## Consequences
- **Positive**: Zero local installation or administrator elevation required on secondary Windows PCs; instant cross-architecture portability (`ARM64` and `x64`); trivial static HTTPS hosting behind GitHub Pages or subpath reverse proxies.
- **Negative / Mitigations**: Requires Chromium-based browsers (`Edge` or `Chrome`) in a secure context (`Permissions-Policy: serial=(self), bluetooth=(self), usb=(self)`). Non-Chromium browsers display a localized actionable capability warning.
