@echo off
chcp 65001 >nul
title Fókusz Mester - Teljes Rendszer Indító

echo.
echo ======================================================
echo Fókusz Mester - Teljes Rendszer Indító
echo ======================================================
echo.

:CHECK_DEPS
echo [1/4] Függőségek ellenőrzése...
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

:SETUP_DB
echo [2/4] Adatbázis struktúra újraépítése (setup-db)...
call npm run setup-db
if %errorlevel% neq 0 (
    echo [HIBA] Hiba történt az adatbázis újraépítése során!
    pause
    exit /b 1
)
echo [OK] Adatbázis struktúra frissítve.
echo.

:SYNC_DB
echo [3/4] Adatok szinkronizálása az adatbázisba (sync-db)...
call npm run sync-db
if %errorlevel% neq 0 (
    echo [HIBA] Hiba történt az adatok szinkronizálása során!
    pause
    exit /b 1
)
echo [OK] Adatok szinkronizálva.
echo.

:START_SERVERS
echo [4/4] Szerverek indítása külön ablakokban...
echo Indítom a Backend szervert (localhost:3001)...
start "Fókusz Mester - BACKEND" cmd /k "cd backend && npm run dev"

echo Indítom a Frontend fejlesztői szervert (localhost:3000)...
start "Fókusz Mester - FRONTEND" cmd /k "npm start"

echo.
echo [KESZ] A folyamatok elindultak.
echo Ezt az ablakot most már bezárhatod.
echo.
pause