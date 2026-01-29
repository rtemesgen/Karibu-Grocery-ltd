@echo off
REM Stock Management Backend Installation Script

echo.
echo ============================================
echo Stock Management Backend Setup
echo ============================================
echo.

cd backend

if not exist node_modules (
    echo Installing npm dependencies...
    call npm install
    echo ✓ Dependencies installed
) else (
    echo ✓ Dependencies already installed
)

echo.
echo ============================================
echo Setup Complete!
echo ============================================
echo.
echo Next steps:
echo 1. Make sure MongoDB is running (mongod)
echo 2. Run the backend: npm start
echo 3. Open stock.html in your browser
echo.
echo Backend will run on: http://localhost:5000
echo Database: karibu-groceries
echo.
pause
