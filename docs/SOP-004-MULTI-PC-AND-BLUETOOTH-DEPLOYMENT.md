# SOP-004: Multi-PC (x64 & ARM64) Zero-Install PWA & Bluetooth (BLE) Deployment

## 1. Prerequisites
- **Client PC**: Any Windows 10 or Windows 11 machine — **x86_64 (Intel / AMD)** or **ARM64 (Qualcomm Snapdragon)** — no custom drivers and no Node.js installation required on secondary PCs.
- **Browser**: **Microsoft Edge** or **Google Chrome** (v117+) opened over a **Secure Context** (`https://` hosted URL or `http://localhost`).
- **Transport Hardware**:
  - **Bluetooth (BLE)**: Built-in or USB Bluetooth 4.0+ LE adapter enabled in Windows Settings (`Bluetooth & devices` → **On**; do *not* pair via legacy Windows Classic Bluetooth PIN dialog—connect directly inside the web app's BLE picker).
  - **USB-C (Wired)**: Data-capable USB-C cable; Windows automatically binds built-in `usbser.sys` to `VID_3513&PID_0002` on a dynamic COM port (`COM3`, `COM4`, `COM9`, `COM12`, etc.).
- **Printer Setup**: Niimbot B1 charged and loaded with a **50×50 mm die-cut thermal gap roll** (`LabelType.WithGaps = 1`), cover closed firmly, and **disconnected from any phone app or Niimbot Desktop**.

---

## 2. Execution Steps

### Option A — Zero-Install HTTPS Web / Desktop PWA on Any Windows PC (Recommended)
1. **Enable GitHub Pages (One-Time Repo Admin Setup)**:
   - Open `https://github.com/jmiguelrj/niimbot-b1-pdf-printer/settings/pages`.
   - Under **Build and deployment → Source**, choose **GitHub Actions** (note: GitHub Free requires Public repo visibility for GitHub Pages, or upload `dist/` privately to Cloudflare Pages / Netlify Drop with zero config since `vite.config.ts` uses `base: "./"`).
2. **Launch & Install Desktop App on Any x64 / ARM64 PC**:
   - Open the `https://` app URL in **Microsoft Edge** or **Google Chrome**.
   - Click **Install Desktop App** in the top bar (or the install icon in the browser address bar) to pin **Niimbot B1** to the Windows Start Menu / Taskbar with full offline Service Worker caching (`sw.js` precaches `pdf.worker.min-*.mjs` and all UI assets).

### Option B — Local Offline / LAN Preview Bundle
On a machine with Node.js `>= 24`:
```powershell
Set-Location C:\repos\Niimbot\niimbot-b1-pdf-printer
npm ci
npm run build
npm run preview
```
Open `http://localhost:4173` in Edge or Chrome.

### Connecting & Batch Printing (Bluetooth BLE vs. USB-C)
1. **To Print Wirelessly via Bluetooth (BLE)**:
   - **Unplug any PC USB-C data cable from the Niimbot B1** (B1 prioritizes USB over BLE when plugged into a computer port; battery or wall power brick is fine).
   - Ensure the mobile Niimbot app is closed/disconnected.
   - Click **Connect Bluetooth (BLE)**, select `B1-...` in the Edge/Chrome picker, and click **Pair** (20 ms GATT packet pacing and 30 s page timeout activate automatically).
2. **To Print via USB-C on Any Windows PC**:
   - Plug B1 into any USB port, click **Connect USB-C (Any Windows PC)**, select the dynamically assigned `USB Serial Device (COMx)`, and click **Connect**.
3. **Single or Multi-Page Batch Print**:
   - Click **Test Gap Feed (1 Label)** if newly loaded to align the sticker gap with the tear bar.
   - Drop a single- or multi-page 50×50 mm PDF, optionally untick individual pages, set **Copies / Page**, and click **Print All Pages (N Stickers)** (use **Stop After Current Sticker** at any time to halt cleanly after the active sticker).

---

## 3. Expected Output
- **BLE Discovery & Connection**: Browser picker displays `B1-<serial>`, negotiates GATT service `e7810a71-73ae-499d-8c15-faa9aef0c3f2`, badge reads `Bluetooth BLE Connected: B1-...`, and **Battery / Link** displays `XX% · BLE 20ms`.
- **Dynamic USB Connection**: Browser picker displays only `VID_3513` / `VID_1A86` serial port regardless of COM port number (`COM3`, `COM9`, etc.), badge reads `USB Serial Connected`, and **Battery / Link** displays `XX% · USB 10ms`.
- **Multi-Page Batch Printing**:
  - `B1PrintTask.printInit()` runs once with `totalPages = selectedPages * copiesPerPage` and `LabelType.WithGaps = 1`.
  - Each page prints crisp `384×400 px` 1-bit output aligned to the 50×50 mm die-cut gap, advancing the final sticker cleanly to the tear bar on `B1PrintTask.printEnd() -> true`.

---

## 4. Rollback
1. **Abort Active Batch Safely**: Click **Stop After Current Sticker** in the batch toolbar (triggers `AbortController`, finishes the current sticker, and executes `printEnd()` without half-fed labels). For immediate emergency stop, press the B1 lid release button.
2. **Reset Stuck BLE GATT or USB State**: Click **Disconnect**, toggle Windows Bluetooth Off/On (or unplug USB-C), hold the B1 power button for 3 seconds to power-cycle, and reconnect.
3. **Uninstall Desktop PWA**: Open the installed Niimbot B1 window in Edge/Chrome → `⋯` menu → **App settings / Uninstall Niimbot B1**.
4. **Git Rollback** (inside `C:\repos\Niimbot\niimbot-b1-pdf-printer`):
   ```powershell
   git checkout main
   git reset --hard 90a9eb0
   ```
   *(Reverts `main` back to the pre-Task-5 `feat/b1-hardware-transport` commit `90a9eb0`; add `git push --force-with-lease origin main` only if remote rollback is explicitly desired.)*
