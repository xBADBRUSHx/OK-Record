param(
    [Parameter(Mandatory = $true)]
    [string]$ReleaseDir,

    [Parameter(Mandatory = $true)]
    [string]$InstalledPluginDir,

    [string]$OutputPath = ""
)

$ErrorActionPreference = "Stop"

$releaseDirFull = [System.IO.Path]::GetFullPath($ReleaseDir)
$installedDirFull = [System.IO.Path]::GetFullPath($InstalledPluginDir)
$releaseManifestPath = Join-Path $releaseDirFull "release-manifest.json"

if (-not (Test-Path -LiteralPath $releaseManifestPath -PathType Leaf)) {
    throw "Release manifest not found: $releaseManifestPath"
}

if (-not (Test-Path -LiteralPath $installedDirFull -PathType Container)) {
    throw "Installed plugin directory not found: $installedDirFull"
}

$releaseManifest = Get-Content -LiteralPath $releaseManifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
if ($releaseManifest.schema -ne "ok-record.release-manifest.v1") {
    throw "Unexpected release manifest schema: $($releaseManifest.schema)"
}

$releaseManifestSha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $releaseManifestPath).Hash.ToLowerInvariant()
$payloadEntries = @()
foreach ($file in @($releaseManifest.pluginPayload)) {
    $payloadEntries += [pscustomobject]@{
        Category = "pluginPayload"
        File = $file
    }
}
if ($releaseManifest.bundledFfmpeg -and $releaseManifest.bundledFfmpeg.included) {
    $bundledFiles = @($releaseManifest.bundledFfmpeg.files)
    if ($bundledFiles.Count -eq 0) {
        throw "Release manifest marks bundled FFmpeg as included but lists no bundled FFmpeg files."
    }
    foreach ($file in $bundledFiles) {
        $payloadEntries += [pscustomobject]@{
            Category = "bundledFfmpeg"
            File = $file
        }
    }
}

$results = @()
foreach ($entry in $payloadEntries) {
    $file = $entry.File
    $relativePath = ([string]$file.path) -replace "/", [System.IO.Path]::DirectorySeparatorChar
    $releaseFile = Join-Path $releaseDirFull $relativePath
    $installedFile = Join-Path $installedDirFull $relativePath

    if (-not (Test-Path -LiteralPath $releaseFile -PathType Leaf)) {
        throw "Release payload file is missing: $releaseFile"
    }
    if (-not (Test-Path -LiteralPath $installedFile -PathType Leaf)) {
        throw "Installed payload file is missing: $installedFile"
    }

    $releaseHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $releaseFile).Hash.ToLowerInvariant()
    $installedHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $installedFile).Hash.ToLowerInvariant()
    $matches = $releaseHash -eq $installedHash

    $results += [ordered]@{
        category = [string]$entry.Category
        path = [string]$file.path
        releaseSha256 = $releaseHash
        installedSha256 = $installedHash
        matches = $matches
    }

    if (-not $matches) {
        throw "Installed payload hash mismatch: $($file.path)"
    }
}

$summary = [ordered]@{
    schema = "ok-record.installed-payload-verification.v1"
    packageName = [string]$releaseManifest.packageName
    packageVersion = [string]$releaseManifest.packageVersion
    gitCommit = [string]$releaseManifest.gitCommit
    releaseDir = $releaseDirFull
    installedPluginDir = $installedDirFull
    releaseManifestSha256 = $releaseManifestSha256
    bundledFfmpegIncluded = [bool]($releaseManifest.bundledFfmpeg -and $releaseManifest.bundledFfmpeg.included)
    bundledFfmpegFilesVerified = @($results | Where-Object { $_.category -eq "bundledFfmpeg" }).Count
    verifiedAtUtc = (Get-Date).ToUniversalTime().ToString("o")
    files = $results
}

if ($OutputPath) {
    $outputFull = [System.IO.Path]::GetFullPath($OutputPath)
    $outputParent = Split-Path -Parent $outputFull
    if ($outputParent) {
        New-Item -ItemType Directory -Path $outputParent -Force | Out-Null
    }
    $summary | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $outputFull -Encoding UTF8
}

Write-Host "Installed payload matches release package: $($releaseManifest.packageName)"
