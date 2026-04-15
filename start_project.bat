@echo off
echo Starting Smart Parking System...

:: Start Backend (server folder)
start cmd /k "cd /d D:\full\server && node index.js"

:: Start Frontend (root folder - Vite)
start cmd /k "cd /d D:\full && npm run dev"

echo All services started!
pause