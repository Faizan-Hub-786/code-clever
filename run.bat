@echo off
title Code Clever - Full Stack Runner
color 0b

echo ====================================================
echo           CODE CLEVER FULL-STACK RUNNER
echo ====================================================
echo.
echo Starting Backend API (Port 4000) and Frontend (Port 5173)...
echo.
echo Application URLs:
echo   - Web Application: http://localhost:5173
echo   - Admin Panel:     http://localhost:5173/admin
echo   - Backend API:     http://localhost:4000
echo.
echo Press CTRL+C at any time to terminate all services.
echo ====================================================
echo.

node start-all.js

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] An error occurred while running Code Clever.
    pause
)
