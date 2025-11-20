@echo off
REM Start Godot Game Builder backend + frontend server
cd /d "%~dp0"
echo Starting Godot Game Builder server...
call npm start
