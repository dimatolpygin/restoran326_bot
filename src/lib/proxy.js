const { HttpsProxyAgent } = require('https-proxy-agent');
require('dotenv').config();

// Прокси для запросов к api.telegram.org (нужен там, где Telegram заблокирован).
// Если PROXY_URL не задан — agent === undefined, соединение идёт напрямую.
const agent = process.env.PROXY_URL
  ? new HttpsProxyAgent(process.env.PROXY_URL)
  : undefined;

if (agent) {
  console.log('[proxy] Запросы к Telegram идут через прокси');
}

module.exports = agent;
