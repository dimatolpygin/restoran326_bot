@echo off
chcp 65001 > nul
call "%~dp0_config.bat"

net session >nul 2>&1
if errorlevel 1 (
    echo Нужны права администратора. Запусти файл через правую кнопку — «Запуск от имени администратора».
    pause
    exit /b 1
)

echo Перезапускаю службу %SERVICE_NAME%...
"%NSSM%" restart %SERVICE_NAME%
echo.
"%NSSM%" status %SERVICE_NAME%
echo.
echo Последние строки лога:
powershell -NoProfile -Command "Start-Sleep -Seconds 5; Get-Content '%LOG_OUT%' -Tail 15 -Encoding UTF8"
pause
