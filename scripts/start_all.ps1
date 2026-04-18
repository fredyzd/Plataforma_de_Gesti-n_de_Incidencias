param(
  [string]$PgSuperUser = 'postgres',
  [string]$PgSuperPassword = 'Admin1205',
  [switch]$SkipDb,
  [switch]$NoOpenBrowser
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $root 'backend'
$frontend = Join-Path $root 'frontend'
$dbApply = Join-Path $root 'scripts\db\apply_db.ps1'

Write-Host ''
Write-Host '====================================================='
Write-Host '  PGI - Arranque Unificado'
Write-Host '====================================================='
Write-Host ''

if (-not (Test-Path (Join-Path $backend '.env'))) {
  Copy-Item (Join-Path $backend '.env.example') (Join-Path $backend '.env')
  Write-Host '[OK] backend/.env creado desde .env.example'
}

$envPath = Join-Path $backend '.env'
$envLines = Get-Content $envPath
$wantedDb = 'DATABASE_URL=postgresql://pgi:CristoVive1205@localhost:5432/pgi_db'
if ($envLines -notmatch '^DATABASE_URL=') {
  Add-Content -Path $envPath -Value "`n$wantedDb"
} else {
  ($envLines -replace '^DATABASE_URL=.*$', $wantedDb) | Set-Content -Path $envPath -Encoding UTF8
}

if (-not $SkipDb) {
  if (-not (Test-Path $dbApply)) {
    throw "No se encontro el script de base de datos: $dbApply"
  }

  $svc = Get-Service -Name 'postgresql-x64-16' -ErrorAction SilentlyContinue
  if ($null -ne $svc -and $svc.Status -ne 'Running') {
    Start-Service -Name 'postgresql-x64-16'
    Start-Sleep -Seconds 2
  }

  Write-Host '[1/3] Preparando base de datos...'
  & powershell -ExecutionPolicy Bypass -File $dbApply -PgSuperUser $PgSuperUser -PgSuperPassword $PgSuperPassword
  if ($LASTEXITCODE -ne 0) {
    throw 'Fallo la preparacion de base de datos.'
  }
}

$backendCmd = "cd /d `"$backend`" && npm run start:dev"
$frontendCmd = "cd /d `"$frontend`" && npm run dev"

Write-Host '[2/3] Iniciando Backend (http://localhost:3001)...'
Start-Process -FilePath 'cmd.exe' -ArgumentList @('/k', $backendCmd)
Start-Sleep -Seconds 3

Write-Host '[3/3] Iniciando Frontend (http://localhost:3000)...'
Start-Process -FilePath 'cmd.exe' -ArgumentList @('/k', $frontendCmd)

if (-not $NoOpenBrowser) {
  Start-Sleep -Seconds 2
  Start-Process 'http://localhost:3000'
}

Write-Host ''
Write-Host 'Servicios iniciados:'
Write-Host '  Backend : http://localhost:3001'
Write-Host '  Frontend: http://localhost:3000'
Write-Host ''
Write-Host 'Credenciales:'
Write-Host '  admin@pgi.local    /  FZD1205Mayo1987'
Write-Host '  agent@pgi.local    /  ChangeMe123!'
Write-Host '  reporter@pgi.local /  ChangeMe123!'
Write-Host ''
