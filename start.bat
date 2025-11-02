@echo off
echo ========================================
echo Realtime Speech Recognition App
echo ========================================
echo.

if not exist "node_modules" (
    echo Installing dependencies...
    echo.
    call npm install
    echo.
)

echo Starting server...
start /B npm start

echo Waiting for server to start...
timeout /t 3 /nobreak >nul
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" http://localhost:3000 2>nul

echo.
echo Server is running at http://localhost:3000

