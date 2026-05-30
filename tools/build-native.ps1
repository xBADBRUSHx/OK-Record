param(
    [string]$HybridSdkPath = $env:UXP_HYBRID_SDK,
    [string]$Configuration = "Release",
    [string]$Platform = "x64"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$projectPath = Join-Path $repoRoot "native\win\OK-Record-Addon.vcxproj"

function Resolve-HybridSdkPath {
    param([string]$RequestedPath)

    $candidates = @(
        $RequestedPath,
        "C:\SoftwareTools\Adobe\uxp-hybrid-plugin-sdk-main",
        "C:\SoftwareTools\Adobe\uxp-hybrid-plugin-sdk",
        "C:\SoftwareTools\Adobe\UXP Hybrid Plugin SDK"
    )

    foreach ($candidate in $candidates) {
        if (-not $candidate) {
            continue
        }

        $sharedHeader = Join-Path $candidate "src\api\UxpAddonShared.h"
        if (Test-Path -LiteralPath $sharedHeader) {
            return (Resolve-Path -LiteralPath $candidate).Path
        }
    }

    throw "UXP Hybrid SDK not found. Pass -HybridSdkPath or set UXP_HYBRID_SDK."
}

function Resolve-MSBuild {
    $command = Get-Command msbuild.exe -ErrorAction SilentlyContinue
    if ($command) {
        return $command.Source
    }

    $vswhere = "C:\Program Files (x86)\Microsoft Visual Studio\Installer\vswhere.exe"
    if (Test-Path -LiteralPath $vswhere) {
        $installPath = & $vswhere -latest -products * -requires Microsoft.Component.MSBuild -property installationPath
        if ($installPath) {
            $msbuild = Join-Path $installPath "MSBuild\Current\Bin\MSBuild.exe"
            if (Test-Path -LiteralPath $msbuild) {
                return $msbuild
            }
        }
    }

    throw "MSBuild was not found. Install Visual Studio Build Tools with C++ workload."
}

$resolvedHybridSdkPath = Resolve-HybridSdkPath -RequestedPath $HybridSdkPath
$msbuild = Resolve-MSBuild

& $msbuild $projectPath `
    "/p:Configuration=$Configuration" `
    "/p:Platform=$Platform" `
    "/p:UxpHybridSdkDir=$resolvedHybridSdkPath" `
    /m

exit $LASTEXITCODE
