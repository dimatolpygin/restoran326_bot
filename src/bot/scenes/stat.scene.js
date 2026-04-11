const { Scenes, Markup } = require('telegraf');
const supabase = require('../../lib/supabase');
const REASONS = require('../../lib/reasons');

const PAGE_SIZE = 8;

const reasonEmojiMap = Object.fromEntries(REASONS.map((r) => [r.text, r.emoji]));
function reasonEmoji(text) {
  return reasonEmojiMap[text] || '✏️';
}

function escMd(text) {
  return String(text ?? '').replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
}

// ── Диапазоны периодов ────────────────────────────────────────────────────────

function getPeriodRange(period, customStart, customEnd) {
  const now = new Date();
  const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'Europe/Moscow' });

  if (period === 'tod') {
    return {
      start: `${todayStr}T00:00:00+03:00`,
      end: `${todayStr}T23:59:59+03:00`,
    };
  }
  if (period === 'wk') {
    const startMs = Date.parse(`${todayStr}T00:00:00+03:00`) - 6 * 86400000;
    return {
      start: new Date(startMs).toISOString(),
      end: new Date(Date.parse(`${todayStr}T23:59:59+03:00`)).toISOString(),
    };
  }
  if (period === 'mo') {
    const startMs = Date.parse(`${todayStr}T00:00:00+03:00`) - 29 * 86400000;
    return {
      start: new Date(startMs).toISOString(),
      end: new Date(Date.parse(`${todayStr}T23:59:59+03:00`)).toISOString(),
    };
  }
  if (period === 'all') {
    return { start: '2000-01-01T00:00:00.000Z', end: '2100-01-01T00:00:00.000Z' };
  }
  if (period === 'cst') {
    return { start: customStart, end: customEnd };
  }
  return { start: '2000-01-01T00:00:00.000Z', end: '2100-01-01T00:00:00.000Z' };
}

function periodLabel(period) {
  switch (period) {
    case 'tod': return 'Сегодня';
    case 'wk':  return 'За неделю';
    case 'mo':  return 'За месяц';
    case 'all': return 'За всё время';
    case 'cst': return 'Свой период';
    default:    return period;
  }
}

// ── Вид 1: Подробный список заявок ────────────────────────────────────────────

async function showList(ctx, page) {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: rows, count } = await supabase
    .from('breakage_requests')
    .select('id, created_at, reason, tg_username, tg_name, tg_user_id, status', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  const totalPages = Math.ceil((count || 0) / PAGE_SIZE);
  const items = rows || [];

  let text = `📋 *Все заявки* \\(стр\\. ${page + 1}/${totalPages || 1}, всего ${count || 0}\\)\n\n`;

  if (items.length === 0) {
    text += '_Заявок пока нет\\._';
  } else {
    items.forEach((r, i) => {
      const num = from + i + 1;
      const date = new Date(r.created_at).toLocaleDateString('ru-RU', {
        timeZone: 'Europe/Moscow',
        year: 'numeric', month: '2-digit', day: '2-digit',
      }).split('.').reverse().join('.');
      const emoji = reasonEmoji(r.reason);
      const user = r.tg_username ? `@${escMd(r.tg_username)} ${escMd(r.tg_name)}` : escMd(r.tg_name);
      text += `${num}\\. ${escMd(date)} | ${emoji} | ${user} \\(ID: ${r.tg_user_id}\\)\n`;
    });
  }

  // Кнопки 1-8
  const numBtns = [];
  const chunkA = [];
  const chunkB = [];
  items.forEach((r, i) => {
    const btn = Markup.button.callback(String(i + 1), `sdet_${r.id}_${page}`);
    if (i < 4) chunkA.push(btn);
    else chunkB.push(btn);
  });
  if (chunkA.length) numBtns.push(chunkA);
  if (chunkB.length) numBtns.push(chunkB);

  // Навигация
  const nav = [];
  if (page > 0) nav.push(Markup.button.callback('◀️ пред.', `slist_${page - 1}`));
  if (page < totalPages - 1) nav.push(Markup.button.callback('след. ▶️', `slist_${page + 1}`));
  if (nav.length) numBtns.push(nav);

  numBtns.push([Markup.button.callback('📈 Статистика по причинам', 'scats_wk')]);

  const keyboard = Markup.inlineKeyboard(numBtns);

  try {
    await ctx.editMessageText(text, { parse_mode: 'MarkdownV2', ...keyboard });
  } catch {
    await ctx.reply(text, { parse_mode: 'MarkdownV2', ...keyboard });
  }
}

// ── Вид 2: Детали заявки ──────────────────────────────────────────────────────

