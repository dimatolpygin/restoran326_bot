@echo off
chcp 65001 > nul
call "%~dp0_config.bat"

echo Лог ошибок. Выход — Ctrl+C.
echo Файл: %LOG_ERR%
echo.
powershell -NoProfile -Command "Get-Content '%LOG_ERR%' -Tail 40 -Wait -Encoding UTF8"
