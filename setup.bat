@echo off
echo Checking for Node.js and npm...

where npm >nul 2>nul
if errorlevel 1 (
    echo npm is not installed or not in PATH.
    pause
    exit /b
)

where node >nul 2>nul
if errorlevel 1 (
    echo Node.js is not installed or not in PATH.
    pause
    exit /b
)

echo Installing dependencies...
CALL  npm install figlet@1.5.2 inquirer@8.2.6 cli-progress@3.12.0 axios-browseragent@1.0.6 chalk@5.3.0 telegram input

REM Optional: Check if npm install was successful
if errorlevel 1 (
    echo Failed to install dependencies.
    pause
    exit /b
)

echo.
echo Changing directory to script location: %~dp0
cd /d "%~dp0"

echo Starting Node.js application...
node index.js

echo Node.js application has finished or was closed.
pause
