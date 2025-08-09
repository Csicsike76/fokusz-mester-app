@echo off
chcp 65001 >nul
title Fókusz Mester - Teljes Rendszer Indító

echo.
echo ======================================================
echo Fókusz Mester - Fejlesztői Környezet Indító
echo ======================================================
echo.

:CHECK_DEPS
echo [1/3] Függőségek ellenőrzése...
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

:RUN_MIGRATIONS
echo [2/3] Adatbázis séma frissítése (migrate:up)...
call npm run migrate:up
if %errorlevel% neq 0 (
    echo [HIBA] Hiba történt az adatbázis migrálása során! Ellenőrizd a DATABASE_URL-t.
    pause
    exit /b 1
)
echo [OK] Adatbázis séma naprakész.
echo.

:START_SERVERS
echo [3/3] Szerverek indítása külön ablakokban...
echo Indítom a Backend szervert (localhost:3001)...
start "Fókusz Mester - BACKEND" cmd /k "cd backend && npm run dev"

echo Indítom a Frontend fejlesztői szervert (localhost:3000)...
start "Fókusz Mester - FRONTEND" cmd /k "npm start"

echo.
echo [KESZ] A folyamatok elindultak.
echo Ezt az ablakot most már bezárhatod.
echo.
pause