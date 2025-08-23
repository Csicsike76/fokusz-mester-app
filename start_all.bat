@echo off
title Fokusz Mester - Teljes Rendszer Indito (Adatbazissal)

echo.
echo ======================================================
echo Fokusz Mester - Fejlesztoi Kornyezet Indito
echo ======================================================
echo.

echo [1/4] Gyokerkonyvtar fuggosegeinek telepitese (a scriptek futtatasahoz)...
call npm install
if %errorlevel% neq 0 (
    echo [HIBA] Hiba tortent a gyoker fuggosegek telepitese soran!
    pause
    exit /b 1
)
echo [OK] Gyoker fuggosegek rendben.
echo.

:SETUP_CHOICE
choice /C IN /M "Szukseges az adatbazis teljes ujraepitese (minden adat torlodik)? [I/N]"
if errorlevel 2 goto CHECK_DEPS
if errorlevel 1 goto SETUP_DB

:SETUP_DB
echo.
echo [INFO] Adatbazis teljes torlese es ujraepitese a 'setup-db.js' alapjan...
node scripts/setup-db.js
if %errorlevel% neq 0 (
    echo [HIBA] Hiba tortent a 'setup-db.js' futtatasa soran!
    pause
    exit /b 1
)
echo [OK] Alap tablak sikeresen letrehozva.
echo.
goto CHECK_DEPS

:CHECK_DEPS
echo [2/4] Alkalmazas fuggosegeinek ellenorzese...
if not exist "backend\node_modules" (
    echo [INFO] Csomagok telepitese a backendhez...
    pushd backend
    call npm install
    popd
)
if not exist "frontend\node_modules" (
    echo [INFO] Figyelem: A 'frontend' mappa nem letezik vagy nem 'frontend' a neve. A frontend fuggosegeket kezzel kell telepiteni.
) else (
    if not exist "frontend\node_modules" (
      echo [INFO] Csomagok telepitese a frontendhez...
      pushd frontend
      call npm install
      popd
    )
)
echo [OK] Alkalmazas fuggosegek rendben.
echo.

:RUN_MIGRATIONS
echo [3/4] Adatbazis sema frissitese (migrate:up)...
call npm run migrate:up
if %errorlevel% neq 0 (
    echo [HIBA] Hiba tortent az adatbazis migralasa soran! Ellenorizd a DATABASE_URL-t.
    pause
    exit /b 1
)
echo [OK] Adatbazis sema naprakesz.
echo.

:START_SERVERS
echo [4/4] Szerverek inditasa kulon ablakokban...
echo Inditom a Backend szervert (localhost:3001)...
start "Fokusz Mester - BACKEND" cmd /k "cd backend && npm run dev"

echo Inditom a Frontend fejlesztoi szervert (localhost:3000)...
start "Fokusz Mester - FRONTEND" cmd /k "npm start"

echo.
echo [KESZ] A folyamatok elindultak.
echo Ezt az ablakot most mar bezarhatod.
echo.
pause