async function showDetail(ctx, id, backPage) {
  const { data: r } = await supabase
    .from('breakage_requests')
    .select('*, items(name), warehouses(name)')
    .eq('id', id)
    .single();

  if (!r) {
    await ctx.answerCbQuery('Заявка не найдена', { show_alert: true });
    return;
  }

  const date = new Date(r.created_at).toLocaleString('ru-RU', {
    timeZone: 'Europe/Moscow',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const statusIcon = r.status === 'accepted' ? '✅ Принята' : r.status === 'rejected' ? '❌ Отклонена' : '⏳ Ожидает';
  const user = r.tg_username ? `@${escMd(r.tg_username)} ${escMd(r.tg_name)}` : escMd(r.tg_name);
  const emoji = reasonEmoji(r.reason);

  const text =
    `📋 *Заявка \\#${r.id}*\n\n` +
    `📅 ${escMd(date)}\n` +
    `🏬 Склад: ${escMd(r.warehouses?.name || '—')}\n` +
    `🍽 Товар: ${escMd(r.items?.name || '—')} — ${r.quantity} шт\\.\n` +
    `🔩 Причина: ${emoji} ${escMd(r.reason)}\n` +
    `👤 ${escMd(user)} \\(ID: ${r.tg_user_id}\\)\n` +
    `${escMd(statusIcon)}`;

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('◀️ Назад к списку', `slist_${backPage}`)],
  ]);

  try {
    if (r.photo_file_id) {
      const msgId = ctx.callbackQuery?.message?.message_id;
      if (msgId) {
        try {
          await ctx.telegram.editMessageMedia(
            ctx.chat.id,
            msgId,
            undefined,
            { type: 'photo', media: r.photo_file_id, caption: text, parse_mode: 'MarkdownV2' },
            keyboard
          );
        } catch {
          await ctx.reply(text, { parse_mode: 'MarkdownV2', ...keyboard });
        }
      } else {
        await ctx.replyWithPhoto(r.photo_file_id, { caption: text, parse_mode: 'MarkdownV2', ...keyboard });
      }
    } else {
      await ctx.editMessageText(text, { parse_mode: 'MarkdownV2', ...keyboard });
    }
  } catch {
    await ctx.reply(text, { parse_mode: 'MarkdownV2', ...keyboard });
  }
}

// ── Вид 3: Статистика по причинам ────────────────────────────────────────────

async function showCats(ctx, period, customStart, customEnd) {
  const { start, end } = getPeriodRange(period, customStart, customEnd);

  const { data: rows } = await supabase
    .from('breakage_requests')
    .select('reason')
    .gte('created_at', start)
    .lt('created_at', end);

  const counts = {};
  for (const r of rows || []) {
    counts[r.reason] = (counts[r.reason] || 0) + 1;
  }

  const label = periodLabel(period);
  let text = `📊 *Статистика списаний — ${escMd(label)}*\n\n`;

  REASONS.forEach((r) => {
    const cnt = counts[r.text] || 0;
    text += `${r.emoji} ${escMd(r.text)} \\(${cnt}\\)\n`;
  });

  const periods = ['tod', 'wk', 'mo', 'all', 'cst'];
  const periodNames = { tod: 'Сегодня', wk: 'За неделю', mo: 'За месяц', all: 'За всё время', cst: '✏️ Свой период' };

  const periodRow1 = periods.slice(0, 3).map((p) =>
    Markup.button.callback(p === period ? `${periodNames[p]} ✅` : periodNames[p], `scats_${p}`)
  );
  const periodRow2 = periods.slice(3).map((p) =>
    Markup.button.callback(p === period ? `${periodNames[p]} ✅` : periodNames[p], `scats_${p}`)
  );

  const catBtns = REASONS.map((r, i) => {
    const cnt = counts[r.text] || 0;
    return [Markup.button.callback(`${r.emoji} ${r.text} (${cnt})`, `scat_${i}_${period}`)];
  });

  const keyboard = Markup.inlineKeyboard([
    periodRow1,
    periodRow2,
    ...catBtns,
    [Markup.button.callback('🏆 ТОП позиций', `stop_${period}`)],
    [Markup.button.callback('◀️ К списку', 'slist_0')],
  ]);

  try {
    await ctx.editMessageText(text, { parse_mode: 'MarkdownV2', ...keyboard });
  } catch {
    await ctx.reply(text, { parse_mode: 'MarkdownV2', ...keyboard });
  }
}

// ── Вид 4: Категория (детали) ─────────────────────────────────────────────────

async function showCat(ctx, idx, period, customStart, customEnd) {
  const reason = REASONS[idx];
  if (!reason) {
    await ctx.answerCbQuery('Неверный индекс', { show_alert: true });
    return;
  }

  const { start, end } = getPeriodRange(period, customStart, customEnd);

  const { data: rows } = await supabase
    .from('breakage_requests')
    .select('id, created_at, tg_name, tg_username, tg_user_id, quantity, items(name)')
    .eq('reason', reason.text)
    .gte('created_at', start)
    .lt('created_at', end)
    .order('created_at', { ascending: false })
    .limit(20);

  const total = (rows || []).reduce((s, r) => s + (r.quantity || 0), 0);
  const label = periodLabel(period);

  let text = `${reason.emoji} *${escMd(reason.text)}* — ${rows?.length || 0} случаев, ${total} шт\\. \\(${escMd(label)}\\)\n\n`;

  if (!rows || rows.length === 0) {
    text += '_Нет заявок за этот период\\._';
  } else {
    rows.forEach((r, i) => {
      const date = new Date(r.created_at).toLocaleDateString('ru-RU', {
        timeZone: 'Europe/Moscow', day: '2-digit', month: '2-digit',
      });
      const user = r.tg_username ? `@${escMd(r.tg_username)} ${escMd(r.tg_name)}` : escMd(r.tg_name);
      text += `${i + 1}\\. ${escMd(date)} — ${escMd(r.items?.name || '—')} — ${r.quantity} шт\\. — 👤 ${user}\n`;
    });
  }

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('◀️ Назад', `scats_${period}`)],
  ]);

  try {
    await ctx.editMessageText(text, { parse_mode: 'MarkdownV2', ...keyboard });
  } catch {
    await ctx.reply(text, { parse_mode: 'MarkdownV2', ...keyboard });
  }
}

