#Requires -RunAsAdministrator
[CmdletBinding()]
param(
  [string]$InstallDir = 'C:\Notulensi'
)

$ErrorActionPreference = 'Stop'

Write-Host '=== Notulensi Windows Server Bootstrap ===' -ForegroundColor Cyan

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw 'Node.js is not installed or not available in PATH. Install Node.js 24 LTS first.'
}

$NodeExe = (Get-Command node).Source
$RepoDir = (Resolve-Path $InstallDir -ErrorAction SilentlyContinue).Path
if (-not $RepoDir) {
  New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
  $RepoDir = (Resolve-Path $InstallDir).Path
}

Set-Location $RepoDir

if (-not (Test-Path (Join-Path $RepoDir 'package.json'))) {
  throw "Repository Notulensi belum tersedia di $RepoDir. Clone/copy repository terlebih dahulu."
}

Write-Host "Node: $NodeExe"
Write-Host "Install directory: $RepoDir"

npm.cmd install --omit=dev
node --check (Join-Path $RepoDir 'server\self-host.mjs')

# Keep the application bound to localhost. Public TLS should terminate at a reverse proxy/tunnel.
[Environment]::SetEnvironmentVariable('NOTULENSI_HOST', '127.0.0.1', 'Machine')
[Environment]::SetEnvironmentVariable('NOTULENSI_PORT', '3000', 'Machine')
[Environment]::SetEnvironmentVariable('NOTULENSI_TRUST_PROXY', '1', 'Machine')

$envFile = Join-Path $RepoDir '.env.example'
if (-not (Test-Path $envFile)) {
  Write-Warning '.env.example tidak ditemukan; environment variable production harus diatur sebagai Machine environment variable.'
}

$taskName = 'Notulensi Production'
$command = "cd /d `"$RepoDir`" && `"$NodeExe`" server\self-host.mjs"
$action = New-ScheduledTaskAction -Execute 'cmd.exe' -Argument "/c `"$command`""
$trigger = New-ScheduledTaskTrigger -AtStartup
$settings = New-ScheduledTaskSettingsSet -RestartCount 5 -RestartInterval (New-TimeSpan -Minutes 1) -StartWhenAvailable
$principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null

Write-Host 'Task Scheduler service registered:' $taskName -ForegroundColor Green
Write-Host 'Starting Notulensi...' -ForegroundColor Green
Start-ScheduledTask -TaskName $taskName
Start-Sleep -Seconds 3

try {
  $response = Invoke-WebRequest -Uri 'http://127.0.0.1:3000/health' -UseBasicParsing -TimeoutSec 5
  Write-Host "Health: HTTP $($response.StatusCode)" -ForegroundColor Green
  Write-Host $response.Content
} catch {
  Write-Warning "Local health check belum berhasil: $($_.Exception.Message)"
  Write-Host 'Cek: Get-ScheduledTask -TaskName "Notulensi Production" | Get-ScheduledTaskInfo'
}

Write-Host ''
Write-Host 'NEXT:' -ForegroundColor Yellow
Write-Host '1. Atur DATABASE_URL sebagai Machine environment variable.'
Write-Host '2. Pastikan PostgreSQL aktif dan dapat diakses oleh Node.'
Write-Host '3. Pasang reverse proxy/tunnel HTTPS pada domain publik.'
Write-Host '4. Jangan expose port PostgreSQL 5432 ke internet.'
