@echo off
rem Общие настройки для остальных .bat-файлов. Правь пути здесь, если что-то переехало.

rem Папка проекта вычисляется автоматически (на уровень выше этого файла)
for %%I in ("%~dp0..") do set "PROJECT_DIR=%%~fI"

rem Имя службы в NSSM
set "SERVICE_NAME=restaurant-bot"

rem Путь к nssm.exe
set "NSSM=C:\Tools\nssm\nssm-2.24\win64\nssm.exe"

set "LOG_OUT=%PROJECT_DIR%\logs\out.log"
set "LOG_ERR=%PROJECT_DIR%\logs\err.log"
