@echo off
title PGI - Plataforma de Gestion de Incidencias

set "ROOT=%~dp0"
set "BACKEND=%ROOT%backend"
set "FRONTEND=%ROOT%frontend"

echo.
echo =====================================================
echo   PGI - Plataforma de Gestion de Incidencias
echo =====================================================
echo.

if not exist "%BACKEND%\.env" (
    echo [INFO] No se encontro .env en backend. Copiando desde .env.example...
    copy "%BACKEND%\.env.example" "%BACKEND%\.env" >nul
    echo [OK]   .env creado. Se recomienda ejecutar setup.bat primero.
    echo.
)

echo [1/2] Iniciando Backend  (http://localhost:3001) ...
start "PGI - Backend" cmd /k "cd /d "%BACKEND%" && npm run start:dev"

timeout /t 3 /nobreak >nul

echo [2/2] Iniciando Frontend (http://localhost:3000) ...
start "PGI - Frontend" cmd /k "cd /d "%FRONTEND%" && npm run dev"

echo.
echo   Servicios iniciados en ventanas separadas.
echo.
echo   Backend  -^>  http://localhost:3001
echo   Frontend -^>  http://localhost:3000
echo.
echo   Credenciales:
echo     admin@pgi.local    /  FZD1205Mayo1987   (Admin)
echo     agent@pgi.local    /  ChangeMe123!      (Agente)
echo     reporter@pgi.local /  ChangeMe123!      (Reporter)
echo.
pause
