param(
  [switch]$StopExisting
)

$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$Runtime = Join-Path $Root ".runtime"
New-Item -ItemType Directory -Force -Path $Runtime | Out-Null

$RequiredPaths = @(
  (Join-Path $Root "apps\frontend\node_modules\next"),
  (Join-Path $Root "services\backend-nest\dist\main.js")
)

$Missing = $RequiredPaths | Where-Object { -not (Test-Path $_) }
if ($Missing.Count -gt 0) {
  Write-Output "Local stack is not built yet. Run this first:"
  Write-Output "npm run setup:local"
  Write-Output ""
  Write-Output "Missing:"
  $Missing | ForEach-Object { Write-Output " - $_" }
  exit 1
}

$Ports = @(3000, 4000)

if ($StopExisting) {
  foreach ($Port in $Ports) {
    Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | ForEach-Object {
      $Process = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue
      if ($Process -and $Process.ProcessName -match "node|npm|powershell") {
        Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
      }
    }
  }
  Start-Sleep -Seconds 1
}

$Services = @(
  @{
    Name = "next"
    WorkingDirectory = Join-Path $Root "apps\frontend"
    Arguments = @("..\..\scripts\next-dev-inproc.cjs")
  },
  @{
    Name = "backend-nest"
    WorkingDirectory = Join-Path $Root "services\backend-nest"
    Arguments = @("dist/main.js")
  }
)

$Node = (Get-Command node.exe -ErrorAction Stop).Source

foreach ($Service in $Services) {
  $OutLog = Join-Path $Runtime "$($Service.Name).out.log"
  $ErrLog = Join-Path $Runtime "$($Service.Name).err.log"
  Set-Content -Path $OutLog -Value ""
  Set-Content -Path $ErrLog -Value ""

  $Process = Start-Process -FilePath $Node `
    -ArgumentList $Service.Arguments `
    -WorkingDirectory $Service.WorkingDirectory `
    -RedirectStandardOutput $OutLog `
    -RedirectStandardError $ErrLog `
    -WindowStyle Hidden `
    -PassThru

  Set-Content -Path (Join-Path $Runtime "$($Service.Name).pid") -Value $Process.Id
  Write-Output "$($Service.Name) pid=$($Process.Id)"
}

Start-Sleep -Seconds 8

foreach ($Port in $Ports) {
  $Listeners = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  if ($Listeners) {
    foreach ($Listener in $Listeners) {
      Write-Output "port $Port listening pid=$($Listener.OwningProcess)"
    }
  } else {
    Write-Output "port $Port not listening"
  }
}
