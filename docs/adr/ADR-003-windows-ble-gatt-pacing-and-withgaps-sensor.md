# ADR-003: Windows BLE GATT 20 ms Packet Pacing, Optical `WithGaps` Alignment & Safe `printEnd()` Recovery

- **Status**: Accepted (`v1.0.0` — `v1.2.0`)
- **Date**: 2026-11-16
- **Context**: Runtime inspection of `@mmote/niimbluelib` shows bitmap row commands (`PrintBitmapRow`, `PrintBitmapRowIndexed`, `PrintEmptyRow`) execute as unacknowledged `oneWay` writes over Bluetooth LE `writeValueWithoutResponse` with a library default `10 ms` interval. On Windows 11 WinRT BLE stacks, back-to-back `10 ms` GATT row bursts overflow controller buffers before `PageEnd` (`0xE3`) can commit, silently dropping or freezing jobs mid-label. Additionally, leaving `PrintStart` open without `PrintEnd` (`0xF3`) after a timeout locks the printer until power-cycled.

## Decision
1. **Transport-Adaptive Pacing**: Configure `NiimbotSerialClient` with `USB_PACKET_INTERVAL_MS = 10` (`15 s` page timeout, `100 ms` poll), and configure `NiimbotBluetoothClient` with **`BLE_PACKET_INTERVAL_MS = 20`** (`30 s` page timeout, `250 ms` poll) inside `B1PrinterController`.
2. **Optical Gap Default & Non-Wasteful 1-Label Feed**: Lock `DEFAULT_LABEL_TYPE = LabelType.WithGaps` (`1`) in `SetLabelType` (`0x23`) so the optical sensor halts each printed sticker cleanly at the tear bar. Separate factory sensor voltage calibration (`0x8E`, feeds `~2–3` labels) from a zero-heat 1-sticker `feedBlankToGap()` helper so roll reloads waste at most one sticker.
3. **Guaranteed `finally` Cleanup & `AbortController` Batch Cancellation**: Pause background 2 s heartbeat polling during print/calibration tasks to prevent packet interleaving, always execute `task.printEnd()` inside `finally` even after timeouts/errors, and support clean mid-batch `Stop After Current` cancellation via `AbortController`.

## Consequences
- **Positive**: Eliminates Win11 BLE GATT buffer drops, guarantees state-machine recovery after lid-open/paper-out/timeout faults, and preserves die-cut tear alignment across multi-page batch runs.
- **Negative / Mitigations**: Wireless BLE transfers run at ~`8 s` maximum raw row interval vs. `4 s` on USB-C (`400 rows * 20 ms`); batch UI surfacing live transfer/feed progress sets accurate operator expectations and recommends USB-C for large runs.
