#Requires -Version 5.1
<#
.SYNOPSIS
    Re-enables HTML file hosting from the Data folder in Foundry VTT 14.364+.
    Place this script in the Foundry VTT installation folder (the one that
    contains resources\) and run it from there.
#>

$ErrorActionPreference = "Stop"

# ─── Patch definitions ───────────────────────────────────────────────────────
#
# Patch 1: remove the setHeaders callback from express.static so the
#          serve-static middleware no longer overrides Content-Type.
#
# Patch 2: neutralise the #n method body so it can never force text/plain
#          even if it is somehow reached through another code path.

$old1 = 'express.static(this.paths.data,{redirect:!1,setHeaders:Express.#n})'
$new1 = 'express.static(this.paths.data,{redirect:!1})'

$old2 = 'static#n(e,s){const t=mime.lookup(s.replace(/[\s.]+$/,""));"text/html"!==t&&"application/xhtml+xml"!==t||(logger.debug(`Serving ${s} with a Content-Type of "text/plain"`),e.contentType("text/plain"))}'
$new2 = 'static#n(e,s){}'

# ─── Locate target ───────────────────────────────────────────────────────────

$target = Join-Path $PSScriptRoot "resources\app\dist\server\express.mjs"
$backup = "$target.bak"

# ─── Early detection: already patched? ───────────────────────────────────────

if (Test-Path $target) {
    $earlyContent = [System.IO.File]::ReadAllText($target)
    $earlyP1Done  = $earlyContent.Contains($new1) -and -not $earlyContent.Contains($old1)
    $earlyP2Done  = $earlyContent.Contains($new2) -and -not $earlyContent.Contains($old2)

    if ($earlyP1Done -and $earlyP2Done) {
        Write-Host ""
        Write-Host "INFO: Both patches have already been applied to:" -ForegroundColor Yellow
        Write-Host "  $target"
        Write-Host ""
        if (Test-Path $backup) {
            Write-Host "What would you like to do?" -ForegroundColor Cyan
            Write-Host "  cancel  - exit without changes (default)"
            Write-Host "  restore - revert to the original Foundry file (uses backup)"
            Write-Host ""
            $choice = Read-Host "(cancel/restore)"
            if ($choice -match '^restore$') {
                Copy-Item -Path $backup -Destination $target -Force
                Write-Host ""
                Write-Host "Original file restored from backup." -ForegroundColor Green
                Write-Host "Restart Foundry VTT for the change to take effect." -ForegroundColor Cyan
            } else {
                Write-Host ""
                Write-Host "No changes were made." -ForegroundColor Cyan
            }
        } else {
            Write-Host "No backup file found ($backup)." -ForegroundColor Yellow
            Write-Host "Cannot restore automatically — reinstall Foundry VTT to revert." -ForegroundColor Yellow
        }
        exit 0
    }
}

# ─── Security warning ────────────────────────────────────────────────────────

Write-Host ""
Write-Host "=== WHY FOUNDRY DISABLED HTML HOSTING ===" -ForegroundColor Yellow
Write-Host ""
Write-Host @"
From the official Foundry VTT release notes:

  "Foundry VTT now serves HTML files with a 'text/plain' content type and
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
  affected by this change."

RISK: Reverting this change re-opens the XSS/data-exfiltration vector
described above. Only proceed if you fully trust ALL content in your Data
folder and ALL users who have access to your Foundry instance — ideally
in a local or single-user setup.
"@ -ForegroundColor DarkYellow

Write-Host ""
Write-Host "=== AT YOUR OWN RISK ===" -ForegroundColor Red
Write-Host ""
Write-Host "This patch modifies a Foundry VTT core file and will be overwritten" -ForegroundColor Red
Write-Host "on every Foundry update. You are responsible for any consequences."  -ForegroundColor Red
Write-Host ""

# ─── User confirmation ───────────────────────────────────────────────────────

$confirm = Read-Host "Do you understand the security implications and wish to proceed? (yes/no)"
if ($confirm -notmatch '^yes$') {
    Write-Host ""
    Write-Host "Aborted. No changes were made." -ForegroundColor Cyan
    exit 0
}

Write-Host ""
Write-Host "=== Patch: Re-enable HTML hosting in Foundry VTT (Windows installed) ===" -ForegroundColor Cyan
Write-Host ""

# ─── Version check ───────────────────────────────────────────────────────────

