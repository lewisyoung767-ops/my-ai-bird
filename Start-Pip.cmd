@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Please install Node.js LTS from https://nodejs.org and reopen this file.
  pause
  exit /b 1
)
set "PIP_NEEDS_INSTALL="
for %%P in (express socket.io openai three dotenv cheerio ipaddr.js saxes) do if not exist "node_modules\%%P\package.json" set "PIP_NEEDS_INSTALL=1"
if defined PIP_NEEDS_INSTALL (
  call npm.cmd install
  if errorlevel 1 (
    echo Dependencies could not be installed. Check your internet connection and Node.js installation.
    pause
    exit /b 1
  )
)
node start.js
pause
