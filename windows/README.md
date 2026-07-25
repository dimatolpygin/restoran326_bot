# Запуск на Windows-сервере

Бот работает как служба Windows под управлением NSSM — стартует сам после
перезагрузки сервера и поднимается заново, если процесс упал. Отдельный
батник для запуска не нужен, файлы ниже — для повседневных операций.

Пути и имя службы задаются в `_config.bat`. Папка проекта определяется
автоматически, править нужно только `NSSM`, если nssm.exe лежит не в
`C:\Tools\nssm\nssm-2.24\win64\`.

| Файл | Что делает | Права админа |
|---|---|---|
| `update.bat` | `git pull` + `npm install` + перезапуск службы | нужны |
| `restart.bat` | перезапуск службы и показ лога | нужны |
| `logs.bat` | лог в реальном времени | нет |
| `errors.bat` | лог ошибок в реальном времени | нет |
| `service-start.bat` | запустить службу | нужны |
| `service-stop.bat` | остановить службу | нужны |
| `debug-run.bat` | ручной запуск в консоли для отладки | нужны |

Файлы, которым нужны права администратора, запускай через правую кнопку —
«Запуск от имени администратора». Без этого они сами скажут об этом и выйдут.

## Первичная установка службы

Выполняется один раз, из PowerShell **от имени администратора**:

```powershell
$n = "C:\Tools\nssm\nssm-2.24\win64\nssm.exe"
$p = "C:\bots\restoran326_bot"
& $n install restaurant-bot "C:\Program Files\nodejs\node.exe"
& $n set restaurant-bot AppParameters "$p\src\index.js"
& $n set restaurant-bot AppDirectory $p
& $n set restaurant-bot AppStdout "$p\logs\out.log"
& $n set restaurant-bot AppStderr "$p\logs\err.log"
& $n set restaurant-bot AppRotateFiles 1
& $n set restaurant-bot AppRotateBytes 10485760
& $n set restaurant-bot Start SERVICE_AUTO_START
& $n start restaurant-bot
```

`AppDirectory` обязателен — без него `dotenv` не найдёт `.env` и бот
стартует без токена. `AppParameters` тоже: без него `node` запустится
в интерактивном режиме и в логе будет `Welcome to Node.js`.

## Настройки окружения

`.env` в репозиторий не входит, на сервере создаётся вручную из
`.env.example`. Для сервера, с которого заблокирован `api.telegram.org`,
нужна строка:

```
PROXY_URL=http://user:pass@host:port
```

Если переменная пустая или отсутствует — бот работает через прямое
соединение, как на Linux-сервере.

## Чтение логов вручную

PowerShell 5.1 читает UTF-8 как CP1251, поэтому русский текст выглядит
кракозябрами. Нужен явный `-Encoding UTF8`:

```powershell
Get-Content "C:\bots\restoran326_bot\logs\out.log" -Tail 30 -Encoding UTF8
```

## Важно

Бот работает через polling. Два запущенных экземпляра с одним `BOT_TOKEN`
(например, служба на Windows и PM2 на VPS) начнут отбирать апдейты друг
у друга — Telegram вернёт ошибку 409, часть сообщений потеряется.
Одновременно должен работать только один.
