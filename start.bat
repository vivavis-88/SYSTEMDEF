@echo off
title AMAYA Booth Server
cd /d "%~dp0"
echo ============================================
echo  AMAYA Booth - starting (no internet needed)
echo ============================================
echo.
echo Other phones/laptops must join THIS laptop's hotspot or the same router,
echo then open one of these addresses in their browser (port 8000):
ipconfig | findstr /i "IPv4"
echo.
echo On this laptop open: http://localhost:8000
echo Keep this window open while selling. Close it to stop.
echo.
set PHPEXE=php
where php >nul 2>nul
if errorlevel 1 (
  if exist "C:\xampp\php\php.exe" (
    set PHPEXE=C:\xampp\php\php.exe
  ) else (
    echo PHP was not found. Install XAMPP or put php.exe in this folder, then run again.
    pause
    exit /b
  )
)
start "" http://localhost:8000
%PHPEXE% -S 0.0.0.0:8000 -t .
pause
