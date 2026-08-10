@echo off
REM Double-click to run the Flat-Rate Coupon Calculator.
REM
REM This serves the page over http://localhost instead of opening the file
REM directly. Browsers refuse cross-origin requests from file:// pages no matter
REM what the server permits, and this tool reads Pro rates from the Yourgi search
REM API. A double-clicked HTML file loads fine and then fails on every search.

cd /d "%~dp0"
title Flat-Rate Coupon Calculator

REM Python ships as either "python" or the "py" launcher depending on the install.
set PYCMD=
where python >nul 2>&1 && set PYCMD=python
if not defined PYCMD where py >nul 2>&1 && set PYCMD=py -3

if not defined PYCMD (
  echo Python 3 is not installed on this machine.
  echo Get it from https://www.python.org/downloads/ then double-click this again.
  echo Tick "Add python.exe to PATH" during the install.
  echo.
  pause
  exit /b 1
)

set PORT=8777
:findport
netstat -an | findstr /c:":%PORT% " | findstr /i "LISTENING" >nul
if %errorlevel%==0 (
  set /a PORT=PORT+1
  goto findport
)

echo Flat-Rate Coupon Calculator
echo.
echo   Tool:       http://localhost:%PORT%/coupon-calculator.html
echo   Self-test:  http://localhost:%PORT%/coupon-calculator.html?selftest=1
echo.
echo Leave this window open while you work. Closing it stops the tool.
echo.

REM Give the server a moment to bind before the browser asks for the page.
start "" /min cmd /c "timeout /t 2 /nobreak >nul & start "" http://localhost:%PORT%/coupon-calculator.html"

%PYCMD% -m http.server %PORT%
