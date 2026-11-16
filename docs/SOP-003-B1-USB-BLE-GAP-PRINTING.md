# SOP-003: Niimbot B1 USB (`COM9`) / BLE Connection, Gap Calibration & Single-Sticker Printing

## 1. Prerequisites
- **Environment**: Local Windows 11 ARM64 (`Arm64`) repository at `C:\repos\Niimbot\niimbot-b1-pdf-printer` on branch `feat/b1-hardware-transport` (SOP-001 & SOP-002 completed).
- **Browser**: **Microsoft Edge** or **Google Chrome** running over `http://localhost` (required for `navigator.serial` WebSerial and `navigator.bluetooth` WebBluetooth).
- **Hardware Preparation**:
  1. Power ON the **Niimbot B1** thermal printer (verify battery charge >= 20% or USB-C power connected).
  2. Load a **50×50 mm die-cut thermal gap label roll** centered between the adjustable spool guides, with the leading sticker extending slightly past the tear bar so the optical gap sensor sees the label backing. Close the top cover firmly until it clicks.
  3. Connect USB-C cable (`USB\VID_3513&PID_0002&MI_00` enumerated on **`COM9`**) OR ensure Bluetooth is idle (disconnect mobile Niimbot app or close Niimbot Desktop so `COM9` / BLE is not locked).

---

## 2. Execution Steps
1. **Start the local application**:
   ```powershell
   Set-Location C:\repos\Niimbot\niimbot-b1-pdf-printer
   npm run dev
   ```
   Open the printed `http://localhost:5173` URL in Microsoft Edge or Google Chrome.

2. **Connect Hardware Transport**:
   - **USB (`COM9`, recommended)**: Keep **Filter USB VID_3513** checked, click **Connect USB (COM9)**, select `USB Serial Device (COM9)` in the browser prompt, and click **Connect**.
   - **Bluetooth (BLE)**: Click **Connect Bluetooth**, select `B1-...` in the browser picker, and click **Pair**.

3. **Verify Telemetry & Sensor Mode**:
   - Confirm top-right badge reads `READY`, **Cover & Paper** shows `Lid: Closed · Paper: Loaded`, and **RFID / Spool Roll** shows either your detected Niimbot 50×50 mm RFID tag or `Manual 50×50 mm Gap Roll (WithGaps active)`.
   - Confirm **Label Sensor Mode** is set to `Gap Sensor — Die-Cut Stickers (WithGaps = 1)` and **Thermal Density** is `3 / 5`.

4. **Align / Calibrate Optical Gap Sensor**:
   - Click **Test Gap Feed (1 Label)** to advance **1 blank sticker** (zero thermal heat) using `LabelType.WithGaps = 1` and verify the die-cut gap stops cleanly at the tear bar.
   - *(Optional — new third-party roll brands only)*: Click **Calibrate Sensor (0x8E)** to execute `SetLabelType(1)` + `LabelPositioningCalibration(1)` (note: B1 firmware feeds ~15 cm / 2–3 labels during factory optical calibration).

5. **Load 50×50 mm PDF & Print Single Sticker**:
   - Drop your 50×50 mm PDF into the dropzone, verify the `384×400 px (1-bit)` preview card, set **Copies** (`1`), and click **Print This Sticker (5×5 cm)** on the desired page card.

---

## 3. Expected Output
- **Protocol Log Drawer** records in exact sequence:
  - `B1PrintTask.printInit() [density=3, labelType=1, totalPages=1]`
  - `B1PrintTask.printPage() [384x400 px, ... copies=1]`
  - `B1PrintTask.waitForFinished() [statusPoll=100ms]`
  - `B1PrintTask.printEnd() -> true`
- **Physical Sticker Output**:
  - Printer advances strictly to the die-cut gap without creeping across stickers.
  - 1-bit `384×400 px` artwork prints crisp and centered within the 48 mm active thermal zone (1 mm unprintable left/right margins), stopping cleanly at the tear bar for effortless tear-off.
  - Controller returns immediately to `READY` state with background heartbeat resumed.

---

## 4. Rollback
### Hardware Emergency Stop & `COM9` Recovery
1. **Immediate Physical Stop**: Press the physical power/cover release on the Niimbot B1 (opening the lid immediately halts motor feed and printhead heating and raises `CoverOpen`).
2. **Release Locked `COM9` Port**:
   - Click **Disconnect** in the web UI (or close the browser tab; `beforeunload` automatically closes the WebSerial port).
   - If `COM9` remains unresponsive on Windows, unplug the USB-C cable for 3 seconds, hold the B1 power button to power-cycle the printer, and reconnect USB-C.

### Git Branch Rollback
Run inside `C:\repos\Niimbot\niimbot-b1-pdf-printer` to revert `feat/b1-hardware-transport` back to `feat/pdf-raster-engine`:
```powershell
git checkout feat/pdf-raster-engine
git branch -D feat/b1-hardware-transport
```
If pushed to `origin`, remove the remote branch with:
```powershell
git push origin --delete feat/b1-hardware-transport
```
