@echo off
title Citryn Fight Club - local server
cd /d "%~dp0"
echo.
echo  ====================================================
echo   CITRYN FIGHT CLUB - starting local server...
echo   Your browser will open at http://localhost:8099
echo.
echo   KEEP THIS WINDOW OPEN while you play.
echo   Close it (or press Ctrl+C) to stop the game.
echo  ====================================================
echo.
start "" "http://localhost:8099"
python -m http.server 8099 2>nul || py -m http.server 8099
pause
