const { Scenes, Markup } = require('telegraf');
const bcrypt = require('bcrypt');
const supabase = require('../../lib/supabase');

const authScene = new Scenes.BaseScene('auth');

authScene.enter(async (ctx) => {
  await ctx.reply(
    '🔐 Добро пожаловать!\n\nДля доступа к боту введите пароль:',
    Markup.removeKeyboard()
  );
});

authScene.on('text', async (ctx) => {
  const input = ctx.message.text.trim();

  const { data: setting, error } = await supabase
    .from('bot_settings')
    .select('value')
    .eq('key', 'bot_password')
    .single();

  if (error || !setting) {
    return ctx.reply('⚠️ Ошибка конфигурации. Обратитесь к администратору.');
  }

  const isValid = await bcrypt.compare(input, setting.value);

  if (!isValid) {
    return ctx.reply('❌ Неверный пароль. Попробуйте снова:');
  }

  // Сохраняем пользователя
  const { id: tgId, username, first_name, last_name } = ctx.from;
  const tgName = [first_name, last_name].filter(Boolean).join(' ');

  await supabase.from('bot_users').upsert(
    {
      tg_id: tgId,
      tg_username: username || null,
      tg_name: tgName,
      is_active: true,
    },
    { onConflict: 'tg_id' }
  );

  await ctx.reply('✅ Авторизация успешна!');
  await ctx.scene.leave();

  // Отправляем в каталог
  return ctx.scene.enter('catalog_warehouse');
});

module.exports = authScene;
