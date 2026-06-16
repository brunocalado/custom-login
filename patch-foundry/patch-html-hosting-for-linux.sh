#!/usr/bin/env bash
# Re-enables HTML file hosting from the Data folder in Foundry VTT Linux 14.364+.
# Run from the root of the Foundry Linux installation (the folder that contains
# the 'foundryvtt' binary and the 'resources/' directory).

set -euo pipefail

# ─── Colors ──────────────────────────────────────────────────────────────────

RED='\033[0;31m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
GREEN='\033[0;32m'
BOLD='\033[1m'
RESET='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ─── Patch target and strings ─────────────────────────────────────────────────

TARGET="$SCRIPT_DIR/resources/app/dist/server/express.mjs"
BACKUP="${TARGET}.bak"

OLD='express.static(this.paths.data,{redirect:!1,setHeaders:Express.#n})'
NEW='express.static(this.paths.data,{redirect:!1})'

# ─── Early detection: already patched? ───────────────────────────────────────

if [[ -f "$TARGET" ]]; then
    _early="$(cat "$TARGET")"
    if echo "$_early" | grep -qF "$NEW" && ! echo "$_early" | grep -qF "$OLD"; then
        echo ""
        echo -e "${YELLOW}INFO: The patch has already been applied to:${RESET}"
        echo "  $TARGET"
        echo ""
        if [[ -f "$BACKUP" ]]; then
            echo -e "${CYAN}What would you like to do?${RESET}"
            echo "  cancel  — exit without changes (default)"
            echo "  restore — revert to the original Foundry file (uses backup)"
            echo ""
            read -r -p "(cancel/restore): " _choice
            if [[ "$_choice" == "restore" ]]; then
                cp "$BACKUP" "$TARGET"
                echo ""
                echo -e "${GREEN}Original file restored from backup.${RESET}"
                echo -e "${CYAN}Restart Foundry VTT for the change to take effect.${RESET}"
            else
                echo ""
                echo -e "${CYAN}No changes were made.${RESET}"
            fi
        else
            echo -e "${YELLOW}No backup file found (${BACKUP}).${RESET}"
            echo -e "${YELLOW}Cannot restore automatically — reinstall Foundry VTT to revert.${RESET}"
        fi
        exit 0
    fi
fi

# ─── Security warning ────────────────────────────────────────────────────────

echo ""
echo -e "${BOLD}${YELLOW}=== WHY FOUNDRY DISABLED HTML HOSTING ===${RESET}"
echo ""
echo -e "${YELLOW}From the official Foundry VTT release notes:

  \"Foundry VTT now serves HTML files with a 'text/plain' content type and
  such files can still be used in downstream processing like template
  rendering. However, as a security precaution when static HTML files are
  accessed directly by the Electron client or browsers they will no longer
  render as HTML.

  Remediation steps included closing some workarounds that allowed for
  potential XSS and unintended exfiltration of world data. We also added
  hardening against accidental misconfiguration and eliminated a potential
  way to bypass the requirement to supply the old administrator password
  before changing it. We would like to thank two researchers from Positive
  Technologies, Andrey Pesnyak and Oleg Surnin, for bringing these security
  improvements to our attention.

  Note: Rendering served client-side HTML directly was never an intended
  workflow, but certain unorthodox modules/systems may be potentially
  affected by this change.\"

RISK: Reverting this change re-opens the XSS/data-exfiltration vector
described above. Only proceed if you fully trust ALL content in your Data
folder and ALL users who have access to your Foundry instance — ideally
in a local or single-user setup.${RESET}"

echo ""
echo -e "${BOLD}${RED}=== AT YOUR OWN RISK ===${RESET}"
echo ""
echo -e "${RED}This patch modifies a Foundry VTT core file and will be overwritten${RESET}"
echo -e "${RED}on every Foundry update. You are responsible for any consequences.${RESET}"
echo ""

# ─── User confirmation ───────────────────────────────────────────────────────

read -r -p "Do you understand the security implications and wish to proceed? (yes/no): " confirm
if [[ "$confirm" != "yes" ]]; then
    echo ""
    echo -e "${CYAN}Aborted. No changes were made.${RESET}"
    exit 0
fi

echo ""
echo -e "${BOLD}${CYAN}=== Patch: Re-enable HTML hosting in Foundry VTT ===${RESET}"
echo ""

