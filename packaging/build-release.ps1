param(
    [string]$HybridSdkPath = $env:UXP_HYBRID_SDK,
    [string]$OutputRoot = "",
    [string]$PackageVersion = "",
    [string]$ReleasePackageName = "",
    [string]$SealedDate = "",
    [string]$BundledFfmpegPath = "",
    [switch]$SkipVerify
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.IO.Compression.FileSystem

$repoRoot = Split-Path -Parent $PSScriptRoot
$uxpRoot = Join-Path $repoRoot "uxp"
$manifestPath = Join-Path $uxpRoot "manifest.json"

if (-not $OutputRoot) {
    $OutputRoot = Join-Path $repoRoot "dist"
}

function Invoke-CheckedStep {
    param(
        [string]$Name,
        [scriptblock]$Command
    )

    Write-Host "==> $Name"
    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw "$Name failed with exit code $LASTEXITCODE"
    }
}

function Get-GitText {
    param(
        [string[]]$Arguments,
        [string]$DefaultValue
    )

    try {
        $output = & git -C $repoRoot @Arguments 2>$null
        if ($LASTEXITCODE -eq 0 -and $output) {
            return (($output | Select-Object -First 1).Trim())
        }
    } catch {
    }

    return $DefaultValue
}

function Assert-ChildPath {
    param(
        [string]$ParentPath,
        [string]$ChildPath
    )

    $parentFull = [System.IO.Path]::GetFullPath($ParentPath).TrimEnd("\", "/")
    $childFull = [System.IO.Path]::GetFullPath($ChildPath)
    $prefix = $parentFull + [System.IO.Path]::DirectorySeparatorChar
    if (-not $childFull.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to operate outside output root: $childFull"
    }
}

function Assert-ValidPackageFileName {
    param(
        [string]$Name
    )

    if ([string]::IsNullOrWhiteSpace($Name)) {
        throw "Package name is empty."
    }

    if ($Name.IndexOfAny([System.IO.Path]::GetInvalidFileNameChars()) -ge 0) {
        throw "Package name contains characters that are invalid in file names: $Name"
    }
}

function ConvertTo-ReleaseRelativePath {
    param(
        [string]$RelativePath
    )

    return ($RelativePath -replace "\\", "/")
}

function Copy-ReleaseFile {
    param(
        [string]$SourceRoot,
        [string]$RelativePath,
        [string]$DestinationRoot
    )

    $sourcePath = Join-Path $SourceRoot $RelativePath
    if (-not (Test-Path -LiteralPath $sourcePath -PathType Leaf)) {
        throw "Required release file is missing: $sourcePath"
    }

    $destinationPath = Join-Path $DestinationRoot $RelativePath
    $destinationParent = Split-Path -Parent $destinationPath
    New-Item -ItemType Directory -Path $destinationParent -Force | Out-Null
    Copy-Item -LiteralPath $sourcePath -Destination $destinationPath -Force
}

function Get-ReleaseFileRecord {
    param(
        [string]$RootPath,
        [string]$RelativePath
    )

    $filePath = Join-Path $RootPath $RelativePath
    $item = Get-Item -LiteralPath $filePath
    $hash = Get-FileHash -Algorithm SHA256 -LiteralPath $filePath
    [ordered]@{
        path = ConvertTo-ReleaseRelativePath -RelativePath $RelativePath
        bytes = $item.Length
        sha256 = $hash.Hash.ToLowerInvariant()
    }
}

function Copy-BundledFfmpeg {
    param(
        [string]$SourceFfmpegPath,
        [string]$DestinationRoot
    )

    $sourceItem = Get-Item -LiteralPath $SourceFfmpegPath -ErrorAction Stop
    if ($sourceItem.PSIsContainer -or -not $sourceItem.Name.Equals("ffmpeg.exe", [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Bundled FFmpeg path must point to ffmpeg.exe: $SourceFfmpegPath"
    }

    $sourceDir = $sourceItem.Directory.FullName
    $destinationRuntimeDirRelative = "vendor\ffmpeg\win\x64"
    $destinationRuntimeDir = Join-Path $DestinationRoot $destinationRuntimeDirRelative
    New-Item -ItemType Directory -Path $destinationRuntimeDir -Force | Out-Null

    $runtimeSourceFiles = @($sourceItem)
    $runtimeSourceFiles += @(Get-ChildItem -LiteralPath $sourceDir -Filter "*.dll" -File -ErrorAction SilentlyContinue)

    $relativeFiles = @()
    foreach ($runtimeFile in ($runtimeSourceFiles | Sort-Object FullName -Unique)) {
        $relativePath = Join-Path $destinationRuntimeDirRelative $runtimeFile.Name
        Copy-Item -LiteralPath $runtimeFile.FullName -Destination (Join-Path $DestinationRoot $relativePath) -Force
        $relativeFiles += $relativePath
    }

    $licenseDirRelative = "vendor\ffmpeg\licenses"
    $licenseDir = Join-Path $DestinationRoot $licenseDirRelative
    New-Item -ItemType Directory -Path $licenseDir -Force | Out-Null

    $sourceParent = Split-Path -Parent $sourceDir
    $licenseCandidates = @(
        (Join-Path $sourceDir "LICENSE.txt"),
        (Join-Path $sourceParent "LICENSE.txt"),
        (Join-Path $sourceDir "COPYING.GPLv3"),
        (Join-Path $sourceParent "COPYING.GPLv3"),
        (Join-Path $sourceDir "COPYING.LGPLv3"),
        (Join-Path $sourceParent "COPYING.LGPLv3")
    )

    foreach ($licensePath in ($licenseCandidates | Sort-Object -Unique)) {
        if (Test-Path -LiteralPath $licensePath -PathType Leaf) {
            $relativePath = Join-Path $licenseDirRelative (Split-Path -Leaf $licensePath)
            Copy-Item -LiteralPath $licensePath -Destination (Join-Path $DestinationRoot $relativePath) -Force
            $relativeFiles += $relativePath
        }
    }

    $versionLines = @(& $sourceItem.FullName -version 2>$null)
    $versionLine = if ($versionLines.Count -gt 0) { [string]$versionLines[0] } else { "FFmpeg version unavailable" }
    $configurationLine = ($versionLines | Where-Object { $_ -like "configuration:*" } | Select-Object -First 1)
    $sourceHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $sourceItem.FullName).Hash.ToLowerInvariant()
    $noticeRelativePath = "vendor\ffmpeg\THIRD_PARTY_NOTICES.md"
    $noticePath = Join-Path $DestinationRoot $noticeRelativePath
    $noticeLines = @(
        "# Bundled FFmpeg Notice",
        "",
        "This package includes FFmpeg for local MP4 export.",
        "",
        "- Project: https://ffmpeg.org/",
        "- Windows builds: https://www.gyan.dev/ffmpeg/builds/ or another local maintainer-provided FFmpeg build",
        "- License: FFmpeg is available under LGPL/GPL terms depending on build configuration.",
        '- Bundled executable: `vendor/ffmpeg/win/x64/ffmpeg.exe`',
        ("- Bundled executable SHA256: " + '`' + $sourceHash + '`'),
        ("- Version: " + '`' + $versionLine + '`')
    )
    if ($configurationLine) {
        $noticeLines += ("- Configuration: " + '`' + $configurationLine + '`')
    }
    $noticeLines += @(
        "",
        "The FFmpeg binary is distributed as a separate third-party tool. OK Record invokes it as an external process for video export."
    )
    $noticeLines | Set-Content -LiteralPath $noticePath -Encoding UTF8
    $relativeFiles += $noticeRelativePath

    [ordered]@{
        runtimePath = "vendor/ffmpeg/win/x64/ffmpeg.exe"
        version = $versionLine
        sha256 = $sourceHash
        files = @($relativeFiles | Sort-Object -Unique)
    }
}

function Get-ZipEntryNames {
    param(
        [string]$ArchivePath
    )

    $archive = [System.IO.Compression.ZipFile]::OpenRead($ArchivePath)
    try {
        $entryNames = @()
        foreach ($entry in $archive.Entries) {
            $entryNames += (($entry.FullName -replace "\\", "/").TrimStart("/"))
        }
        return $entryNames
    } finally {
        $archive.Dispose()
    }
}

function Remove-ZipDirectoryEntries {
    param(
        [string]$ArchivePath
    )

    $archive = [System.IO.Compression.ZipFile]::Open($ArchivePath, [System.IO.Compression.ZipArchiveMode]::Update)
    try {
        $directoryEntries = @($archive.Entries | Where-Object { $_.FullName.EndsWith("\") -or $_.FullName.EndsWith("/") })
        foreach ($entry in $directoryEntries) {
            $entry.Delete()
        }
    } finally {
        $archive.Dispose()
    }
}

function Test-ZipEntryName {
    param(
        [string[]]$EntryNames,
        [string]$ExpectedEntry
    )

    $expected = ($ExpectedEntry -replace "\\", "/").TrimStart("/")
    foreach ($entryName in $EntryNames) {
        if ($entryName.Equals($expected, [System.StringComparison]::OrdinalIgnoreCase)) {
            return $true
        }
    }
    return $false
}

function Assert-ZipContainsEntries {
    param(
        [string]$ArchivePath,
        [string[]]$ExpectedEntries
    )

    $entryNames = @(Get-ZipEntryNames -ArchivePath $ArchivePath)
    foreach ($expectedEntry in $ExpectedEntries) {
        if (-not (Test-ZipEntryName -EntryNames $entryNames -ExpectedEntry $expectedEntry)) {
            throw "Archive is missing required entry: $ArchivePath :: $expectedEntry"
        }
    }
}

function Assert-ZipDoesNotContainDirectoryEntries {
    param(
        [string]$ArchivePath
    )

    $archive = [System.IO.Compression.ZipFile]::OpenRead($ArchivePath)
    try {
        foreach ($entry in $archive.Entries) {
            if ($entry.FullName.EndsWith("\") -or $entry.FullName.EndsWith("/")) {
                throw "Archive contains directory entry: $ArchivePath :: $($entry.FullName)"
            }
        }
    } finally {
        $archive.Dispose()
    }
}

function Assert-ZipDoesNotContainPrefix {
    param(
        [string]$ArchivePath,
        [string]$Prefix
    )

    $normalizedPrefix = ($Prefix -replace "\\", "/").TrimStart("/")
    $entryNames = @(Get-ZipEntryNames -ArchivePath $ArchivePath)
    foreach ($entryName in $entryNames) {
        if ($entryName.StartsWith($normalizedPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
            throw "Archive contains unexpected entry prefix: $ArchivePath :: $normalizedPrefix"
        }
    }
}

if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
    throw "UXP manifest not found: $manifestPath"
}

$manifest = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
if (-not $PackageVersion) {
    $PackageVersion = [string]$manifest.version
}
if (-not $PackageVersion) {
    throw "Package version is empty. Set uxp/manifest.json version or pass -PackageVersion."
}

$addonName = [string]$manifest.addon.name
if (-not $addonName) {
    throw "uxp/manifest.json must define addon.name."
}

$gitCommit = Get-GitText -Arguments @("rev-parse", "HEAD") -DefaultValue "unknown"
$gitShort = Get-GitText -Arguments @("rev-parse", "--short", "HEAD") -DefaultValue "nogit"
$gitStatusShort = @()
try {
    $gitStatusShort = @(& git -C $repoRoot status --porcelain 2>$null)
} catch {
}
$gitDirty = $gitStatusShort.Count -gt 0
$verificationMode = if ($SkipVerify) { "native-build-only" } else { "local-verification" }
$localVerificationSkipped = [bool]$SkipVerify
$localVerificationPassed = -not $localVerificationSkipped
$defaultPackageName = "OK-Record-$PackageVersion-$gitShort"
$packageName = if ($ReleasePackageName) { $ReleasePackageName } else { $defaultPackageName }
Assert-ValidPackageFileName -Name $packageName
$releaseRoot = Join-Path $OutputRoot "release"
$packageDir = Join-Path $releaseRoot $packageName
$zipPath = Join-Path $OutputRoot "$packageName.zip"
$zipShaPath = "$zipPath.sha256"
$ccxPath = Join-Path $OutputRoot "$packageName.ccx"
$ccxShaPath = "$ccxPath.sha256"
$ccxTempPath = "$ccxPath.zip"

$outputFull = [System.IO.Path]::GetFullPath($OutputRoot)
$packageFull = [System.IO.Path]::GetFullPath($packageDir)
Assert-ChildPath -ParentPath $outputFull -ChildPath $packageFull

if ($SkipVerify) {
    Invoke-CheckedStep "Native Release build" {
        $buildScript = Join-Path $repoRoot "tools\build-native.ps1"
        if ($HybridSdkPath) {
            & $buildScript -HybridSdkPath $HybridSdkPath
        } else {
            & $buildScript
        }
    }
} else {
    Invoke-CheckedStep "Local verification" {
        $verifyScript = Join-Path $repoRoot "tools\verify-local.ps1"
        if ($HybridSdkPath) {
            & $verifyScript -HybridSdkPath $HybridSdkPath
        } else {
            & $verifyScript
        }
    }
}

$pluginPayload = @(
    "manifest.json",
    "main.js",
    "status-messages.js",
    "panel-dom.js",
    "panel-view.js",
    "panel-styles.js",
    "recorder-scheduler.js",
    "domain\export-profile.js",
    "domain\painting-timer.js",
    "domain\path-policy.js",
    "domain\recorder-state.js",
    "domain\settings-model.js",
    "services\native-bridge.js",
    "icons\plugin@1x.png",
    "icons\plugin@2x.png",
    "win\x64\$addonName"
)

$documentationPayload = @(
    "docs\index.html"
)
$documentationImageRoot = Join-Path $repoRoot "docs\images"
if (Test-Path -LiteralPath $documentationImageRoot -PathType Container) {
    $documentationPayload += Get-ChildItem -LiteralPath $documentationImageRoot -File |
        Where-Object { @(".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg") -contains $_.Extension.ToLowerInvariant() } |
        Sort-Object -Property Name |
        ForEach-Object { "docs\images\$($_.Name)" }
}

foreach ($relativePath in $pluginPayload) {
    $sourcePath = Join-Path $uxpRoot $relativePath
    if (-not (Test-Path -LiteralPath $sourcePath -PathType Leaf)) {
        throw "Required UXP payload file is missing: $sourcePath"
    }
}

foreach ($relativePath in $documentationPayload) {
    $sourcePath = Join-Path $repoRoot $relativePath
    if (-not (Test-Path -LiteralPath $sourcePath -PathType Leaf)) {
        throw "Required documentation payload file is missing: $sourcePath"
    }
}

$releasePayload = @($pluginPayload) + @($documentationPayload)

if (Test-Path -LiteralPath $packageDir) {
    Remove-Item -LiteralPath $packageDir -Recurse -Force
}
if (Test-Path -LiteralPath $zipPath) {
    Remove-Item -LiteralPath $zipPath -Force
}
if (Test-Path -LiteralPath $zipShaPath) {
    Remove-Item -LiteralPath $zipShaPath -Force
}
if (Test-Path -LiteralPath $ccxPath) {
    Remove-Item -LiteralPath $ccxPath -Force
}
if (Test-Path -LiteralPath $ccxShaPath) {
    Remove-Item -LiteralPath $ccxShaPath -Force
}
if (Test-Path -LiteralPath $ccxTempPath) {
    Remove-Item -LiteralPath $ccxTempPath -Force
}

New-Item -ItemType Directory -Path $packageDir -Force | Out-Null

foreach ($relativePath in $pluginPayload) {
    Copy-ReleaseFile -SourceRoot $uxpRoot -RelativePath $relativePath -DestinationRoot $packageDir
}

foreach ($relativePath in $documentationPayload) {
    Copy-ReleaseFile -SourceRoot $repoRoot -RelativePath $relativePath -DestinationRoot $packageDir
}

$releaseDocs = @(
    "INSTALL.md",
    "RELEASE_NOTES.md",
    "RUNTIME_SMOKE_CHECKLIST.md"
)

foreach ($docName in $releaseDocs) {
    Copy-ReleaseFile -SourceRoot $PSScriptRoot -RelativePath $docName -DestinationRoot $packageDir
}

$bundledFfmpegPayload = @()
$bundledFfmpegInfo = [ordered]@{
    included = $false
    platform = ""
    runtimePath = ""
    version = ""
    sha256 = ""
    files = @()
}
if ($BundledFfmpegPath) {
    $copiedFfmpeg = Copy-BundledFfmpeg -SourceFfmpegPath $BundledFfmpegPath -DestinationRoot $packageDir
    $bundledFfmpegPayload = @($copiedFfmpeg.files)
    $bundledFfmpegInfo = [ordered]@{
        included = $true
        platform = "win-x64"
        runtimePath = $copiedFfmpeg.runtimePath
        version = $copiedFfmpeg.version
        sha256 = $copiedFfmpeg.sha256
        files = @($copiedFfmpeg.files | ForEach-Object { Get-ReleaseFileRecord -RootPath $packageDir -RelativePath $_ })
    }
}

$payloadRecords = foreach ($relativePath in $releasePayload) {
    Get-ReleaseFileRecord -RootPath $packageDir -RelativePath $relativePath
}

$releaseManifest = [ordered]@{
    schema = "ok-record.release-manifest.v1"
    packageName = $packageName
    defaultPackageName = $defaultPackageName
    packageVersion = $PackageVersion
    sealedDate = $SealedDate
    pluginId = [string]$manifest.id
    pluginName = [string]$manifest.name
    uxpManifestVersion = [int]$manifest.manifestVersion
    addonName = $addonName
    gitCommit = $gitCommit
    gitDirty = $gitDirty
    verificationMode = $verificationMode
    localVerificationPassed = $localVerificationPassed
    localVerificationSkipped = $localVerificationSkipped
    packageArchiveRoot = "plugin-payload-root"
    inspectionArchiveRoot = "release-directory"
    runtimeSmokeRequired = $true
    runtimeSmokeStatus = "not-recorded-by-build"
    generatedAtUtc = (Get-Date).ToUniversalTime().ToString("o")
    pluginPayload = @($payloadRecords)
    bundledFfmpeg = $bundledFfmpegInfo
}

$releaseManifestPath = Join-Path $packageDir "release-manifest.json"
$releaseManifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $releaseManifestPath -Encoding UTF8

Compress-Archive -Path $packageDir -DestinationPath $zipPath -Force
Remove-ZipDirectoryEntries -ArchivePath $zipPath
$zipHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $zipPath).Hash.ToLowerInvariant()
"$zipHash  $(Split-Path -Leaf $zipPath)" | Set-Content -LiteralPath $zipShaPath -Encoding ASCII

Compress-Archive -Path (Join-Path $packageDir "*") -DestinationPath $ccxTempPath -Force
Remove-ZipDirectoryEntries -ArchivePath $ccxTempPath
Move-Item -LiteralPath $ccxTempPath -Destination $ccxPath -Force
$ccxHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $ccxPath).Hash.ToLowerInvariant()
"$ccxHash  $(Split-Path -Leaf $ccxPath)" | Set-Content -LiteralPath $ccxShaPath -Encoding ASCII

$archiveRootEntries = @()
$archiveRootEntries += $releasePayload
$archiveRootEntries += $releaseDocs
$archiveRootEntries += $bundledFfmpegPayload
$archiveRootEntries += "release-manifest.json"

$zipEntries = foreach ($relativePath in $archiveRootEntries) {
    "$packageName/$relativePath"
}

Assert-ZipContainsEntries -ArchivePath $ccxPath -ExpectedEntries $archiveRootEntries
Assert-ZipDoesNotContainPrefix -ArchivePath $ccxPath -Prefix "$packageName/"
Assert-ZipDoesNotContainDirectoryEntries -ArchivePath $ccxPath
Assert-ZipContainsEntries -ArchivePath $zipPath -ExpectedEntries $zipEntries
Assert-ZipDoesNotContainDirectoryEntries -ArchivePath $zipPath

Write-Host "Release directory: $packageDir"
Write-Host "Release zip: $zipPath"
Write-Host "Release zip SHA256: $zipHash"
Write-Host "Release ccx: $ccxPath"
Write-Host "Release ccx SHA256: $ccxHash"
Write-Host "Verification mode: $verificationMode"
Write-Host "Archive structure: OK"
