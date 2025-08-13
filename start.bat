@echo off
chcp 65001 >nul
title Fókusz Mester - Teljes Rendszer Indító

echo.
echo ======================================================
echo Fókusz Mester - Fejlesztői Környezet Indító
echo ======================================================
echo.

:CHECK_DEPS
echo [1/2] Függőségek ellenőrzése...
if not exist "backend\node_modules" (
    echo [INFO] Csomagok telepítése a backendhez...
    pushd backend
    call npm install
    popd
)
if not exist "node_modules" (
    echo [INFO] Csomagok telepítése a frontendhez...
    call npm install
)
echo [OK] Függőségek rendben.
echo.

:START_SERVERS
echo [2/2] Szerverek indítása külön ablakokban...
echo Indítom a Backend szervert (localhost:3001)...
start "Fókusz Mester - BACKEND" cmd /k "cd backend && npm run dev"

echo Indítom a Frontend fejlesztői szervert (localhost:3000)...
start "Fókusz Mester - FRONTEND" cmd /k "npm start"

echo.
echo [KESZ] A folyamatok elindultak.
echo Ezt az ablakot most már bezárhatod.
echo.
pause