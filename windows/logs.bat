@echo off
chcp 65001 > nul
call "%~dp0_config.bat"

echo Логи бота в реальном времени. Выход — Ctrl+C.
echo Файл: %LOG_OUT%
echo.
powershell -NoProfile -Command "Get-Content '%LOG_OUT%' -Tail 40 -Wait -Encoding UTF8"