// ── Вид 5: ТОП позиций ────────────────────────────────────────────────────────

async function showTop(ctx, period, customStart, customEnd) {
  const { start, end } = getPeriodRange(period, customStart, customEnd);

  const { data: rows } = await supabase
    .from('breakage_requests')
    .select('quantity, items(name)')
    .gte('created_at', start)
    .lt('created_at', end);

  const map = {};
  for (const r of rows || []) {
    const name = r.items?.name || '—';
    map[name] = (map[name] || 0) + (r.quantity || 0);
  }

  const sorted = Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const label = periodLabel(period);
  let text = `🏆 *ТОП поломанных позиций — ${escMd(label)}*\n\n`;

  if (sorted.length === 0) {
    text += '_Нет данных за этот период\\._';
  } else {
    sorted.forEach(([name, qty], i) => {
      text += `${i + 1}\\. ${escMd(name)} — ${qty} шт\\.\n`;
    });
  }

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('◀️ Назад', `scats_${period}`)],
  ]);

  try {
    await ctx.editMessageText(text, { parse_mode: 'MarkdownV2', ...keyboard });
  } catch {
    await ctx.reply(text, { parse_mode: 'MarkdownV2', ...keyboard });
  }
}

// ── Сцена ─────────────────────────────────────────────────────────────────────

const statScene = new Scenes.BaseScene('stat');

statScene.enter(async (ctx) => {
  ctx.scene.state.customStart = null;
  ctx.scene.state.customEnd = null;
  ctx.scene.state.awaitingPeriod = false;
  await showList(ctx, 0);
});

// Список заявок (пагинация)
statScene.action(/^slist_(\d+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const page = parseInt(ctx.match[1]);
  await showList(ctx, page);
});

// Детали заявки
statScene.action(/^sdet_(\d+)_(\d+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const id = parseInt(ctx.match[1]);
  const backPage = parseInt(ctx.match[2]);
  await showDetail(ctx, id, backPage);
});

// Статистика по причинам
statScene.action(/^scats_(tod|wk|mo|all|cst)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const period = ctx.match[1];

  if (period === 'cst') {
    ctx.scene.state.awaitingPeriod = true;
    try {
      await ctx.editMessageText(
        '✏️ Введите период в формате ДД\\.ММ\\.ГГГГ\\-ДД\\.ММ\\.ГГГГ:\n_Например: 01\\.01\\.2025\\-31\\.01\\.2025_',
        { parse_mode: 'MarkdownV2', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Отмена', 'slist_0')]]) }
      );
    } catch {
      await ctx.reply(
        '✏️ Введите период в формате ДД.ММ.ГГГГ-ДД.ММ.ГГГГ:\n_Например: 01.01.2025-31.01.2025_',
        { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Отмена', 'slist_0')]]) }
      );
    }
    return;
  }

  ctx.scene.state.awaitingPeriod = false;
  await showCats(ctx, period);
});

// Детали категории
statScene.action(/^scat_(\d+)_(tod|wk|mo|all|cst)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const idx = parseInt(ctx.match[1]);
  const period = ctx.match[2];
  await showCat(ctx, idx, period, ctx.scene.state.customStart, ctx.scene.state.customEnd);
});

// ТОП позиций
statScene.action(/^stop_(tod|wk|mo|all|cst)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const period = ctx.match[1];
  await showTop(ctx, period, ctx.scene.state.customStart, ctx.scene.state.customEnd);
});

// Выход из сцены по slist_0 когда awaitingPeriod — через action выше

// Ввод произвольного периода
statScene.on('text', async (ctx) => {
  if (!ctx.scene.state.awaitingPeriod) return;

  const input = ctx.message.text.trim();
  const match = input.match(/^(\d{2})\.(\d{2})\.(\d{4})-(\d{2})\.(\d{2})\.(\d{4})$/);

  if (!match) {
    await ctx.reply('⚠️ Неверный формат. Введите ДД.ММ.ГГГГ-ДД.ММ.ГГГГ:');
    return;
  }

  const [, d1, m1, y1, d2, m2, y2] = match;
  const customStart = `${y1}-${m1}-${d1}T00:00:00+03:00`;
  const customEnd = `${y2}-${m2}-${d2}T23:59:59+03:00`;

  ctx.scene.state.customStart = customStart;
  ctx.scene.state.customEnd = customEnd;
  ctx.scene.state.awaitingPeriod = false;

  await showCats(ctx, 'cst', customStart, customEnd);
});

module.exports = statScene;
