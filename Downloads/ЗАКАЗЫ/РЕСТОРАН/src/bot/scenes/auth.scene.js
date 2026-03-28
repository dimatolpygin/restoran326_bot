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

  // Если ждём имя/фамилию от нового пользователя
  if (ctx.scene.state.waitingName) {
    const tgName = input;
    const { tgId, username } = ctx.scene.state;

    await supabase.from('bot_users').upsert(
      {
        tg_id: tgId,
        tg_username: username || null,
        tg_name: tgName,
        is_active: true,
      },
      { onConflict: 'tg_id' }
    );

    await ctx.reply('✅ Регистрация завершена!');
    await ctx.scene.leave();
    return ctx.scene.enter('catalog_warehouse');
  }

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

  const { id: tgId, username } = ctx.from;

  // Проверяем, существует ли пользователь
  const { data: existingUser } = await supabase
    .from('bot_users')
    .select('tg_id')
    .eq('tg_id', tgId)
    .single();

  if (!existingUser) {
    // Новый пользователь — запрашиваем имя и фамилию
    ctx.scene.state.waitingName = true;
    ctx.scene.state.tgId = tgId;
    ctx.scene.state.username = username;
    return ctx.reply('✅ Пароль верный!\n\nВведите ваше имя и фамилию (например: Иван Иванов):');
  }

  // Существующий пользователь — обновляем username и активность
  await supabase.from('bot_users').upsert(
    {
      tg_id: tgId,
      tg_username: username || null,
      is_active: true,
    },
    { onConflict: 'tg_id' }
  );

  await ctx.reply('✅ Авторизация успешна!');
  await ctx.scene.leave();
  return ctx.scene.enter('catalog_warehouse');
});

module.exports = authScene;
