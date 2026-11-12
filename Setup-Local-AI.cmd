@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Please install Node.js LTS from https://nodejs.org first.
  pause
  exit /b 1
)
node scripts\setup-local-ai.mjs
pause
