#Requires -Version 5.1
<#
.SYNOPSIS
  Install (or remove) dsh-port-token in a DeepSeek Harness profile.

.DESCRIPTION
  Two reversible changes, no package manager involved:
    1. <profile>\node_modules\dsh-port-token  ->  this directory (directory junction)
    2. one `- insert:` row in <profile>\cordis.patch.yml

  The profile patch layer is composed at startup only, so the badge appears after
  the next DeepSeek Harness start.

.PARAMETER Profile
  Profile name under %DSH_HOME%\profiles. Default: desktop.

.PARAMETER Remove
  Undo both changes instead of applying them.
#>
[CmdletBinding()]
param(
    [string] $Profile = 'desktop',
    [switch] $Remove
)

$ErrorActionPreference = 'Stop'

$source = $PSScriptRoot
$dshHome = if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $HOME '.dsh' }
$profileDir = Join-Path $dshHome (Join-Path 'profiles' $Profile)
$patchFile = Join-Path $profileDir 'cordis.patch.yml'
$linkPath = Join-Path $profileDir 'node_modules\dsh-port-token'

$marker = '# dsh-port-token: bottom-right port + remote-token badge'
$rowPattern = '(?m)^# dsh-port-token:.*\r?\n(?:# \(package:.*\r?\n)?- insert:\r?\n\s+- id: port-token\r?\n\s+name: "dsh-port-token"\r?\n'
$utf8 = [System.Text.UTF8Encoding]::new($false)

if (-not (Test-Path -LiteralPath $profileDir)) {
    throw "profile not found: $profileDir (open DeepSeek Harness once so it creates the profile)"
}
if (-not (Test-Path -LiteralPath $patchFile)) {
    throw "patch layer not found: $patchFile"
}

if ($Remove) {
    if (Test-Path -LiteralPath $linkPath) {
        # A junction's Delete() removes the link only; the source tree is untouched.
        (Get-Item -LiteralPath $linkPath).Delete()
        Write-Host "removed link  : $linkPath"
    } else {
        Write-Host "no link       : $linkPath"
    }
    $text = [System.IO.File]::ReadAllText($patchFile)
    $updated = [regex]::Replace($text, $rowPattern, '')
    if ($updated -ne $text) {
        [System.IO.File]::WriteAllText($patchFile, $updated, $utf8)
        Write-Host "removed row   : $patchFile"
    } else {
        Write-Host "no row        : $patchFile"
    }
    Write-Host ''
    Write-Host 'Restart DeepSeek Harness to unload the plugin.' -ForegroundColor Yellow
    exit 0
}

if (-not (Test-Path -LiteralPath (Join-Path $source 'package.json'))) {
    throw "install.ps1 must sit next to the plugin package (no package.json in $source)"
}

if (Test-Path -LiteralPath $linkPath) {
    Write-Host "link exists   : $linkPath -> $((Get-Item -LiteralPath $linkPath).Target)"
} else {
    New-Item -ItemType Junction -Path $linkPath -Target $source | Out-Null
    Write-Host "linked        : $linkPath -> $source"
}

$text = [System.IO.File]::ReadAllText($patchFile)
if ($text.Contains('dsh-port-token')) {
    Write-Host "row exists    : $patchFile"
} else {
    $append = "`n$marker`n# (package: node_modules/dsh-port-token -> $source)`n- insert:`n    - id: port-token`n      name: `"dsh-port-token`"`n"
    [System.IO.File]::AppendAllText($patchFile, $append, $utf8)
    Write-Host "row appended  : $patchFile"
}

Write-Host ''
Write-Host 'Restart DeepSeek Harness to load the badge (bottom-right corner).' -ForegroundColor Green
Write-Host 'Undo with: .\install.ps1 -Remove' -ForegroundColor DarkGray
