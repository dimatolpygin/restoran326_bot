// Локальный сервер для проверки демо без Vercel: раздаёт public/ и роутит
// POST /api/chat в тот же обработчик, что и на проде. Грузит .env. Без зависимостей.
//
// Запуск:  node scripts/serve.js   →   открыть http://localhost:3000

import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import handler from '../api/chat.js';

// Загрузка .env.
try {
  const env = readFileSync(new URL('../.env', import.meta.url), 'utf8');
  for (const line of env.split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2].trim();
  }
} catch {
  console.error('⚠  Нет .env — задай OPENROUTER_API_KEY');
}

const PORT = process.env.PORT || 3000;
const page = readFileSync(new URL('../public/index.html', import.meta.url));

createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/api/chat') {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      const vres = {
        statusCode: 200,
        _headers: {},
        setHeader(k, v) { this._headers[k] = v; },
        status(c) { this.statusCode = c; return this; },
        json(obj) {
          res.writeHead(this.statusCode, { 'Content-Type': 'application/json', ...this._headers });
          res.end(JSON.stringify(obj));
        },
      };
      handler({ method: 'POST', body: raw }, vres);
    });
    return;
  }
  // Всё остальное — страница чата.
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(page);
}).listen(PORT, () => {
  console.log(`\n  Демо Número Uno:  http://localhost:${PORT}\n  Ctrl+C — остановить\n`);
});
