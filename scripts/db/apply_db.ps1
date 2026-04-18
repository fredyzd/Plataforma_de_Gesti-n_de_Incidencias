param(
    [string]$PgSuperUser = "postgres",
    [string]$PgSuperPassword,
    [string]$PgHost = "localhost",
    [int]$Port = 5432
)

$psql = "C:\Program Files\PostgreSQL\16\bin\psql.exe"
$createdb = "C:\Program Files\PostgreSQL\16\bin\createdb.exe"
if (-not (Test-Path $psql)) { throw "No se encontro psql en: $psql" }
if (-not (Test-Path $createdb)) { throw "No se encontro createdb en: $createdb" }

if (-not $PgSuperPassword) {
    $secure = Read-Host "Contrasena de $PgSuperUser" -AsSecureString
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try { $PgSuperPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

$env:PGPASSWORD = $PgSuperPassword

& $psql -v ON_ERROR_STOP=1 -h $PgHost -p $Port -U $PgSuperUser -d postgres -f "$PSScriptRoot\01_bootstrap.sql"
if ($LASTEXITCODE -ne 0) { throw "Fallo al ejecutar 01_bootstrap.sql" }

$dbExists = & $psql -tA -h $PgHost -p $Port -U $PgSuperUser -d postgres -c "SELECT EXISTS (SELECT 1 FROM pg_database WHERE datname='pgi_db');"
if (($dbExists | Out-String).Trim() -ne 't') {
    & $createdb -h $PgHost -p $Port -U $PgSuperUser -O pgi pgi_db
    if ($LASTEXITCODE -ne 0) { throw "Fallo al crear pgi_db" }
}

& $psql -v ON_ERROR_STOP=1 -h $PgHost -p $Port -U $PgSuperUser -d postgres -c "GRANT ALL PRIVILEGES ON DATABASE pgi_db TO pgi;"
if ($LASTEXITCODE -ne 0) { throw "Fallo al otorgar permisos sobre pgi_db" }

$baseSchemaReady = & $psql -tA -h $PgHost -p $Port -U $PgSuperUser -d pgi_db -c "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='users');"
if (($baseSchemaReady | Out-String).Trim() -ne 't') {
    & $psql -v ON_ERROR_STOP=1 -h $PgHost -p $Port -U $PgSuperUser -d pgi_db -f "$PSScriptRoot\02_schema.sql"
    if ($LASTEXITCODE -ne 0) { throw "Fallo al ejecutar 02_schema.sql" }
}

if (Test-Path "$PSScriptRoot\03_auth_and_permissions.sql") {
    & $psql -v ON_ERROR_STOP=1 -h $PgHost -p $Port -U $PgSuperUser -d pgi_db -f "$PSScriptRoot\03_auth_and_permissions.sql"
    if ($LASTEXITCODE -ne 0) { throw "Fallo al ejecutar 03_auth_and_permissions.sql" }
}

$env:PGPASSWORD = 'CristoVive1205'
& $psql -h $PgHost -p $Port -U pgi -d pgi_db -c "SELECT current_user, current_database();" -c "SELECT COUNT(*) AS tablas_publicas FROM pg_tables WHERE schemaname='public';"
if ($LASTEXITCODE -ne 0) { throw "Fallo verificacion final" }
