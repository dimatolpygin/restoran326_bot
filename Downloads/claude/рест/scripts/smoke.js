// Смоук-тест демо-бота без поднятия сервера: грузит .env, гоняет сценарий брони
// через реальный api/chat.js (реальный OpenRouter) и проверяет, что на финале
// приходит блок booking с корректной ссылкой Ágora.
//
// Запуск: node scripts/smoke.js

import { readFileSync } from 'node:fs';
import handler from '../api/chat.js';

// Простой парсер .env (без зависимостей).
try {
  const env = readFileSync(new URL('../.env', import.meta.url), 'utf8');
  for (const line of env.split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2].trim();
  }
} catch {
  console.error('Нет .env — задай OPENROUTER_API_KEY в окружении');
}

// Мини-моки req/res под сигнатуру Vercel-хендлера.
function call(messages) {
  return new Promise((resolve) => {
    const req = { method: 'POST', body: { messages } };
    const res = {
      statusCode: 200,
      status(c) { this.statusCode = c; return this; },
      json(obj) { resolve({ status: this.statusCode, body: obj }); },
    };
    handler(req, res);
  });
}

const scenario = [
  'Hola, quiero reservar una mesa',
  'En el de la Plaza de la Reina',
  'Este sábado',
  'A las 21:00',
  'Somos 4 personas',
  'A nombre de Carlos',
  'Sí, confirmo',
];

const history = [];
for (const userMsg of scenario) {
  history.push({ role: 'user', content: userMsg });
  const { status, body } = await call(history);
  if (status !== 200) {
    console.error('FAIL', status, body);
    process.exit(1);
  }
  console.log('\n👤', userMsg);
  console.log('🤖', body.reply);
  if (body.booking) {
    console.log('\n✅ BOOKING:', JSON.stringify(body.booking, null, 2));
  }
  history.push({ role: 'assistant', content: body.reply });
}
