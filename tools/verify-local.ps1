param(
    [string]$HybridSdkPath = $env:UXP_HYBRID_SDK
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot

function Invoke-Step {
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

Push-Location $repoRoot
try {
    Invoke-Step "JS syntax: UXP main" {
        node --check "uxp\main.js"
    }

    Invoke-Step "JS syntax: panel styles" {
        node --check "uxp\panel-styles.js"
    }

    Invoke-Step "JS syntax: panel DOM" {
        node --check "uxp\panel-dom.js"
    }

    Invoke-Step "JS syntax: panel view" {
        node --check "uxp\panel-view.js"
    }

    Invoke-Step "JS syntax: status messages" {
        node --check "uxp\status-messages.js"
    }

    Invoke-Step "JS syntax: native bridge" {
        node --check "uxp\services\native-bridge.js"
    }

    Invoke-Step "UXP panel smoke" {
        node "tests\uxp-panel-smoke.test.js"
    }

    Invoke-Step "UXP panel styles" {
        node "tests\panel-styles.test.js"
    }

    Invoke-Step "UXP panel DOM" {
        node "tests\panel-dom.test.js"
    }

    Invoke-Step "UXP panel view" {
        node "tests\panel-view.test.js"
    }

    Invoke-Step "UXP native bridge" {
        node "tests\native-bridge.test.js"
    }

    Invoke-Step "Shared contract" {
        node "tests\recorder-contract.test.js"
    }

    Invoke-Step "UXP status messages" {
        node "tests\status-messages.test.js"
    }

    Invoke-Step "Scheduler" {
        node "tests\recorder-scheduler.test.js"
    }

    Invoke-Step "Domain: export profile" {
        node "tests\export-profile.test.js"
    }

    Invoke-Step "Domain: path policy" {
        node "tests\path-policy.test.js"
    }

    Invoke-Step "Domain: recorder state" {
        node "tests\recorder-domain.test.js"
    }

    Invoke-Step "Domain: painting timer" {
        node "tests\painting-timer.test.js"
    }

    Invoke-Step "Domain: settings model" {
        node "tests\settings-model.test.js"
    }

    Invoke-Step "Native recovery scan" {
        & ".\tools\test-native-recovery-scan.ps1"
    }

    Invoke-Step "Native export progress" {
        & ".\tools\test-native-export-progress.ps1"
    }

    Invoke-Step "Native export runner" {
        & ".\tools\test-native-export-runner.ps1"
    }

    Invoke-Step "Native Release build" {
        if ($HybridSdkPath) {
            & ".\tools\build-native.ps1" -HybridSdkPath $HybridSdkPath
        } else {
            & ".\tools\build-native.ps1"
        }
    }

    Invoke-Step "Open-source audit" {
        & ".\tools\open-source-audit.ps1"
    }

    Invoke-Step "Whitespace diff check" {
        git diff --check
    }
} finally {
    Pop-Location
}
