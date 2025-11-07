@echo off
REM Start Unity Game Builder backend + frontend server
cd /d "%~dp0"
echo Starting Unity Game Builder server...
call npm start
