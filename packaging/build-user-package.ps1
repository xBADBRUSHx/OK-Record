param(
    [string]$LiteInstallerPath = "",
    [string]$BundledInstallerPath = "",
    [string]$OutputRoot = "",
    [string]$PackageName = ""
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.IO.Compression.FileSystem

$repoRoot = Split-Path -Parent $PSScriptRoot
if (-not $OutputRoot) {
    $OutputRoot = Join-Path $repoRoot "dist"
}

function Assert-ChildPath {
    param(
        [string]$ParentPath,
        [string]$ChildPath
    )

    $parentFull = [System.IO.Path]::GetFullPath($ParentPath).TrimEnd("\", "/")
    $childFull = [System.IO.Path]::GetFullPath($ChildPath)
    if (-not ($childFull -eq $parentFull -or $childFull.StartsWith($parentFull + [System.IO.Path]::DirectorySeparatorChar))) {
        throw "Refusing to operate outside output root: $childFull"
    }
}

function Copy-UserPackageFile {
    param(
        [string]$SourcePath,
        [string]$DestinationPath
    )

    if (-not (Test-Path -LiteralPath $SourcePath -PathType Leaf)) {
        throw "Missing user-package input file: $SourcePath"
    }
    $destinationParent = Split-Path -Parent $DestinationPath
    New-Item -ItemType Directory -Path $destinationParent -Force | Out-Null
    Copy-Item -LiteralPath $SourcePath -Destination $DestinationPath -Force
}

$updateManifestPath = Join-Path $repoRoot "docs\update.json"
if (-not (Test-Path -LiteralPath $updateManifestPath -PathType Leaf)) {
    throw "Update manifest not found: $updateManifestPath"
}
$updateManifest = Get-Content -LiteralPath $updateManifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
$version = [string]$updateManifest.version
if (-not $version) {
    throw "Update manifest version is empty."
}

if (-not $LiteInstallerPath) {
    $LiteInstallerPath = Join-Path $OutputRoot "OK-Record.ccx"
}
if (-not $BundledInstallerPath) {
    $BundledInstallerPath = Join-Path $OutputRoot "OK-Record_with-ffmpeg.ccx"
}
if (-not $PackageName) {
    $PackageName = "OK-Record_v${version}_User-Package"
}

$outputFull = [System.IO.Path]::GetFullPath($OutputRoot)
$stagingRoot = Join-Path $OutputRoot "user-package"
$packageDir = Join-Path $stagingRoot $PackageName
$zipPath = Join-Path $OutputRoot "$PackageName.zip"

Assert-ChildPath -ParentPath $outputFull -ChildPath $packageDir
Assert-ChildPath -ParentPath $outputFull -ChildPath $zipPath

if (Test-Path -LiteralPath $packageDir) {
    Remove-Item -LiteralPath $packageDir -Recurse -Force
}
New-Item -ItemType Directory -Path $packageDir -Force | Out-Null

Copy-UserPackageFile -SourcePath $LiteInstallerPath -DestinationPath (Join-Path $packageDir "OK-Record.ccx")
Copy-UserPackageFile -SourcePath $BundledInstallerPath -DestinationPath (Join-Path $packageDir "OK-Record_with-ffmpeg.ccx")

$guidePath = Join-Path $packageDir "OK-Record-User-Guide.html"
$guideHtml = Get-Content -LiteralPath (Join-Path $repoRoot "docs\index.html") -Raw -Encoding UTF8
$guideHtml = $guideHtml.Replace("images/", "docs/images/")
[System.IO.File]::WriteAllText($guidePath, $guideHtml, [System.Text.UTF8Encoding]::new($false))

$sourceImagesDir = Join-Path $repoRoot "docs\images"
if (Test-Path -LiteralPath $sourceImagesDir -PathType Container) {
    $targetImagesDir = Join-Path $packageDir "docs\images"
    New-Item -ItemType Directory -Path $targetImagesDir -Force | Out-Null
    Copy-Item -Path (Join-Path $sourceImagesDir "*") -Destination $targetImagesDir -Force
}

$readmeBase64 = "T0sgUmVjb3JkIOeUqOaIt+WuieijheWMhQoK5LyY5YWI5a6J6KOF77yaCk9LLVJlY29yZF93aXRoLWZmbXBlZy5jY3gK6L+Z5Liq54mI5pys5bey57uP5YaF572uIEZGbXBlZ++8jOWuieijheWQjuWPr+S7peebtOaOpeWvvOWHuiBNUDTjgIIKCui9u+mHj+eJiO+8mgpPSy1SZWNvcmQuY2N4Cui/meS4queJiOacrOS4jeWGhee9riBGRm1wZWfjgILlj6rmnInlnKjns7vnu58gUEFUSCDlt7Lnu4/og73mib7liLAgRkZtcGVnIOaXtuaJjeW7uuiuruWuieijheOAggoK5a6J6KOF5pa55byP77yaCuWPjOWHuyAuY2N4IOaWh+S7tu+8jOW5tuS9v+eUqCBDcmVhdGl2ZSBDbG91ZCBEZXNrdG9wIOWujOaIkOWuieijheOAggrlpoLmnpzlj4zlh7vmsqHmnInlj43lupTvvIzlj6/ku6Xkvb/nlKggQWRvYmUgVW5pZmllZFBsdWdpbkluc3RhbGxlckFnZW50IOaJi+WKqOWuieijheOAggoK5L2/55So6K+05piO77yaCuaJk+W8gCBPSy1SZWNvcmQtVXNlci1HdWlkZS5odG1sIOafpeeci+WbvuaWh+ivtOaYjuOAggo="
$readme = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($readmeBase64))
[System.IO.File]::WriteAllText((Join-Path $packageDir "README.txt"), $readme, [System.Text.UTF8Encoding]::new($false))

if (Test-Path -LiteralPath $zipPath) {
    Remove-Item -LiteralPath $zipPath -Force
}
Compress-Archive -Path $packageDir -DestinationPath $zipPath -Force

$zipHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $zipPath).Hash.ToLowerInvariant()
Set-Content -LiteralPath "$zipPath.sha256" -Value "$zipHash  $(Split-Path -Leaf $zipPath)" -Encoding ASCII

Write-Host "User package created: $zipPath"
