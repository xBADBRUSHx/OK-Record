$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

$candidateFiles = git ls-files --cached --others --exclude-standard
$pathPatterns = @(
    '(^|/)dist/',
    '(^|/)native/(win/x64|mac)/',
    '(^|/)vendor/ffmpeg/',
    '(^|/)延时录制_Recordings/',
    '(^|/)步骤图_Steps/',
    '(^|/)Record_[0-9]{8}_[0-9]{6}(_[0-9]{2})?/',
    '(^|/)uxp/(win|mac)/.*\.uxpaddon$',
    '(^|/)uxp-hybrid-plugin-sdk',
    '(^|/)adobe_photoshop_sdk',
    '(^|/)Photoshop SDK',
    '\.(ccx|zxp|psd|psb|psdc|mp4|mov|avi|dll|exe)$',
    '\.(ccx|zip)\.sha256$'
)

$violations = @()
foreach ($file in $candidateFiles) {
    $normalized = $file -replace '\\', '/'
    foreach ($pattern in $pathPatterns) {
        if ($normalized -match $pattern) {
            $violations += $file
            break
        }
    }
}

if ($violations.Count -gt 0) {
    Write-Error ("Open-source-blocked files are tracked or unignored:`n" + ($violations | Sort-Object -Unique | ForEach-Object { "  $_" }) -join "`n")
}

$secretPatterns = @(
    'BEGIN (RSA|DSA|EC|OPENSSH|PGP) PRIVATE KEY',
    '\bapi[_-]?key[[:space:]]*[:=][[:space:]]*[^[:space:]]+',
    '\baccess[_-]?token[[:space:]]*[:=][[:space:]]*[^[:space:]]+',
    '\bpassword[[:space:]]*[:=][[:space:]]*[^[:space:]]+'
)

foreach ($pattern in $secretPatterns) {
    $matches = git grep -n -I -i -E $pattern -- . 2>$null
    if ($LASTEXITCODE -eq 0 -and $matches) {
        Write-Error ("Potential secret pattern found:`n$matches")
    }
}

$localPathMatches = git grep -n -I -E 'C:\\Users\\|E:\\\\|/Users/[^/ ]+' -- . 2>$null
if ($LASTEXITCODE -eq 0 -and $localPathMatches) {
    $localPathMatches = $localPathMatches | Where-Object { $_ -notlike 'tools/open-source-audit.ps1:*' }
}
if ($localPathMatches) {
    Write-Host "Open-source audit warning: local absolute paths are present. Review whether they are examples/evidence only:"
    $localPathMatches | ForEach-Object { Write-Host $_ }
}

Write-Host "Open-source audit passed: no tracked or unignored release binaries, SDK folders, capture/export media, PSD/PSB files, or obvious secret assignments were found."
