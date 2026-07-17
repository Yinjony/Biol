@echo off
cd /d "%~dp0"
echo Starting Biol question API...
echo API URL: http://127.0.0.1:3000
echo.
npm.cmd run server
pause
