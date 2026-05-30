$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$buildDir = Join-Path $repoRoot "tests\out\native-recovery-scan"
$testSource = Join-Path $repoRoot "tests\native-recovery-scan.test.cpp"
$coreSource = Join-Path $repoRoot "native\src\storage_recovery.cpp"
$includeDir = Join-Path $repoRoot "native\src"
$exePath = Join-Path $buildDir "native-recovery-scan.test.exe"

function Resolve-VcVars {
    if (Get-Command cl.exe -ErrorAction SilentlyContinue) {
        return $null
    }

    $vswhere = "C:\Program Files (x86)\Microsoft Visual Studio\Installer\vswhere.exe"
    if (Test-Path -LiteralPath $vswhere) {
        $installPath = & $vswhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
        if ($installPath) {
            $vcvars = Join-Path $installPath "VC\Auxiliary\Build\vcvars64.bat"
            if (Test-Path -LiteralPath $vcvars) {
                return $vcvars
            }
        }
    }

    throw "MSVC cl.exe was not found. Install Visual Studio Build Tools with the C++ workload."
}

function Quote-CmdArg {
    param([string]$Value)
    $escaped = $Value.Replace('"', '\"')
    $trailingBackslashes = [regex]::Match($escaped, "\\+$").Value.Length
    if ($trailingBackslashes -gt 0) {
        $escaped += ("\" * $trailingBackslashes)
    }
    return '"' + $escaped + '"'
}

New-Item -ItemType Directory -Path $buildDir -Force | Out-Null

$compileArgs = @(
    "/nologo",
    "/std:c++17",
    "/EHsc",
    "/W3",
    "/utf-8",
    "/DUNICODE",
    "/D_UNICODE",
    "/I$includeDir",
    "/Fe$exePath",
    "/Fo$buildDir\",
    "/Fd$buildDir\native-recovery-scan.test.pdb",
    $testSource,
    $coreSource
)

$vcvars = Resolve-VcVars
if ($vcvars) {
    $quotedArgs = $compileArgs | ForEach-Object { Quote-CmdArg $_ }
    $command = "call $(Quote-CmdArg $vcvars) >nul && cl.exe $($quotedArgs -join ' ')"
    & cmd.exe /d /s /c $command
} else {
    & cl.exe @compileArgs
}

if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

& $exePath
exit $LASTEXITCODE
