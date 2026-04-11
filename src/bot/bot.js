const { Telegraf, Scenes, session } = require('telegraf');
const Redis = require('ioredis');
require('dotenv').config();

const supabase = require('../lib/supabase');

function escMd(text) {
  return String(text ?? '').replace(/[_*`[]/g, '\\$&');
}

const authMiddleware = require('./middleware/auth');
const authScene = require('./scenes/auth.scene');
const catalogWarehouseScene = require('./scenes/catalog.scene');
const breakageScene = require('./scenes/breakage.scene');
const startCommand = require('./commands/start');
const setupBreakageCallbacks = require('./callbacks/breakage');

function createBot() {
  const bot = new Telegraf(process.env.BOT_TOKEN);

  // ── Session через Redis ─────────────────────────────────────────
  const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

  bot.use(
    session({
      store: {
        async get(key) {
          const data = await redis.get(`tg_session:${key}`);
          return data ? JSON.parse(data) : undefined;
        },
        async set(key, val) {
          await redis.set(`tg_session:${key}`, JSON.stringify(val), 'EX', 86400);
        },
        async delete(key) {
          await redis.del(`tg_session:${key}`);
        },
      },
    })
  );

  // ── Scenes ──────────────────────────────────────────────────────
  const stage = new Scenes.Stage([authScene, catalogWarehouseScene, breakageScene]);
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
          { text: '⚙️ Открыть админку', web_app: { url: 'https://anastasia-kwork.store/' } }
        ]]
      }
    });
  });

  bot.command('stat', async (ctx) => {
    const now = new Date();
    const tz = 3; // UTC+3 (Москва)
    const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - tz * 3600000);
    const yesterdayStart = new Date(todayUtc - 86400000).toISOString();
    const yesterdayEnd = todayUtc.toISOString();

    const { data: rows } = await supabase
      .from('breakage_requests')
      .select('quantity, reason, tg_name, status, created_at, items(name), warehouses(name)')
      .gte('created_at', yesterdayStart)
      .lt('created_at', yesterdayEnd)
      .order('created_at');

    if (!rows || rows.length === 0) {
      return ctx.reply('📊 За вчера заявок на бой не было.');
    }

    const dateLabel = new Date(yesterdayStart).toLocaleDateString('ru-RU', { timeZone: 'Europe/Moscow', day: '2-digit', month: '2-digit', year: 'numeric' });
    let text = `📊 *Отчёт за ${dateLabel}* (${rows.length} заявок)\n\n`;
    rows.forEach((r, i) => {
      const statusIcon = r.status === 'accepted' ? '✅' : r.status === 'rejected' ? '❌' : '⏳';
      const time = new Date(r.created_at).toLocaleTimeString('ru-RU', { timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit' });
      text += `${i + 1}. ${statusIcon} ${escMd(r.items?.name || '—')} — ${r.quantity} шт.\n`;
      text += `   👤 ${escMd(r.tg_name)} | 🔩 ${escMd(r.reason)} | 🕐 ${time}\n\n`;
    });

    await ctx.reply(text, { parse_mode: 'Markdown' });
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
