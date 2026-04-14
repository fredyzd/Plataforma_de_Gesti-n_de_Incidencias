@echo off
title PGI - Configuracion inicial

set "ROOT=%~dp0"
set "ENV_FILE=%ROOT%backend\.env"
set "ENV_EXAMPLE=%ROOT%backend\.env.example"

echo.
echo =====================================================
echo   PGI - Configuracion inicial del sistema
echo =====================================================
echo.

if not exist "%ENV_EXAMPLE%" (
    echo [ERROR] No se encontro backend\.env.example
    echo         Asegurate de estar en la carpeta raiz del proyecto.
    echo.
    pause
    exit /b 1
)

if exist "%ENV_FILE%" (
    echo [AVISO] Ya existe un archivo backend\.env
    choice /c SN /n /m "  Deseas sobreescribirlo? (S=Si / N=No): "
    if errorlevel 2 (
        echo [INFO] Operacion cancelada. No se modifico el .env existente.
        echo.
        pause
        exit /b 0
    )
)

echo [INFO] Generando backend\.env ...

(
echo # ============================================================
echo # PGI -- Variables de entorno generadas por setup.bat
echo # ============================================================
echo.
echo APP_ENV=qas
echo APP_PORT=3001
echo.
echo FRONTEND_URL=http://localhost:3000
echo.
echo JWT_ACCESS_SECRET=pgi-access-secret-local-dev-2026-change-in-prod
echo JWT_REFRESH_SECRET=pgi-refresh-secret-local-dev-2026-change-in-prod
echo JWT_ACCESS_EXPIRES_SECONDS=900
echo JWT_REFRESH_EXPIRES_SECONDS=604800
echo.
echo LOGIN_MAX_ATTEMPTS=5
echo LOGIN_LOCK_MINUTES=15
echo RESET_TOKEN_TTL_MINUTES=30
echo INITIAL_PASSWORD_TOKEN_TTL_MINUTES=15
echo.
echo AUTH_DEFAULT_PASSWORD=ChangeMe123!
echo AUTH_ADMIN_PASSWORD=FZD1205Mayo1987
echo.
echo STORAGE_PATH=storage/attachments
echo MAX_FILE_SIZE_MB=10
echo.
echo # SMTP_HOST=smtp.tuservicio.com
echo # SMTP_PORT=587
echo # SMTP_SECURE=false
echo # SMTP_USER=usuario@tuservicio.com
echo # SMTP_PASS=contrasena-smtp
) > "%ENV_FILE%"

echo [OK]   backend\.env creado.
echo.

if not exist "%ROOT%backend\node_modules" (
    echo [INFO] Instalando dependencias del Backend...
    cd /d "%ROOT%backend"
    call npm install
    if errorlevel 1 (
        echo [ERROR] Fallo npm install en backend.
        pause
        exit /b 1
    )
    echo [OK]   Dependencias del Backend instaladas.
    echo.
)

if not exist "%ROOT%frontend\node_modules" (
    echo [INFO] Instalando dependencias del Frontend...
    cd /d "%ROOT%frontend"
    call npm install
    if errorlevel 1 (
        echo [ERROR] Fallo npm install en frontend.
        pause
        exit /b 1
    )
    echo [OK]   Dependencias del Frontend instaladas.
    echo.
)

echo.
echo =====================================================
echo   Configuracion completada
echo =====================================================
echo.
echo   USUARIO    EMAIL                  PASSWORD
echo   -------    -----                  --------
echo   Admin      admin@pgi.local        FZD1205Mayo1987
echo   Agente     agent@pgi.local        ChangeMe123!
echo   Reporter   reporter@pgi.local     ChangeMe123!
echo.
echo   Para iniciar el sistema ejecuta: iniciar.bat
echo.
pause
