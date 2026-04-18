# Accesos y Credenciales - PGI

## Entorno
- Proyecto: `Plataforma_de_Gestion_de_Incidencias`
- Fecha de actualizacion: `2026-04-16`
- Modo actual: `local / qas`

## URLs y Puertos
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:3001`
- PostgreSQL: `localhost:5432`

## Usuarios de la aplicacion
- Admin
  - Email: `admin@pgi.local`
  - Password: `FZD1205Mayo1987`
  - Rol: `admin`
- Agente
  - Email: `agent@pgi.local`
  - Password: `ChangeMe123!`
  - Rol: `agent`
- Reporter
  - Email: `reporter@pgi.local`
  - Password: `ChangeMe123!`
  - Rol: `reporter`

## Base de datos PostgreSQL
- Base de datos aplicacion: `pgi_db`
- Usuario aplicacion: `pgi`
- Password aplicacion: `CristoVive1205`
- Conexion (`DATABASE_URL`):
  - `postgresql://pgi:CristoVive1205@localhost:5432/pgi_db`

### Usuario administrador de PostgreSQL (superusuario)
- Usuario: `postgres`
- Password: `Admin1205`

## Scripts de base de datos
- Bootstrap DB: `scripts/db/01_bootstrap.sql`
- Esquema base: `scripts/db/02_schema.sql`
- Auth + permisos: `scripts/db/03_auth_and_permissions.sql`
- Ejecucion automatica: `scripts/db/apply_db.ps1`

## Arranque del sistema
- Arranque unificado (recomendado):
  - `iniciar.bat`
- Script directo PowerShell:
  - `powershell -ExecutionPolicy Bypass -File scripts/start_all.ps1`

### Opciones utiles del arranque
- Omitir preparacion de BD:
  - `powershell -ExecutionPolicy Bypass -File scripts/start_all.ps1 -SkipDb`
- No abrir navegador automaticamente:
  - `powershell -ExecutionPolicy Bypass -File scripts/start_all.ps1 -NoOpenBrowser`

## Endpoints principales de acceso
- Login: `POST /auth/login`
- Perfil actual: `GET /auth/me`
- Incidencias: `GET/POST /incidents`
- Reportes: `GET /reports/summary`
- Adjuntos: `GET/POST /incidents/:incidentId/attachments`

## Nota de seguridad
- Este archivo contiene credenciales en texto plano para uso local/QAS.
- No publicarlo en repositorios publicos ni compartirlo fuera del equipo autorizado.
