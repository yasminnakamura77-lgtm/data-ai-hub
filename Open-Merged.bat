@echo off
setlocal
title Merged 2.0

cd /d "%~dp0"
set "PROJECT_DIR=%CD%"
rem The project is inside AI & Data Hub\merged-2.0\merged-2.0.
rem The shared checkout is expected at Pilgrims\pilgrims-core-components.
set "SHARED_DIR=%PROJECT_DIR%\..\..\..\pilgrims-core-components"

if not exist "%PROJECT_DIR%\package.json" (
    echo ERRO: Arquivo fora da pasta raiz do projeto.
    echo Pasta atual: "%PROJECT_DIR%"
    pause
    exit /b 1
)

if not exist "%SHARED_DIR%\packages\config\dist\vite-preset.js" (
    echo ERRO: Nao encontrei a biblioteca pilgrims-core-components.
    echo Local esperado: "%SHARED_DIR%"
    echo O ZIP do Merged nao inclui essa biblioteca.
    echo Confira se existe a pasta Pilgrims\pilgrims-core-components
    echo e se ela contem packages\config\dist\vite-preset.js.
    pause
    exit /b 1
)

if not exist "%PROJECT_DIR%\node_modules" (
    call pnpm install
    if errorlevel 1 (
        echo ERRO: pnpm install falhou.
        pause
        exit /b 1
    )
)

if not exist "%PROJECT_DIR%\governance-api\.env" (
    if exist "%PROJECT_DIR%\governance-api\.env.example" (
        copy "%PROJECT_DIR%\governance-api\.env.example" "%PROJECT_DIR%\governance-api\.env" >nul
    )
)

start "Merged Hub API - 8099" /D "%PROJECT_DIR%" cmd /k "python dev-api\serve.py"
start "Merged Governance API - 8000" /D "%PROJECT_DIR%\governance-api" cmd /k "uv run uvicorn main:app --port 8000"
call pnpm dev -- --open
pause
