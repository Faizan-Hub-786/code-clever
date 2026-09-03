@echo off
title Code Clever - Frontend Client
color 0b

echo ====================================================
echo         CODE CLEVER - FRONTEND DEV CLIENT
echo ====================================================
echo.
echo Starting Vite on http://localhost:5173...
echo.

npm run dev

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Frontend dev server stopped unexpectedly.
    pause
)
