@echo off
chcp 65001 > nul
call "%~dp0_config.bat"

net session >nul 2>&1
if errorlevel 1 (
    echo Нужны права администратора. Запусти через правую кнопку — «Запуск от имени администратора».
    pause
    exit /b 1
)

"%NSSM%" stop %SERVICE_NAME%
echo.
"%NSSM%" status %SERVICE_NAME%
pause
