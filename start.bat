@echo off
title API Pulse - Load & Rate Limit Tester
cd /d "%~dp0"
echo ========================================================
echo Starting API Pulse Stress Tester & Rate Limit Inspector...
echo ========================================================
echo.
start http://localhost:3000
node server.js
pause
