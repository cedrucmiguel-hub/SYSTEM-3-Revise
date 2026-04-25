$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")

function Invoke-Npm {
  param(
    [Parameter(Mandatory = $true)][string]$WorkingDirectory,
    [Parameter(Mandatory = $true)][string[]]$Arguments
  )

  Write-Output "npm $($Arguments -join ' ') [$WorkingDirectory]"
  Push-Location $WorkingDirectory
  try {
    & npm @Arguments
    if ($LASTEXITCODE -ne 0) {
      throw "npm $($Arguments -join ' ') failed in $WorkingDirectory"
    }
  } finally {
    Pop-Location
  }
}

Invoke-Npm -WorkingDirectory (Join-Path $Root "apps\frontend") -Arguments @("install")
Invoke-Npm -WorkingDirectory (Join-Path $Root "services\backend-nest") -Arguments @("install")
Invoke-Npm -WorkingDirectory (Join-Path $Root "services\backend-nest") -Arguments @("run", "build")

Write-Output "Local stack setup complete. Run: npm run local"
