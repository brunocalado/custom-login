# Setting Up Custom Login with Foundry VTT 14.364+

## The Problem

Starting with **Foundry VTT 14.364**, all `.html` files served from the `Data` folder are forced to `Content-Type: text/plain`. Browsers and the Electron client display them as raw source code instead of rendering them as web pages.

Custom Login's welcome screens are `.html` files located inside the module's `assets/screens/` folder — which lives under `Data/`. Without a fix, visiting the welcome page URL shows the HTML source instead of the character-selection screen.

This was a deliberate security change by the Foundry team to close an XSS/data-exfiltration vector. The official release notes state:

> *"Rendering served client-side HTML directly was never an intended workflow, but certain unorthodox modules/systems may be potentially affected by this change."*

---

## The Fix

The `patch-foundry/` folder inside this module contains three scripts that surgically revert the HTML-blocking behavior in Foundry's `express.mjs`.

| Script | Platform |
|---|---|
| `patch-html-hosting-for-node.ps1` | Windows — Foundry Node.js version |
| `patch-html-hosting-for-windows.ps1` | Windows — Foundry installed (Electron) version |
| `patch-html-hosting-for-linux.sh` | Linux |

Everything else from Foundry's 14.364 security hardening is left intact.

---

## Security Warning

Applying this patch re-opens the same-origin XSS and world-data exfiltration vector that Foundry intentionally closed. Only proceed if:

- You trust **all** content in your `Data` folder, and
- You trust **all** users who can access your Foundry instance.

This is safest for **local** or **single-user** setups.

---

## How to Apply the Patch

The scripts resolve file paths relative to their own location, so they **must be copied into your Foundry installation folder** before running — they will not work from the module directory.

### Windows — Node.js version

**Requirements:** PowerShell 5.1+, run as Administrator.

**Foundry install folder:** the folder that contains `dist\` at its root (e.g., `C:\FoundryVTT-Node-14.364\`).

```powershell
# 1. Copy the script to your Foundry installation folder
Copy-Item "C:\path\to\Data\modules\custom-login\patch-foundry\patch-html-hosting-for-node.ps1" `
          "C:\FoundryVTT-Node-14.364\"

# 2. Open PowerShell as Administrator and run it
cd "C:\FoundryVTT-Node-14.364"
powershell -ExecutionPolicy Bypass -File patch-html-hosting-for-node.ps1
```

### Windows — Installed (Electron) version

**Requirements:** PowerShell 5.1+.

**Foundry install folder:** the folder that contains `resources\` (e.g., `C:\Users\YourName\AppData\Local\Programs\Foundry Virtual Tabletop\`).

```powershell
# 1. Copy the script to your Foundry installation folder
Copy-Item "C:\path\to\Data\modules\custom-login\patch-foundry\patch-html-hosting-for-windows.ps1" `
          "C:\Users\YourName\AppData\Local\Programs\Foundry Virtual Tabletop\"

# 2. Open PowerShell and run it
cd "C:\Users\YourName\AppData\Local\Programs\Foundry Virtual Tabletop"
powershell -ExecutionPolicy Bypass -File patch-html-hosting-for-windows.ps1
```

### Linux

**Requirements:** `python3` (available by default on Ubuntu and most distros).

**Foundry install folder:** the folder containing the `foundryvtt` binary and the `resources/` directory.

```bash
# 1. Copy the script to your Foundry installation folder
cp /path/to/Data/modules/custom-login/patch-foundry/patch-html-hosting-for-linux.sh \
   /opt/foundry/

# 2. Run it
cd /opt/foundry
bash patch-html-hosting-for-linux.sh
```

---

## What the Scripts Do

All scripts follow the same flow:

0. **Check whether the patch is already applied.** If it is, the script informs you immediately (before the security warning) and offers two options:
   - **cancel** — exit without making any changes (default; press Enter or type anything other than `restore`)
   - **restore** — copy the `.bak` backup over `express.mjs` and exit
   If no backup file exists, the script warns you that automatic restoration is not possible.
1. Display the official Foundry security warning and explain the risk.
2. Ask for confirmation — you must type `yes` to proceed.
3. Read your Foundry version from `package.json`:
   - Abort if the version is below 14.364 (incompatible).
   - Warn and ask for a second confirmation if the version is above 14.364 (the patch strings may have changed).
4. Create a backup of the original file (`.bak` extension).
5. Apply the patch(es) to `express.mjs`:
   - **Node and Linux:** remove the `setHeaders:Express.#n` callback from the `Data` static middleware.
   - **Windows installed (Electron):** applies two patches — removes the `setHeaders` callback AND neutralises the `#n` method body. Both are required due to how the Electron build loads the module.
6. Verify the result. If verification fails, the backup is automatically restored and no permanent change is made.

After a successful patch, restart Foundry VTT for the change to take effect.

---

## After Each Foundry Update

This patch modifies a Foundry core file. **Every Foundry update overwrites it.** After updating Foundry, re-run the appropriate script to re-apply the patch.

---

## Manual Patch Reference

If you prefer to edit the file directly:

| Version | File to edit |
|---|---|
| Windows Node | `dist\server\express.mjs` (in the Foundry Node installation root) |
| Windows installed | `resources\app\dist\server\express.mjs` |
| Linux | `resources/app/dist/server/express.mjs` |

The file is minified to a single line — use find-and-replace with the exact strings below.

**Patch 1 — all versions:**

| | String |
|---|---|
| **Find** | `express.static(this.paths.data,{redirect:!1,setHeaders:Express.#n})` |
| **Replace with** | `express.static(this.paths.data,{redirect:!1})` |

**Patch 2 — Windows installed (Electron) only:**

Find:
```
static#n(e,s){const t=mime.lookup(s.replace(/[\s.]+$/,""));"text/html"!==t&&"application/xhtml+xml"!==t||(logger.debug(`Serving ${s} with a Content-Type of "text/plain"`),e.contentType("text/plain"))}
```

Replace with:
```
static#n(e,s){}
```
