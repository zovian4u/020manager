@echo off
echo Starting 020 Alliance Manager Local Server...
echo Make sure you have Docker/Supabase running if needed.
echo.

cd /d "%~dp0"
start "020 Web Server" cmd /k "npm run dev"

timeout /t 5 /nobreak >nul
echo Opening browser to http://localhost:3000...
start http://localhost:3000

echo Server is starting up. It may take a few more seconds to become fully responsive.
pause
