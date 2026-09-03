@echo off
title Code Clever - Backend API Server
color 0a

echo ====================================================
echo         CODE CLEVER - BACKEND API SERVER
echo ====================================================
echo.
echo Running API on http://localhost:4000...
echo.

node --max-old-space-size=384 server.js

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Backend server stopped unexpectedly.
    pause
)
