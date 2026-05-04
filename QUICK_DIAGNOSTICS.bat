@echo off
REM Quick Diagnostics Script for Yola AI Info Hub
REM This script checks server health and database connection

echo.
echo ======================================
echo Yola AI Info Hub - Quick Diagnostics
echo ======================================
echo.

echo 1. Checking if server is running on http://127.0.0.1:4000
echo.
curl --max-time 5 http://127.0.0.1:4000/api/health 2>nul
if %errorlevel% equ 0 (
    echo.
    echo [OK] Server is running!
    echo.
) else (
    echo [ERROR] Server not responding at http://127.0.0.1:4000
    echo.
    echo To start the server, run:
    echo   node server.js
    echo.
)

echo 2. Checking if MongoDB is available
echo.
curl --max-time 5 http://127.0.0.1:27017/ 2>nul
if %errorlevel% equ 0 (
    echo [OK] MongoDB is running!
    echo.
) else (
    echo [ERROR] MongoDB not responding at http://127.0.0.1:27017
    echo.
    echo To start MongoDB, run:
    echo   mongod
    echo.
)

echo 3. Testing frontend access
echo.
curl --max-time 5 http://127.0.0.1:5502/pages/signin.html 2>nul
if %errorlevel% equ 0 (
    echo [OK] Frontend is accessible at http://127.0.0.1:5502
    echo.
) else (
    echo [ERROR] Frontend not responding at http://127.0.0.1:5502
    echo.
    echo Make sure VS Code Live Server is running on port 5502
    echo.
)

echo ======================================
echo Diagnostic Summary
echo ======================================
echo.
echo Expected Setup:
echo - Server running: http://127.0.0.1:4000 (node server.js)
echo - MongoDB running: http://127.0.0.1:27017 (mongod)
echo - Frontend running: http://127.0.0.1:5502 (Live Server)
echo.
echo For detailed setup info, see:
echo - LOGIN_AND_SERVER_SETUP_GUIDE.md
echo - MOBILE_LOGIN_FIX_SUMMARY.md
echo.
pause
