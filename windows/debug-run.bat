@echo off
chcp 65001 > nul
call "%~dp0_config.bat"

rem Ручной запуск в консоли — для отладки. Логи видно сразу, выход по Ctrl+C.
rem ВАЖНО: сначала останови службу, иначе два бота на одном токене
rem начнут отбирать апдейты друг у друга (ошибка Telegram 409).

echo Останавливаю службу, чтобы не было конфликта...
"%NSSM%" stop %SERVICE_NAME%
echo.

cd /d "%PROJECT_DIR%"
echo Запускаю бота в этом окне. Выход — Ctrl+C.
echo.
node src\index.js

echo.
echo Бот остановлен. Не забудь вернуть службу: windows\service-start.bat
pause
