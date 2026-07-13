// Локальный сервер для проверки демо без Vercel: раздаёт public/ и роутит
// POST /api/chat в тот же обработчик, что и на проде. Грузит .env. Без зависимостей.
//
// Запуск:  node scripts/serve.js   →   открыть http://localhost:3000

import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname } from 'node:path';
import handler from '../api/chat.js';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

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
const PUBLIC = new URL('../public/', import.meta.url);

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
  // Статика из public/: отдаём файл, если существует, иначе index.html.
  const path = (req.url || '/').split('?')[0];
  const rel = path === '/' ? 'index.html' : path.replace(/^\/+/, '');
  const fileUrl = new URL(rel, PUBLIC);
  if (existsSync(fileUrl)) {
    res.writeHead(200, { 'Content-Type': MIME[extname(rel)] || 'application/octet-stream' });
    res.end(readFileSync(fileUrl));
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(readFileSync(new URL('index.html', PUBLIC)));
}).listen(PORT, () => {
  console.log(`\n  Демо Número Uno:  http://localhost:${PORT}\n  Ctrl+C — остановить\n`);
});
