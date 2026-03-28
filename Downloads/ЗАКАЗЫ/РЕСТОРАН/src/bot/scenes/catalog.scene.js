const { Scenes, Markup } = require('telegraf');
const supabase = require('../../lib/supabase');

const PAGE_SIZE = 10;

// ─── Вспомогательные функции ──────────────────────────────────────────

function warehouseKeyboard(warehouses) {
  const buttons = warehouses.map((w) =>
    [Markup.button.callback(w.name, `wh_${w.id}`)]
  );
  return Markup.inlineKeyboard(buttons);
}

function itemsKeyboard(items, page, totalPages, warehouseId) {
  const rows = items.map((item) =>
    [Markup.button.callback(item.name, `item_${item.id}`)]
  );

  const nav = [];
  if (page > 0) nav.push(Markup.button.callback('◀️ Назад', `items_page_${warehouseId}_${page - 1}`));
  if (page < totalPages - 1) nav.push(Markup.button.callback('Далее ▶️', `items_page_${warehouseId}_${page + 1}`));
  if (nav.length) rows.push(nav);

  rows.push([Markup.button.callback('🏠 К складам', 'back_warehouses')]);
  return Markup.inlineKeyboard(rows);
}

// ─── Сцена ───────────────────────────────────────────────────────────

const catalogWarehouseScene = new Scenes.BaseScene('catalog_warehouse');

catalogWarehouseScene.enter(async (ctx) => {
  const { data: warehouses } = await supabase
    .from('warehouses')
    .select('id, name')
    .eq('is_active', true)
    .order('name');

  if (!warehouses || warehouses.length === 0) {
    return ctx.reply('📦 Нет доступных складов.');
  }

  ctx.scene.state.warehouses = warehouses;

  await ctx.reply('🏬 Выберите склад:', warehouseKeyboard(warehouses));
});

// Обработка выбора склада
catalogWarehouseScene.action(/^wh_(\d+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const warehouseId = parseInt(ctx.match[1]);
  await showItemsPage(ctx, warehouseId, 0);
});

// Пагинация позиций
catalogWarehouseScene.action(/^items_page_(\d+)_(\d+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const warehouseId = parseInt(ctx.match[1]);
  const page = parseInt(ctx.match[2]);
  await showItemsPage(ctx, warehouseId, page);
});

// Возврат к складам
catalogWarehouseScene.action('back_warehouses', async (ctx) => {
  await ctx.answerCbQuery();
  const { data: warehouses } = await supabase
    .from('warehouses')
    .select('id, name')
    .eq('is_active', true)
    .order('name');

  await ctx.editMessageText('🏬 Выберите склад:', warehouseKeyboard(warehouses));
});

// Карточка позиции
catalogWarehouseScene.action(/^item_(\d+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const itemId = parseInt(ctx.match[1]);

  const { data: item } = await supabase
    .from('items')
    .select('*, warehouses(name)')
    .eq('id', itemId)
    .single();

  if (!item) return ctx.reply('❌ Позиция не найдена.');

  const updatedAt = new Date(item.updated_at).toLocaleDateString('ru-RU');
  const price = item.price != null ? `${item.price} руб.` : 'не указана';

  const text =
    `📋 *${item.name}*\n\n` +
    `🏬 Склад: ${item.warehouses?.name || '—'}\n` +
    `💰 Цена: ${price}\n` +
    `📦 Остаток: ${item.quantity} шт.\n` +
    `📅 Обновлено: ${updatedAt}`;

  const backBtn = Markup.inlineKeyboard([
    [Markup.button.callback('◀️ Назад к списку', `wh_${item.warehouse_id}`)],
  ]);

  if (item.photo_file_id) {
    await ctx.replyWithPhoto(item.photo_file_id, {
      caption: text,
      parse_mode: 'Markdown',
      ...backBtn,
    });
  } else {
    await ctx.reply(text, { parse_mode: 'Markdown', ...backBtn });
  }
});

async function showItemsPage(ctx, warehouseId, page) {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: items, count } = await supabase
    .from('items')
    .select('id, name', { count: 'exact' })
    .eq('warehouse_id', warehouseId)
    .eq('is_active', true)
    .order('name')
    .range(from, to);

  if (!items || items.length === 0) {
    return ctx.editMessageText('📦 В этом складе нет позиций.', {
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback('◀️ К складам', 'back_warehouses')],
      ]).reply_markup,
    });
  }

  const { data: wh } = await supabase
    .from('warehouses')
    .select('name')
    .eq('id', warehouseId)
    .single();

  const totalPages = Math.ceil(count / PAGE_SIZE);

  try {
    await ctx.editMessageText(
      `🏬 *${wh?.name || 'Склад'}*\nСтраница ${page + 1}/${totalPages}`,
      {
        parse_mode: 'Markdown',
        ...itemsKeyboard(items, page, totalPages, warehouseId),
      }
    );
  } catch {
    try { await ctx.deleteMessage(); } catch {}
    await ctx.reply(
      `🏬 *${wh?.name || 'Склад'}*\nСтраница ${page + 1}/${totalPages}`,
      {
        parse_mode: 'Markdown',
        ...itemsKeyboard(items, page, totalPages, warehouseId),
      }
    );
  }
}

module.exports = catalogWarehouseScene;
