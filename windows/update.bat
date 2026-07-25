@echo off
chcp 65001 > nul
call "%~dp0_config.bat"

net session >nul 2>&1
if errorlevel 1 (
    echo Нужны права администратора — иначе служба не перезапустится.
    pause
    exit /b 1
)

cd /d "%PROJECT_DIR%"

echo ==^> Забираю код из GitHub...
git pull
if errorlevel 1 (
    echo Ошибка git pull. Обнови вручную, служба не тронута.
    pause
    exit /b 1
)

echo.
echo ==^> Ставлю зависимости...
call npm.cmd install
if errorlevel 1 (
    echo Ошибка npm install. Служба не перезапущена — бот продолжает работать на старом коде.
    pause
    exit /b 1
)

echo.
echo ==^> Перезапускаю службу...
"%NSSM%" restart %SERVICE_NAME%
echo.
"%NSSM%" status %SERVICE_NAME%
echo.
echo Последние строки лога:
powershell -NoProfile -Command "Start-Sleep -Seconds 5; Get-Content '%LOG_OUT%' -Tail 15 -Encoding UTF8"
pause
