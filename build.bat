@echo off
echo ===================================================
echo             HydraSpecma VMS Setup Builder          
echo ===================================================
echo.

:: Run the plain-text PowerShell script directly
powershell -NoProfile -ExecutionPolicy Bypass -File build.ps1

echo.
echo Process complete.
pause
