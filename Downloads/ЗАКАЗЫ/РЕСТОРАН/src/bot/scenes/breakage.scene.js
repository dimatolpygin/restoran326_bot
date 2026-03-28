const { Scenes, Markup } = require('telegraf');
const supabase = require('../../lib/supabase');
require('dotenv').config();

const PAGE_SIZE = 8;

const REASONS = ['Скол/трещина', 'Разбито', 'Брак производства', 'Другое'];

const breakageScene = new Scenes.WizardScene(
  'breakage',

  // ── Шаг 1: Выбор склада ──────────────────────────────────────────
  async (ctx) => {
    const { data: warehouses } = await supabase
      .from('warehouses')
      .select('id, name')
      .eq('is_active', true)
      .order('name');

    if (!warehouses || warehouses.length === 0) {
      await ctx.reply('❌ Нет доступных складов.');
      return ctx.scene.leave();
    }

    ctx.wizard.state.warehouses = warehouses;

    const buttons = warehouses.map((w) => [
      Markup.button.callback(w.name, `bwh_${w.id}`),
    ]);
    buttons.push([Markup.button.callback('❌ Отмена', 'cancel')]);

    await ctx.reply('🏬 Выберите склад:', Markup.inlineKeyboard(buttons));
    return ctx.wizard.next();
  },

  // ── Шаг 2: Выбор товара (пагинация) ──────────────────────────────
  async (ctx) => {
    if (!ctx.callbackQuery) return; // ждём нажатия кнопки
    await ctx.answerCbQuery();

    const data = ctx.callbackQuery.data;

    if (data === 'cancel') {
      await ctx.reply('Заявка отменена.');
      return ctx.scene.leave();
    }

    if (data.startsWith('bwh_')) {
      const wId = parseInt(data.replace('bwh_', ''));
      ctx.wizard.state.warehouseId = wId;
      ctx.wizard.state.itemPage = 0;
      await showItemsPage(ctx, wId, 0);
      return ctx.wizard.next();
    }
  },

  // ── Шаг 3: Пагинация товаров / выбор товара ───────────────────────
  async (ctx) => {
    if (!ctx.callbackQuery) return;
    await ctx.answerCbQuery();

    const data = ctx.callbackQuery.data;

    if (data === 'cancel') {
      await ctx.reply('Заявка отменена.');
      return ctx.scene.leave();
    }

    if (data.startsWith('bitems_page_')) {
      const page = parseInt(data.replace('bitems_page_', ''));
      ctx.wizard.state.itemPage = page;
      await showItemsPage(ctx, ctx.wizard.state.warehouseId, page);
      return; // остаёмся на этом шаге
    }

    if (data.startsWith('bitem_')) {
      const itemId = parseInt(data.replace('bitem_', ''));
      const { data: item } = await supabase
        .from('items')
        .select('id, name, quantity')
        .eq('id', itemId)
        .single();

      if (!item || item.quantity <= 0) {
        await ctx.reply('❌ Товар недоступен или остаток 0.');
        return;
      }

      ctx.wizard.state.itemId = item.id;
      ctx.wizard.state.itemName = item.name;
      ctx.wizard.state.maxQty = item.quantity;

      await ctx.reply(
        `🍽 Выбрано: *${item.name}*\n📦 Остаток: ${item.quantity} шт.\n\nВведите количество (число от 1 до ${item.quantity}):`,
        { parse_mode: 'Markdown', ...Markup.removeKeyboard() }
      );
      return ctx.wizard.next();
    }
  },

  // ── Шаг 4: Ввод количества ────────────────────────────────────────
  async (ctx) => {
    if (ctx.callbackQuery?.data === 'cancel') {
      await ctx.answerCbQuery();
      await ctx.reply('Заявка отменена.');
      return ctx.scene.leave();
    }

    if (!ctx.message?.text) return;

    const qty = parseInt(ctx.message.text.trim());
    if (isNaN(qty) || qty <= 0) {
      return ctx.reply('⚠️ Введите целое положительное число:');
    }
    if (qty > ctx.wizard.state.maxQty) {
      return ctx.reply(`⚠️ Нельзя списать больше остатка (${ctx.wizard.state.maxQty} шт.):`);
    }

    ctx.wizard.state.quantity = qty;

    const reasonBtns = REASONS.map((r) => [Markup.button.callback(r, `reason_${r}`)]);
    reasonBtns.push([Markup.button.callback('❌ Отмена', 'cancel')]);

    await ctx.reply('🔩 Укажите причину:', Markup.inlineKeyboard(reasonBtns));
    return ctx.wizard.next();
  },

  // ── Шаг 5: Причина ───────────────────────────────────────────────
  async (ctx) => {
    // Ввод произвольной причины (после выбора "Другое")
    if (ctx.wizard.state.waitingCustomReason) {
      if (!ctx.message?.text) return;
      ctx.wizard.state.reason = ctx.message.text.trim();
      ctx.wizard.state.waitingCustomReason = false;
      await ctx.reply('📸 Прикрепите фото повреждения:');
      return ctx.wizard.next();
    }

    if (!ctx.callbackQuery) return;
    await ctx.answerCbQuery();

    const data = ctx.callbackQuery.data;

    if (data === 'cancel') {
      await ctx.reply('Заявка отменена.');
      return ctx.scene.leave();
    }

    if (data.startsWith('reason_')) {
      const reason = data.replace('reason_', '');
      if (reason === 'Другое') {
        ctx.wizard.state.waitingCustomReason = true;
        await ctx.reply('✏️ Введите причину:');
        return; // остаёмся на шаге 5
      }
      ctx.wizard.state.reason = reason;
      await ctx.reply('📸 Прикрепите фото повреждения:');
      return ctx.wizard.next();
    }
  },

  // ── Шаг 6: Фото ──────────────────────────────────────────────────
  async (ctx) => {
    if (ctx.callbackQuery?.data === 'cancel') {
      await ctx.answerCbQuery();
      await ctx.reply('Заявка отменена.');
      return ctx.scene.leave();
    }

    if (!ctx.message?.photo) {
      return ctx.reply('⚠️ Пожалуйста, отправьте фото (не файл):');
    }

    const photos = ctx.message.photo;
    ctx.wizard.state.photoFileId = photos[photos.length - 1].file_id;

    const s = ctx.wizard.state;
    const text =
      `📋 *Подтверждение заявки*\n\n` +
      `🍽 Товар: ${s.itemName}\n` +
      `💥 Количество: ${s.quantity} шт.\n` +
      `🔩 Причина: ${s.reason}`;

    await ctx.replyWithPhoto(s.photoFileId, {
      caption: text,
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback('✅ Подтвердить', 'confirm'),
          Markup.button.callback('❌ Отмена', 'cancel'),
        ],
      ]),
    });

    return ctx.wizard.next();
  },

  // ── Шаг 7: Подтверждение ─────────────────────────────────────────
  async (ctx) => {
    if (!ctx.callbackQuery) return;
    await ctx.answerCbQuery();

    const data = ctx.callbackQuery.data;

    if (data === 'cancel') {
      await ctx.reply('Заявка отменена.');
      return ctx.scene.leave();
    }

    if (data === 'confirm') {
      const s = ctx.wizard.state;
      const { from } = ctx;

      // Берём имя из БД, чтобы использовать введённое при регистрации
      const { data: botUser } = await supabase
        .from('bot_users')
        .select('tg_name')
        .eq('tg_id', from.id)
        .single();
      const tgName = botUser?.tg_name || [from.first_name, from.last_name].filter(Boolean).join(' ');

      // Сохраняем заявку
      const { data: req, error } = await supabase
        .from('breakage_requests')
        .insert({
          item_id: s.itemId,
          warehouse_id: s.warehouseId,
          quantity: s.quantity,
          reason: s.reason,
          photo_file_id: s.photoFileId,
          tg_user_id: from.id,
          tg_username: from.username || null,
          tg_name: tgName,
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        await ctx.reply('❌ Ошибка при сохранении заявки. Попробуйте снова.');
        console.error('[breakage] insert error:', error);
        return ctx.scene.leave();
      }

      // Отправляем уведомление в группу
      const adminChatId = process.env.ADMIN_CHAT_ID;
      const { data: wh } = await supabase
        .from('warehouses')
        .select('name')
        .eq('id', s.warehouseId)
        .single();

      const groupText =
        `📋 *НОВАЯ ЗАЯВКА НА БОЙ ПОСУДЫ*\n\n` +
        `💥 Бой посуды\n` +
        `🏬 Склад: ${wh?.name || '—'}\n` +
        `🍽 Товар: ${s.itemName}\n` +
        `💥 Количество: ${s.quantity} шт.\n` +
        `🔩 Причина: ${s.reason}\n` +
        `👤 Заявитель: ${tgName}${from.username ? ` (@${from.username})` : ''} (ID: ${from.id})\n` +
        `🔄 Ожидает подтверждения`;

      const groupKeyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback('✅ Принять', `accept_${req.id}`),
          Markup.button.callback('❌ Отклонить', `reject_${req.id}`),
        ],
      ]);

      try {
        const sent = await ctx.telegram.sendPhoto(adminChatId, s.photoFileId, {
          caption: groupText,
          parse_mode: 'Markdown',
          ...groupKeyboard,
        });

        // Сохраняем message_id группы
        await supabase
          .from('breakage_requests')
          .update({ group_message_id: sent.message_id })
          .eq('id', req.id);
      } catch (e) {
        console.error('[breakage] send to group error:', e.message);
      }

      await ctx.reply('✅ Заявка отправлена на рассмотрение!');
      return ctx.scene.leave();
    }
  }
);

