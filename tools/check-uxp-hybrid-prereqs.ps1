param(
    [string]$HybridSdkPath = $env:UXP_HYBRID_SDK,
    [string]$PhotoshopSdkPath = "C:\SoftwareTools\Adobe\adobe_photoshop_sdk_2026_win_v2"
)

$ErrorActionPreference = "Stop"

function Test-AnyPath {
    param([string[]]$Paths)

    foreach ($path in $Paths) {
        if ($path -and (Test-Path -LiteralPath $path)) {
            return (Resolve-Path -LiteralPath $path).Path
        }
    }
    return $null
}

function Find-Executable {
    param(
        [string]$Name,
        [string[]]$CandidatePaths
    )

    $path = Test-AnyPath -Paths $CandidatePaths
    if ($path) {
        return $path
    }

    $command = Get-Command $Name -ErrorAction SilentlyContinue
    if ($command) {
        return $command.Source
    }

    return $null
}

function Test-HybridSdk {
    param([string]$Path)

    if (-not $Path -or -not (Test-Path -LiteralPath $Path)) {
        return $false
    }

    $required = @(
        "src\api\UxpAddonShared.h",
        "src\api\UxpAddonTypes.h",
        "template\template-dev",
        "template\template-plugin"
    )

    foreach ($relative in $required) {
        if (-not (Test-Path -LiteralPath (Join-Path $Path $relative))) {
            return $false
        }
    }

    return $true
}

$photoshop2026 = Find-Executable -Name "Photoshop.exe" -CandidatePaths @(
    "C:\Software\Adobe\Adobe Photoshop 2026\Photoshop.exe",
    "C:\Program Files\Adobe\Adobe Photoshop 2026\Photoshop.exe"
)

$udt = Find-Executable -Name "Adobe UXP Developer Tools.exe" -CandidatePaths @(
    "C:\Program Files\Adobe\Adobe UXP Developer Tools\Adobe UXP Developer Tools.exe",
    "C:\Program Files\Adobe\Adobe UXP Developer Tool\UXP Developer Tool.exe",
    "C:\Program Files\Adobe\UXP Developer Tool\UXP Developer Tool.exe",
    "$env:LOCALAPPDATA\Programs\Adobe UXP Developer Tool\UXP Developer Tool.exe"
)

$hybridSdkCandidates = @(
    $HybridSdkPath,
    "C:\SoftwareTools\Adobe\uxp-hybrid-plugin-sdk-main",
    "C:\SoftwareTools\Adobe\uxp-hybrid-plugin-sdk",
    "C:\SoftwareTools\Adobe\UXP Hybrid Plugin SDK",
    "$env:USERPROFILE\Downloads\uxp-hybrid-plugin-sdk",
    "$env:USERPROFILE\Downloads\UXP Hybrid Plugin SDK"
)

$resolvedHybridSdk = $null
foreach ($candidate in $hybridSdkCandidates) {
    if (Test-HybridSdk -Path $candidate) {
        $resolvedHybridSdk = (Resolve-Path -LiteralPath $candidate).Path
        break
    }
}

$photoshopSdk = $null
if (Test-Path -LiteralPath $PhotoshopSdkPath) {
    $photoshopSdk = (Resolve-Path -LiteralPath $PhotoshopSdkPath).Path
}

$ffmpeg = Find-Executable -Name "ffmpeg.exe" -CandidatePaths @(
    "C:\ffmpeg\bin\ffmpeg.exe",
    "C:\Program Files\ffmpeg\bin\ffmpeg.exe"
)

$cl = Find-Executable -Name "cl.exe" -CandidatePaths @()

$checks = @(
    [pscustomobject]@{
        Name = "Photoshop 2026"
        Required = $true
        Found = [bool]$photoshop2026
        Path = $photoshop2026
        NextAction = if ($photoshop2026) { "" } else { "Install Photoshop 2026 or update script candidate path." }
    },
    [pscustomobject]@{
        Name = "UXP Developer Tool"
        Required = $true
        Found = [bool]$udt
        Path = $udt
        NextAction = if ($udt) { "" } else { "Install UXP Developer Tool from Creative Cloud." }
    },
    [pscustomobject]@{
        Name = "Photoshop C++ SDK 2026"
        Required = $false
        Found = [bool]$photoshopSdk
        Path = $photoshopSdk
        NextAction = if ($photoshopSdk) { "" } else { "Optional for this UXP Hybrid build path; do not block OK-Record builds on it." }
    },
    [pscustomobject]@{
        Name = "UXP Hybrid SDK"
        Required = $true
        Found = [bool]$resolvedHybridSdk
        Path = $resolvedHybridSdk
        NextAction = if ($resolvedHybridSdk) { "" } else { "Download from Adobe Developer Console, then set UXP_HYBRID_SDK or pass -HybridSdkPath." }
    },
    [pscustomobject]@{
        Name = "FFmpeg"
        Required = $false
        Found = [bool]$ffmpeg
        Path = $ffmpeg
        NextAction = if ($ffmpeg) { "" } else { "Optional for skeleton; required before export smoke tests." }
    },
    [pscustomobject]@{
        Name = "MSVC cl.exe"
        Required = $false
        Found = [bool]$cl
        Path = $cl
        NextAction = if ($cl) { "" } else { "Run from a Visual Studio Developer PowerShell before native builds." }
    }
)

$checks | Format-Table -AutoSize

$missingRequired = $checks | Where-Object { $_.Required -and -not $_.Found }
if ($missingRequired) {
    Write-Host ""
    Write-Host "Missing required prerequisites:" -ForegroundColor Yellow
    $missingRequired | ForEach-Object {
        Write-Host ("- {0}: {1}" -f $_.Name, $_.NextAction)
    }
    exit 1
}

Write-Host ""
Write-Host "All required prerequisites found." -ForegroundColor Green
