@echo off
cd /d "%~dp0"
echo Stop the running Pip server with Ctrl+C before updating.
node scripts\update-pip.mjs
pause
