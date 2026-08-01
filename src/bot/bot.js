const { Telegraf, Scenes, session } = require('telegraf');
const Redis = require('ioredis');
require('dotenv').config();

const authMiddleware = require('./middleware/auth');
const authScene = require('./scenes/auth.scene');
const catalogWarehouseScene = require('./scenes/catalog.scene');
const breakageScene = require('./scenes/breakage.scene');
const statScene = require('./scenes/stat.scene');
const startCommand = require('./commands/start');
const setupBreakageCallbacks = require('./callbacks/breakage');

// Адрес админки для кнопки WebApp. Telegram принимает только публичный
// HTTPS с валидным сертификатом — localhost и http работать не будут.
const WEBAPP_URL = process.env.WEBAPP_URL || 'https://sol-dobra.ru/';

function createBot() {
  const bot = new Telegraf(process.env.BOT_TOKEN);

  // ── Session через Redis (с fallback на память при недоступности) ──
  const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    lazyConnect: true,
    enableOfflineQueue: false,
    retryStrategy: (times) => (times > 3 ? null : Math.min(times * 500, 2000)),
  });
  redis.on('error', () => {}); // подавляем unhandled error

  const memoryStore = new Map();

  bot.use(
    session({
      store: {
        async get(key) {
          try {
            const data = await redis.get(`tg_session:${key}`);
            return data ? JSON.parse(data) : undefined;
          } catch {
            return memoryStore.get(key);
          }
        },
        async set(key, val) {
          try {
            await redis.set(`tg_session:${key}`, JSON.stringify(val), 'EX', 86400);
          } catch {
            memoryStore.set(key, val);
          }
        },
        async delete(key) {
          try {
            await redis.del(`tg_session:${key}`);
          } catch {
            memoryStore.delete(key);
          }
        },
      },
    })
  );

  // ── Scenes ──────────────────────────────────────────────────────
  const stage = new Scenes.Stage([authScene, catalogWarehouseScene, breakageScene, statScene]);
  bot.use(stage.middleware());

  // ── Auth middleware (после stage, чтобы scene.enter работал) ───
  bot.use(authMiddleware);

  // ── Команды ─────────────────────────────────────────────────────
  bot.start(startCommand);

  bot.command('boy', async (ctx) => {
    await ctx.scene.enter('breakage');
  });

  bot.command('admin', async (ctx) => {
    await ctx.reply('Панель управления:', {
      reply_markup: {
        inline_keyboard: [[
          { text: '⚙️ Открыть админку', web_app: { url: WEBAPP_URL } }
        ]]
      }
    });
  });

  bot.command('stat', async (ctx) => {
    await ctx.scene.enter('stat');
  });

  // ── Callbacks из группы (accept/reject) ─────────────────────────
  setupBreakageCallbacks(bot);

  // ── Обработка ошибок ────────────────────────────────────────────
  bot.catch((err, ctx) => {
    console.error(`[bot] Error for ${ctx.updateType}:`, err.message);
  });

  return bot;
}

module.exports = createBot;
