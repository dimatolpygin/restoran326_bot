const supabase = require('../../lib/supabase');

function escMd(str) {
  return String(str ?? '').replace(/[_*`[]/g, '\\$&');
}

/**
 * Обработчик accept/reject из группы администраторов.
 * Регистрируется на уровне бота (не в сцене).
 */
async function setupBreakageCallbacks(bot) {
  // ── Принять заявку ──────────────────────────────────────────────
  bot.action(/^accept_(\d+)$/, async (ctx) => {
    const reqId = parseInt(ctx.match[1]);

    const { data: req, error } = await supabase
      .from('breakage_requests')
      .select('*, items(quantity)')
      .eq('id', reqId)
      .single();

    if (error || !req) {
      return ctx.answerCbQuery('❌ Заявка не найдена', { show_alert: true });
    }

    if (req.status !== 'pending') {
      return ctx.answerCbQuery('⚠️ Заявка уже обработана', { show_alert: true });
    }

    // Списываем остаток
    const newQty = Math.max(0, req.items.quantity - req.quantity);
    await supabase
      .from('items')
      .update({ quantity: newQty, updated_at: new Date().toISOString() })
      .eq('id', req.item_id);

    // Обновляем статус
    await supabase
      .from('breakage_requests')
      .update({
        status: 'accepted',
        admin_tg_id: ctx.from.id,
      })
      .eq('id', reqId);

    await ctx.answerCbQuery();

    // Правим кнопки в группе
    const adminName = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ');
    const escapedAdmin = escMd(adminName);
    const msg = ctx.callbackQuery.message;
    try {
      if (msg?.photo) {
        await ctx.editMessageCaption(
          msg.caption + `\n\n✅ *Принята* администратором ${escapedAdmin}`,
          { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [] } }
        );
      } else if (msg?.text) {
        await ctx.editMessageText(
          msg.text + `\n\n✅ *Принята* администратором ${escapedAdmin}`,
          { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [] } }
        );
      } else {
        await ctx.reply(`✅ Заявка #${reqId} принята администратором ${adminName}`);
      }
    } catch (e) {
      console.error('[accept] edit message error:', e.message);
      await ctx.reply(`✅ Заявка #${reqId} принята администратором ${adminName}`).catch(() => {});
    }
  });

  // ── Отклонить заявку ────────────────────────────────────────────
  bot.action(/^reject_(\d+)$/, async (ctx) => {
    const reqId = parseInt(ctx.match[1]);

    const { data: req } = await supabase
      .from('breakage_requests')
      .select('status')
      .eq('id', reqId)
      .single();

    if (!req) {
      return ctx.answerCbQuery('❌ Заявка не найдена', { show_alert: true });
    }

    if (req.status !== 'pending') {
      return ctx.answerCbQuery('⚠️ Заявка уже обработана', { show_alert: true });
    }

    await supabase
      .from('breakage_requests')
      .update({
        status: 'rejected',
        admin_tg_id: ctx.from.id,
      })
      .eq('id', reqId);

    await ctx.answerCbQuery();

    const adminName = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ');
    const escapedAdmin = escMd(adminName);
    const msg = ctx.callbackQuery.message;
    try {
      if (msg?.photo) {
        await ctx.editMessageCaption(
          msg.caption + `\n\n❌ *Отклонена* администратором ${escapedAdmin}`,
          { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [] } }
        );
      } else if (msg?.text) {
        await ctx.editMessageText(
          msg.text + `\n\n❌ *Отклонена* администратором ${escapedAdmin}`,
          { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [] } }
        );
      } else {
        await ctx.reply(`❌ Заявка #${reqId} отклонена администратором ${adminName}`);
      }
    } catch (e) {
      console.error('[reject] edit message error:', e.message);
      await ctx.reply(`❌ Заявка #${reqId} отклонена администратором ${adminName}`).catch(() => {});
    }
  });
}

module.exports = setupBreakageCallbacks;
