@echo off
setlocal
cd /d "%~dp0."

rem Copying this file elsewhere makes npm walk up the directory tree and
rem install another project's dependencies. Better to stop here.
if not exist "package.json" goto :wrongfolder
findstr /c:"crypto-portfolio-manager" package.json >nul || goto :wrongfolder

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js not found. Install version 22 or newer from https://nodejs.org
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Installing dependencies for the first time...
  call npm install || goto :failed
)

if not exist "dist" (
  echo Building the interface...
  call npm run build || goto :failed
)

if not exist ".env" (
  echo.
  echo Note: no .env found. The dashboard works normally, but the
  echo assistant will be unavailable. Copy .env.example to .env and
  echo add your API key.
  echo.
)

start "" "http://localhost:4173"
node server/index.js
goto :eof

:wrongfolder
echo.
echo This file has to stay inside the project folder, next to package.json.
echo Running a stray copy from somewhere else makes npm install the wrong
echo dependencies.
echo.
echo Current folder: %CD%
echo.
echo For a desktop shortcut, create a shortcut pointing at the original
echo portfolio.bat instead of copying the file.
echo.
pause
exit /b 1

:failed
echo.
echo Failed. See the message above.
pause
exit /b 1
