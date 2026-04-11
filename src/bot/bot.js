const { Telegraf, Scenes, session, Markup } = require('telegraf');
const Redis = require('ioredis');
require('dotenv').config();

const supabase = require('../lib/supabase');

function escMd(text) {
  return String(text ?? '').replace(/[_*`[]/g, '\\$&');
}

// Возвращает строку 'YYYY-MM-DD' для сегодня по Москве
function todayMoscow() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Moscow' });
}

// Сдвигает дату на days дней
function shiftDate(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

// Строит текст и клавиатуру для отчёта за дату dateStr (YYYY-MM-DD, Москва)
async function buildStatMessage(dateStr) {
  const dayStartMs = Date.parse(`${dateStr}T00:00:00+03:00`);
  const dayEndMs = dayStartMs + 86400000;
  const dayStartIso = new Date(dayStartMs).toISOString();
  const dayEndIso = new Date(dayEndMs).toISOString();

  const { data: rows } = await supabase
    .from('breakage_requests')
    .select('quantity, reason, tg_name, status, created_at, items(name), warehouses(name)')
    .gte('created_at', dayStartIso)
    .lt('created_at', dayEndIso)
    .order('created_at');

  const [y, m, d] = dateStr.split('-');
  const dateLabel = `${d}.${m}.${y}`;

  let text;
  if (!rows || rows.length === 0) {
    text = `📊 *${dateLabel}* — заявок на бой не было.`;
  } else {
    text = `📊 *Отчёт за ${dateLabel}* (${rows.length} заявок)\n\n`;
    rows.forEach((r, i) => {
      const statusIcon = r.status === 'accepted' ? '✅' : r.status === 'rejected' ? '❌' : '⏳';
      const time = new Date(r.created_at).toLocaleTimeString('ru-RU', {
        timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit',
      });
      text += `${i + 1}. ${statusIcon} ${escMd(r.items?.name || '—')} — ${r.quantity} шт.\n`;
      text += `   👤 ${escMd(r.tg_name)} | 🔩 ${escMd(r.reason)} | 🕐 ${time}\n\n`;
    });
  }

  const prevDate = shiftDate(dateStr, -1);
  const nextDate = shiftDate(dateStr, +1);
  const today = todayMoscow();

  const navRow = [Markup.button.callback('◀️', `stat_${prevDate}`)];
  if (nextDate <= today) {
    navRow.push(Markup.button.callback('▶️', `stat_${nextDate}`));
  }
  const keyboard = Markup.inlineKeyboard([navRow]);

  return { text, keyboard };
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
    const yesterday = shiftDate(todayMoscow(), -1);
    const { text, keyboard } = await buildStatMessage(yesterday);
    await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
  });

  bot.action(/^stat_(\d{4}-\d{2}-\d{2})$/, async (ctx) => {
    await ctx.answerCbQuery();
    const dateStr = ctx.match[1];
    const { text, keyboard } = await buildStatMessage(dateStr);
    try {
      await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard });
    } catch (e) {
      // Текст не изменился — Telegram кидает ошибку, игнорируем
    }
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
