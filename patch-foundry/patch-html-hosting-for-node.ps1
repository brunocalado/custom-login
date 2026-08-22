#Requires -Version 5.1
<#
.SYNOPSIS
    Re-enables HTML file hosting from the Data folder in Foundry VTT 14.364+.
    Run from the root of the Foundry installation (the folder that contains dist/).
#>

$ErrorActionPreference = "Stop"

# ─── Patch target and strings ─────────────────────────────────────────────────

$target = Join-Path $PSScriptRoot "dist\server\express.mjs"
$backup = "$target.bak"
$old    = 'express.static(this.paths.data,{redirect:!1,setHeaders:Express.#n})'
$new    = 'express.static(this.paths.data,{redirect:!1})'

# ─── Early detection: already patched? ───────────────────────────────────────

if (Test-Path $target) {
    $earlyContent = [System.IO.File]::ReadAllText($target)
    if ($earlyContent.Contains($new) -and -not $earlyContent.Contains($old)) {
        Write-Host ""
        Write-Host "INFO: The patch has already been applied to:" -ForegroundColor Yellow
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
Write-Host "=== Patch: Re-enable HTML hosting in Foundry VTT ===" -ForegroundColor Cyan
Write-Host ""

# ─── Version check ───────────────────────────────────────────────────────────

$pkgPath = Join-Path $PSScriptRoot "package.json"
if (-not (Test-Path $pkgPath)) {
    Write-Host "ERROR: package.json not found at:" -ForegroundColor Red
    Write-Host "  $pkgPath" -ForegroundColor Red
    Write-Host ""
    Write-Host "Run this script from the root of a Foundry VTT installation" `
               "(the folder that contains dist/)." -ForegroundColor Yellow
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

if ($build -gt 367) {
    Write-Host ""
    Write-Host "WARNING: You are running Foundry VTT $version, which is newer than 14.367." -ForegroundColor Yellow
    Write-Host "  This patch was verified through 14.367. The target strings may have changed." -ForegroundColor Yellow
    Write-Host "  Verify the patch strings manually in dist/server/express.mjs before continuing." -ForegroundColor Yellow
    Write-Host ""
    $confirmNewer = Read-Host "Continue anyway? (yes/no)"
    if ($confirmNewer -notmatch '^yes$') {
        Write-Host ""
        Write-Host "Aborted. No changes were made." -ForegroundColor Cyan
        exit 0
    }
    Write-Host ""
}

# ─── Apply patch ─────────────────────────────────────────────────────────────

Write-Host "Target file  : $target"

if (-not (Test-Path $target)) {
    Write-Host ""
    Write-Host "ERROR: File not found:" -ForegroundColor Red
    Write-Host "  $target" -ForegroundColor Red
    Write-Host ""
    Write-Host "Run this script from the root of the Foundry VTT installation" `
               "(the folder that contains dist/)." -ForegroundColor Yellow
    exit 1
}

$content = [System.IO.File]::ReadAllText($target)

if (-not $content.Contains($old)) {
    Write-Host ""
    Write-Host "ERROR: Expected string not found in the file." -ForegroundColor Red
    Write-Host "  This may be a different Foundry version or the file was already modified." -ForegroundColor Red
    Write-Host "  Inspect the file manually:" -ForegroundColor Yellow
    Write-Host "  $target" -ForegroundColor Yellow
    exit 1
}

Copy-Item -Path $target -Destination $backup -Force
Write-Host "Backup created: $backup"

$patched = $content.Replace($old, $new)
[System.IO.File]::WriteAllText($target, $patched, [System.Text.UTF8Encoding]::new($false))

$verify = [System.IO.File]::ReadAllText($target)
if ($verify.Contains($new) -and -not $verify.Contains($old)) {
    Write-Host ""
    Write-Host "SUCCESS! Patch applied." -ForegroundColor Green
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