$pkgPath = Join-Path $PSScriptRoot "resources\app\package.json"
if (-not (Test-Path $pkgPath)) {
    Write-Host "ERROR: package.json not found at:" -ForegroundColor Red
    Write-Host "  $pkgPath" -ForegroundColor Red
    Write-Host ""
    Write-Host "Place this script in the root of the Foundry VTT installation" `
               "(the folder that contains resources\)." -ForegroundColor Yellow
    exit 1
}

$pkg        = Get-Content $pkgPath -Raw | ConvertFrom-Json
$generation = [int]$pkg.release.generation
$build      = [int]$pkg.release.build
$version    = "$generation.$build"

Write-Host "Detected Foundry version : $version"

if ($generation -ne 14 -or $build -lt 364) {
    Write-Host ""
    Write-Host "ERROR: This patch targets Foundry VTT 14.364 or later." -ForegroundColor Red
    Write-Host "  Detected version: $version" -ForegroundColor Red
    Write-Host "  The patch is NOT compatible with this version." -ForegroundColor Red
    exit 1
}

if ($build -gt 364) {
    Write-Host ""
    Write-Host "WARNING: You are running Foundry VTT $version, which is newer than 14.364." -ForegroundColor Yellow
    Write-Host "  This patch was written for 14.364. The target strings may have changed." -ForegroundColor Yellow
    Write-Host "  Verify the patch strings manually in resources\app\dist\server\express.mjs before continuing." -ForegroundColor Yellow
    Write-Host ""
    $confirmNewer = Read-Host "Continue anyway? (yes/no)"
    if ($confirmNewer -notmatch '^yes$') {
        Write-Host ""
        Write-Host "Aborted. No changes were made." -ForegroundColor Cyan
        exit 0
    }
    Write-Host ""
}

# ─── Validate target ─────────────────────────────────────────────────────────

Write-Host "Target file  : $target"

if (-not (Test-Path $target)) {
    Write-Host ""
    Write-Host "ERROR: File not found:" -ForegroundColor Red
    Write-Host "  $target" -ForegroundColor Red
    Write-Host ""
    Write-Host "Place this script in the root of the Foundry VTT installation" `
               "(the folder that contains resources\)." -ForegroundColor Yellow
    exit 1
}

$content = [System.IO.File]::ReadAllText($target)

# ─── Already-applied check ───────────────────────────────────────────────────

$p1Done = $content.Contains($new1) -and -not $content.Contains($old1)
$p2Done = $content.Contains($new2) -and -not $content.Contains($old2)

# ─── Sanity check ────────────────────────────────────────────────────────────

if (-not $p1Done -and -not $content.Contains($old1)) {
    Write-Host ""
    Write-Host "ERROR: Patch 1 target string not found in the file." -ForegroundColor Red
    Write-Host "  This may be a different Foundry version or the file was already modified." -ForegroundColor Red
    Write-Host "  Inspect the file manually:" -ForegroundColor Yellow
    Write-Host "  $target" -ForegroundColor Yellow
    exit 1
}

if (-not $p2Done -and -not $content.Contains($old2)) {
    Write-Host ""
    Write-Host "ERROR: Patch 2 target string not found in the file." -ForegroundColor Red
    Write-Host "  This may be a different Foundry version or the file was already modified." -ForegroundColor Red
    Write-Host "  Inspect the file manually:" -ForegroundColor Yellow
    Write-Host "  $target" -ForegroundColor Yellow
    exit 1
}

# ─── Backup (only if original not already saved) ─────────────────────────────

if (-not (Test-Path $backup)) {
    Copy-Item -Path $target -Destination $backup -Force
    Write-Host "Backup created: $backup"
} else {
    Write-Host "Backup exists : $backup (skipped)"
}

# ─── Apply patches ───────────────────────────────────────────────────────────

$patched = $content

if (-not $p1Done) {
    $patched = $patched.Replace($old1, $new1)
    Write-Host "Patch 1 applied: removed setHeaders callback from express.static"
} else {
    Write-Host "Patch 1        : already applied, skipped"
}

if (-not $p2Done) {
    $patched = $patched.Replace($old2, $new2)
    Write-Host "Patch 2 applied: neutralised #n method body"
} else {
    Write-Host "Patch 2        : already applied, skipped"
}

[System.IO.File]::WriteAllText($target, $patched, [System.Text.UTF8Encoding]::new($false))

# ─── Verify ──────────────────────────────────────────────────────────────────

$verify = [System.IO.File]::ReadAllText($target)
$v1 = $verify.Contains($new1) -and -not $verify.Contains($old1)
$v2 = $verify.Contains($new2) -and -not $verify.Contains($old2)

if ($v1 -and $v2) {
    Write-Host ""
    Write-Host "SUCCESS! Both patches applied." -ForegroundColor Green
    Write-Host ""
    Write-Host "HTML files in the Data folder will be served as text/html again." -ForegroundColor Green
    Write-Host "Restart Foundry VTT for the change to take effect."              -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Remember: re-apply this patch after every Foundry update." -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "ERROR: Post-patch verification failed. Restoring backup..." -ForegroundColor Red
    Copy-Item -Path $backup -Destination $target -Force
    Write-Host "Original file restored. No permanent changes were made." -ForegroundColor Yellow
    exit 1
}
