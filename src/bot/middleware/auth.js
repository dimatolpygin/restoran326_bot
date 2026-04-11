const supabase = require('../../lib/supabase');

/**
 * Middleware: проверяет авторизацию пользователя.
 * Если не авторизован или деактивирован — переводит в сцену auth.
 */
async function authMiddleware(ctx, next) {
  // Пропускаем служебные апдейты без пользователя
  if (!ctx.from) return next();

  // Для inline-кнопок из группы администраторов (accept/reject) — пропускаем
  const data = ctx.callbackQuery?.data || '';
  if (data.startsWith('accept_') || data.startsWith('reject_')) {
    return next();
  }

  const tgId = ctx.from.id;

  const { data: user, error } = await supabase
    .from('bot_users')
    .select('is_active')
    .eq('tg_id', tgId)
    .single();

  // Сетевая ошибка (не "not found") — пропускаем, не гоним на авторизацию
  if (error && error.code !== 'PGRST116') {
    console.error('[auth] Supabase error, skipping auth check:', error.message);
    return next();
  }

  if (!user || !user.is_active) {
    return ctx.scene.enter('auth');
  }

  return next();
}

module.exports = authMiddleware;
