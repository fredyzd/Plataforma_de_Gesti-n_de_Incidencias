@echo off
title PGI - Plataforma de Gestion de Incidencias

set "ROOT=%~dp0"

powershell -ExecutionPolicy Bypass -File "%ROOT%scripts\start_all.ps1"

if errorlevel 1 (
  echo.
  echo [ERROR] No se pudo completar el arranque unificado.
  pause
)
