@echo off
REM KGL Project - MongoDB Integration Startup Script
REM This script starts MongoDB, the backend server, and launches the frontend

echo.
echo ===============================================
echo    KGL Project - MongoDB Integrated Setup
echo ===============================================
echo.

REM Check if MongoDB is running
tasklist /FI "IMAGENAME eq mongod.exe" 2>NUL | find /I /N "mongod.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo [OK] MongoDB is already running
) else (
    echo [!] MongoDB not found running. Please start MongoDB first:
    echo     mongod
    echo.
    pause
    exit /b
)

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH
    pause
    exit /b 1
)
echo [OK] Node.js found: & node --version

REM Navigate to project root
cd /d c:\Users\HAVEN\Desktop\Intro-To-Software\kgl project\KGL_PROJECT
if %errorlevel% neq 0 (
    echo [ERROR] Could not navigate to project directory
    pause
    exit /b 1
)
echo [OK] Navigated to project directory

REM Check if backend dependencies are installed
if not exist "backend\node_modules" (
    echo [!] Installing backend dependencies...
    cd backend
    call npm install
    cd ..
    echo [OK] Backend dependencies installed
) else (
    echo [OK] Backend dependencies already installed
)

REM Check if .env exists
if not exist "backend\.env" (
    echo [!] Creating .env file...
    (
        echo MONGODB_URI=mongodb://localhost:27017/karibu-groceries
        echo PORT=5000
        echo NODE_ENV=development
    ) > backend\.env
    echo [OK] .env file created
) else (
    echo [OK] .env file exists
)

echo.
echo ===============================================
echo    Starting Backend Server...
echo ===============================================
echo.
echo Backend will run on: http://localhost:5000
echo.

REM Start backend in a new window
cd backend
start "KGL Backend Server" cmd /k "npm run dev"
cd ..

REM Wait a moment for backend to start
timeout /t 3 /nobreak

echo.
echo ===============================================
echo    Starting Frontend Server...
echo ===============================================
echo.
echo Frontend will run on: http://localhost:8000
echo.

REM Check if Python is available for http.server
python --version >nul 2>&1
if %errorlevel% equ 0 (
    echo Using Python http.server...
    start "KGL Frontend Server" cmd /k "python -m http.server 8000"
) else (
    echo [!] Python not found. Trying http-server (npx)...
    start "KGL Frontend Server" cmd /k "npx http-server -p 8000"
)

echo.
echo ===============================================
echo    Setup Complete!
echo ===============================================
echo.
echo Frontend:  http://localhost:8000
echo Backend:   http://localhost:5000
echo Database:  mongodb://localhost:27017/karibu-groceries
echo.
echo Default Login Credentials:
echo   Username: admin
echo   Password: admin
echo.
echo Press any key to continue...
pause

REM Open browser (optional)
echo Opening browser...
start http://localhost:8000

echo.
echo Done! Application is running.
echo.
