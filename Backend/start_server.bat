@echo off
title Hima SDA Church - Backend Server
echo ===================================================
echo   Hima SDA Church - Message & Prayer Backend Server
echo ===================================================
echo Starting Python Backend Server on port 5000...
echo Admin dashboard will be available at: http://localhost:5000/admin
echo.
python "%~dp0server.py"
pause