// ── Вспомогательная функция пагинации ─────────────────────────────────

async function showItemsPage(ctx, warehouseId, page) {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: items, count } = await supabase
    .from('items')
    .select('id, name, quantity', { count: 'exact' })
    .eq('warehouse_id', warehouseId)
    .eq('is_active', true)
    .gt('quantity', 0)
    .order('name')
    .range(from, to);

  const totalPages = Math.ceil((count || 0) / PAGE_SIZE);

  const rows = (items || []).map((item) => [
    Markup.button.callback(`${item.name} (${item.quantity} шт.)`, `bitem_${item.id}`),
  ]);

  const nav = [];
  if (page > 0) nav.push(Markup.button.callback('◀️', `bitems_page_${page - 1}`));
  if (page < totalPages - 1) nav.push(Markup.button.callback('▶️', `bitems_page_${page + 1}`));
  if (nav.length) rows.push(nav);
  rows.push([Markup.button.callback('❌ Отмена', 'cancel')]);

  const text = `🍽 Выберите товар (стр. ${page + 1}/${totalPages || 1}):`;

  try {
    await ctx.editMessageText(text, Markup.inlineKeyboard(rows));
  } catch {
    await ctx.reply(text, Markup.inlineKeyboard(rows));
  }
}

module.exports = breakageScene;
