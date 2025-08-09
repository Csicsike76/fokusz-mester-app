@echo off
title Fókusz Mester - Backend & Frontend Indító

echo Inditom a Backend szervert (localhost:3001)...
start "Backend Server" cmd /k "cd backend && npm run dev"

echo Inditom a Frontend fejlesztői szervert (localhost:3000)...
start "Frontend Server" cmd /k "npm start"

echo A szerverek elindultak kulon ablakokban.