# ─── Version check ───────────────────────────────────────────────────────────

PKG_PATH="$SCRIPT_DIR/resources/app/package.json"
if [[ ! -f "$PKG_PATH" ]]; then
    echo -e "${RED}ERROR: package.json not found at:${RESET}"
    echo "  $PKG_PATH"
    echo ""
    echo -e "${YELLOW}Run this script from the root of a Foundry VTT Linux installation${RESET}"
    echo -e "${YELLOW}(the folder that contains the 'foundryvtt' binary and 'resources/').${RESET}"
    exit 1
fi

if ! command -v python3 &>/dev/null; then
    echo -e "${RED}ERROR: python3 is required to parse package.json but was not found.${RESET}"
    exit 1
fi

read -r generation build < <(python3 -c "
import json, sys
with open('$PKG_PATH') as f:
    d = json.load(f)
r = d['release']
print(r['generation'], r['build'])
")

VERSION="$generation.$build"
echo "Detected Foundry version : $VERSION"

if [[ "$generation" -ne 14 || "$build" -lt 364 ]]; then
    echo ""
    echo -e "${RED}ERROR: This patch targets Foundry VTT 14.364 or later.${RESET}"
    echo -e "${RED}  Detected version: $VERSION${RESET}"
    echo -e "${RED}  The patch is NOT compatible with this version.${RESET}"
    exit 1
fi

if [[ "$build" -gt 364 ]]; then
    echo ""
    echo -e "${YELLOW}WARNING: You are running Foundry VTT $VERSION, which is newer than 14.364.${RESET}"
    echo -e "${YELLOW}  This patch was written for 14.364. The target strings may have changed.${RESET}"
    echo -e "${YELLOW}  Verify the patch strings manually in resources/app/dist/server/express.mjs${RESET}"
    echo -e "${YELLOW}  before continuing.${RESET}"
    echo ""
    read -r -p "Continue anyway? (yes/no): " confirm_newer
    if [[ "$confirm_newer" != "yes" ]]; then
        echo ""
        echo -e "${CYAN}Aborted. No changes were made.${RESET}"
        exit 0
    fi
    echo ""
fi

# ─── Apply patch ─────────────────────────────────────────────────────────────

echo "Target file  : $TARGET"

if [[ ! -f "$TARGET" ]]; then
    echo ""
    echo -e "${RED}ERROR: File not found:${RESET}"
    echo "  $TARGET"
    echo ""
    echo -e "${YELLOW}Run this script from the root of the Foundry VTT Linux installation.${RESET}"
    exit 1
fi

CONTENT="$(cat "$TARGET")"

if ! echo "$CONTENT" | grep -qF "$OLD"; then
    echo ""
    echo -e "${RED}ERROR: Expected string not found in the file.${RESET}"
    echo -e "${RED}  This may be a different Foundry version or the file was already modified.${RESET}"
    echo -e "${YELLOW}  Inspect the file manually:${RESET}"
    echo "  $TARGET"
    exit 1
fi

cp "$TARGET" "$BACKUP"
echo "Backup created: $BACKUP"

python3 -c "
import sys
with open('$TARGET', 'r', encoding='utf-8') as f:
    content = f.read()
patched = content.replace('$OLD', '$NEW')
with open('$TARGET', 'w', encoding='utf-8', newline='') as f:
    f.write(patched)
"

VERIFY="$(cat "$TARGET")"
if echo "$VERIFY" | grep -qF "$NEW" && ! echo "$VERIFY" | grep -qF "$OLD"; then
    echo ""
    echo -e "${GREEN}SUCCESS! Patch applied.${RESET}"
    echo ""
    echo -e "${GREEN}HTML files in the Data folder will be served as text/html again.${RESET}"
    echo -e "${CYAN}Restart Foundry VTT for the change to take effect.${RESET}"
    echo ""
    echo -e "${YELLOW}Remember: re-apply this patch after every Foundry update.${RESET}"
else
    echo ""
    echo -e "${RED}ERROR: Post-patch verification failed. Restoring backup...${RESET}"
    cp "$BACKUP" "$TARGET"
    echo -e "${YELLOW}Original file restored. No permanent changes were made.${RESET}"
    exit 1
fi
