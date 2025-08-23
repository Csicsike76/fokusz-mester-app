@echo off
title Fokusz Mester - Teljes Rendszer Indito

echo.
echo ======================================================
echo Fokusz Mester - Fejlesztoi Kornyezet Indito
echo ======================================================
echo.

echo [1/2] Fuggosegek ellenorzese...
if not exist "backend\node_modules" (
    echo [INFO] Csomagok telepitese a backendhez...
    pushd backend
    call npm install
    popd
)
if not exist "node_modules" (
    echo [INFO] Csomagok telepitese a frontendhez...
    call npm install
)
echo [OK] Fuggosegek rendben.
echo.

echo [2/2] Szerverek inditasa kulon ablakokban...
echo Inditom a Backend szervert (localhost:3001)...
start "Fokusz Mester - BACKEND" cmd /k "cd backend && npm run dev"

echo Inditom a Frontend fejlesztoi szervert (localhost:3000)...
start "Fokusz Mester - FRONTEND" cmd /k "npm start"

echo.
echo [KESZ] A folyamatok elindultak.
echo Ezt az ablakot most mar bezarhatod.
echo.
pause