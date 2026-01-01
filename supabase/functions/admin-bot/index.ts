import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ADMIN_BOT_TOKEN = Deno.env.get('ADMIN_BOT_TOKEN')!;
const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!;
const TELEGRAM_ADMIN_CHAT_ID = Deno.env.get('TELEGRAM_ADMIN_CHAT_ID')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const USERS_PER_PAGE = 20;
const ARTICLES_PER_PAGE = 10;

// Send message via Admin Bot
async function sendAdminMessage(chatId: string | number, text: string, options: any = {}) {
  const url = `https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/sendMessage`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      ...options,
    }),
  });
  
  return response.json();
}

// Edit message
async function editAdminMessage(chatId: string | number, messageId: number, text: string, options: any = {}) {
  const url = `https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/editMessageText`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: 'HTML',
      ...options,
    }),
  });
  
  return response.json();
}

// Send message to user via User Bot
async function sendUserMessage(chatId: string | number, text: string) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    }),
  });
  
  return response.json();
}

async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  const url = `https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/answerCallbackQuery`;
  
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text,
    }),
  });
}

async function editMessageReplyMarkup(chatId: string | number, messageId: number) {
  const url = `https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/editMessageReplyMarkup`;
  
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      reply_markup: { inline_keyboard: [] },
    }),
  });
}

async function deleteMessage(chatId: string | number, messageId: number) {
  const url = `https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/deleteMessage`;
  
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
    }),
  });
}

// Check if user is admin
function isAdmin(userId: number): boolean {
  return userId.toString() === TELEGRAM_ADMIN_CHAT_ID;
}

// Handle /start command
async function handleStart(chatId: number, userId: number) {
  if (!isAdmin(userId)) {
    await sendAdminMessage(chatId, '⛔ Доступ запрещён. Этот бот только для администраторов.');
    return;
  }

  const welcomeMessage = `🔐 <b>ManHub Admin Bot</b>

Добро пожаловать в админ-панель!

<b>Доступные команды:</b>

📊 /stats — Статистика проекта
👥 /users — Список пользователей
🔗 /ref — Управление рефералами
👑 /premium — Управление подписками
💰 /prices — Управление ценами тарифов
🎟 /pr — Управление промокодами
📝 /pending — Статьи на модерации
📰 /st — Список статей
📦 /product — Продукты на модерации
🚨 /zb — Жалобы на статьи
👤 /user_reports — Жалобы на пользователей
⭐ /otz — Отзывы пользователей
❓ /questions — Вопросы в поддержку
📢 /broadcast — Рассылка всем пользователям
🎙 /podc — Управление подкастами
🎵 /pl — Управление плейлистами
👋 /hi — Настройка приветственного сообщения
❓ /help — Справка

<b>Управление подписками:</b>
/plus [telegram_id] [дней] — Выдать Plus подписку
/prem [telegram_id] [дней] — Выдать Premium подписку
/extend [telegram_id] [дней] — Продлить подписку

<b>Управление ценами:</b>
/set_price [plus|premium] [monthly|yearly] [цена] — Установить цену
/set_discount [процент] — Установить скидку

<b>Промокоды:</b>
/pr — Список промокодов
/pr_add [КОД] [скидка%] — Создать промокод

<b>Поиск:</b>
/search_st [запрос] — Поиск статей по заголовку
/search_product [код] — Поиск продукта по коду

<i>Уведомления о новых статьях и вопросах приходят автоматически.</i>`;

  await sendAdminMessage(chatId, welcomeMessage);
}

// Handle /stats command
async function handleStats(chatId: number, userId: number) {
  if (!isAdmin(userId)) return;

  console.log('Fetching stats...');

  // Get user count
  const { count: userCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  // Get premium user count
  const { count: premiumCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('is_premium', true);

  // Get blocked user count
  const { count: blockedCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('is_blocked', true);

  // Get article counts by status
  const { data: articles } = await supabase
    .from('articles')
    .select('status');

  const stats = {
    total: articles?.length || 0,
    pending: articles?.filter(a => a.status === 'pending').length || 0,
    approved: articles?.filter(a => a.status === 'approved').length || 0,
    rejected: articles?.filter(a => a.status === 'rejected').length || 0,
  };

  const message = `📊 <b>Статистика ManHub</b>

👥 <b>Пользователей:</b> ${userCount || 0}
👑 <b>Premium:</b> ${premiumCount || 0}
🚫 <b>Заблокировано:</b> ${blockedCount || 0}

📝 <b>Статьи:</b>
├ Всего: ${stats.total}
├ ⏳ На модерации: ${stats.pending}
├ ✅ Опубликовано: ${stats.approved}
└ ❌ Отклонено: ${stats.rejected}`;

  const keyboard = {
    inline_keyboard: [
      [{ text: '👥 Открыть список пользователей', callback_data: 'users:0' }],
      [{ text: '📰 Открыть список статей', callback_data: 'articles:0' }],
    ],
  };

  await sendAdminMessage(chatId, message, { reply_markup: keyboard });
}

// Handle /users command - list users with pagination
async function handleUsers(chatId: number, userId: number, page: number = 0, messageId?: number) {
  if (!isAdmin(userId)) return;

  const from = page * USERS_PER_PAGE;
  
  // Get total count
  const { count: totalCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  // Get users for current page
  const { data: users, error } = await supabase
    .from('profiles')
    .select('id, telegram_id, username, first_name, last_name, is_premium, is_blocked, reputation, created_at')
    .order('created_at', { ascending: false })
    .range(from, from + USERS_PER_PAGE - 1);

  if (error) {
    console.error('Error fetching users:', error);
    await sendAdminMessage(chatId, '❌ Ошибка при загрузке пользователей');
    return;
  }

  const totalPages = Math.ceil((totalCount || 0) / USERS_PER_PAGE);

  let message = `👥 <b>Пользователи</b> (${totalCount || 0})\n`;
  message += `📄 Страница ${page + 1}/${totalPages || 1}\n\n`;

  if (!users || users.length === 0) {
    message += '<i>Пользователей нет</i>';
  } else {
    for (const user of users) {
      const premium = user.is_premium ? '👑' : '';
      const blocked = user.is_blocked ? '🚫' : '';
      const username = user.username ? `@${user.username}` : `ID:${user.telegram_id}`;
      message += `${premium}${blocked} <b>${username}</b>\n`;
      message += `   🆔 ${user.telegram_id || 'N/A'} | ⭐ ${user.reputation || 0}\n`;
    }
  }

  message += `\n🔍 Для поиска: <code>/search username</code> или <code>/search ID</code>`;

  // Create user buttons for quick actions
  const userButtons: any[][] = [];
  if (users) {
    for (const user of users) {
      const label = user.username ? `@${user.username}` : `${user.telegram_id}`;
      userButtons.push([{ text: `👤 ${label}`, callback_data: `user:${user.telegram_id}` }]);
    }
  }

  // Pagination buttons (всегда 2 кнопки, чтобы сообщение "перелистывалось")
  const prevPage = page > 0 ? page - 1 : page;
  const nextPage = page < totalPages - 1 ? page + 1 : page;

  const navRow = [
    { text: '⬅️ Назад', callback_data: `users:${prevPage}` },
    { text: 'Вперёд ➡️', callback_data: `users:${nextPage}` },
  ];

  const keyboard = {
    inline_keyboard: [...userButtons, navRow],
  };

  if (messageId) {
    await editAdminMessage(chatId, messageId, message, { reply_markup: keyboard });
  } else {
    await sendAdminMessage(chatId, message, { reply_markup: keyboard });
  }
}

// Handle user profile view
async function handleUserProfile(callbackQuery: any, telegramId: string) {
  const { id, message, from } = callbackQuery;

  const { data: user, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('telegram_id', telegramId)
    .maybeSingle();

  if (error || !user) {
    await answerCallbackQuery(id, '❌ Пользователь не найден');
    return;
  }

  const tier = user.subscription_tier || 'free';
  const tierLabel = tier === 'premium' ? '🟣 Premium' : tier === 'plus' ? '🔵 Plus' : '👤 Free';
  const blocked = user.is_blocked ? '\n🚫 <b>ЗАБЛОКИРОВАН</b>' : '';
  const premiumExpiry = user.premium_expires_at 
    ? `\n📅 Подписка до: ${new Date(user.premium_expires_at).toLocaleDateString('ru-RU')}`
    : '';

  // Check if user has a product
  const { data: products } = await supabase
    .from('user_products')
    .select('id, title, status, short_code')
    .eq('user_profile_id', user.id)
    .limit(1);
  
  const hasProduct = products && products.length > 0;
  const productInfo = hasProduct 
    ? `\n📦 <b>Продукт:</b> ✅ ${products[0].title} (${products[0].status === 'approved' ? '✅' : products[0].status === 'pending' ? '⏳' : '❌'})\n🏷 <b>Код:</b> <code>${products[0].short_code || 'N/A'}</code>`
    : '\n📦 <b>Продукт:</b> ❌ Нет';

  // Get referral info
  const { count: referralCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('referred_by', user.id);

  const botUsername = getBotUsername();
  const referralLink = user.referral_code 
    ? `https://t.me/${botUsername}?start=ref_${user.referral_code}`
    : 'Не создана';

  const referralInfo = `
🔗 <b>Реферальная система:</b>
├ 👥 Приглашено: ${referralCount || 0}
├ 💰 Заработано: ${user.referral_earnings || 0} ₽
└ 🔗 Ссылка: <code>${referralLink}</code>`;

  const profileMessage = `👤 <b>Профиль пользователя</b>${blocked}

📛 <b>Имя:</b> ${user.first_name || ''} ${user.last_name || ''}
🔗 <b>Username:</b> ${user.username ? `@${user.username}` : 'Не указан'}
🆔 <b>Telegram ID:</b> ${user.telegram_id}
⭐ <b>Репутация:</b> ${user.reputation || 0}
📊 <b>Подписка:</b> ${tierLabel}${premiumExpiry}${productInfo}${referralInfo}
📅 <b>Регистрация:</b> ${new Date(user.created_at).toLocaleDateString('ru-RU')}`;

  // Build action buttons
  const buttons: any[][] = [];
  
  // Subscription buttons based on current tier
  if (tier === 'premium') {
    buttons.push([
      { text: '⬇️ Понизить до Plus', callback_data: `sub_downgrade_plus:${user.telegram_id}` },
      { text: '❌ Забрать подписку', callback_data: `sub_revoke:${user.telegram_id}` }
    ]);
    buttons.push([{ text: '📅 Продлить на 30 дней', callback_data: `sub_extend:${user.telegram_id}:30` }]);
  } else if (tier === 'plus') {
    buttons.push([
      { text: '⬆️ Повысить до Premium', callback_data: `sub_upgrade_premium:${user.telegram_id}` },
      { text: '❌ Забрать подписку', callback_data: `sub_revoke:${user.telegram_id}` }
    ]);
    buttons.push([{ text: '📅 Продлить на 30 дней', callback_data: `sub_extend:${user.telegram_id}:30` }]);
  } else {
    buttons.push([
      { text: '🔵 Выдать Plus (30д)', callback_data: `sub_grant_plus:${user.telegram_id}` },
      { text: '🟣 Выдать Premium (30д)', callback_data: `sub_grant_premium:${user.telegram_id}` }
    ]);
  }

  // Referral management buttons
  buttons.push([
    { text: '💰 +Баланс', callback_data: `ref_add_balance:${user.telegram_id}` },
    { text: '🗑 Обнулить баланс', callback_data: `ref_reset_balance:${user.telegram_id}` }
  ]);
  buttons.push([{ text: '🔄 Обнулить рефералов', callback_data: `ref_reset_referrals:${user.telegram_id}` }]);

  // Block/unblock buttons
  if (user.is_blocked) {
    buttons.push([{ text: '✅ Разблокировать', callback_data: `unblock:${user.telegram_id}` }]);
  } else {
    buttons.push([
      { text: '🚫 Блок навсегда', callback_data: `block:${user.telegram_id}` },
      { text: '⏱ Блок временно', callback_data: `block_temp_menu:${user.telegram_id}` }
    ]);
  }

  buttons.push([{ text: '◀️ Назад к списку', callback_data: 'users:0' }]);

  const keyboard = { inline_keyboard: buttons };

  await answerCallbackQuery(id);
  await editAdminMessage(message.chat.id, message.message_id, profileMessage, { reply_markup: keyboard });
}

// Handle /search command
async function handleSearch(chatId: number, userId: number, query: string) {
  if (!isAdmin(userId)) return;

  if (!query) {
    await sendAdminMessage(chatId, `🔍 <b>Поиск пользователей</b>

Используйте:
<code>/search username</code> — поиск по юзернейму
<code>/search 123456789</code> — поиск по Telegram ID`);
    return;
  }

  // Clean query - remove @ if present
  const cleanQuery = query.replace('@', '').trim();

  // Try to find by telegram_id or username
  let users;
  const isNumeric = /^\d+$/.test(cleanQuery);

  if (isNumeric) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('telegram_id', cleanQuery);
    users = data;
  } else {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .ilike('username', `%${cleanQuery}%`);
    users = data;
  }

  if (!users || users.length === 0) {
    await sendAdminMessage(chatId, `🔍 Пользователь "<b>${query}</b>" не найден`);
    return;
  }

  for (const user of users) {
    const premium = user.is_premium ? '👑 Premium' : '👤 Обычный';
    const blocked = user.is_blocked ? '\n🚫 <b>ЗАБЛОКИРОВАН</b>' : '';
    const premiumExpiry = user.premium_expires_at 
      ? `\n📅 Premium до: ${new Date(user.premium_expires_at).toLocaleDateString('ru-RU')}`
      : '';

    // Check if user has a product
    const { data: products } = await supabase
      .from('user_products')
      .select('id, title, status, short_code')
      .eq('user_profile_id', user.id)
      .limit(1);
    
    const hasProduct = products && products.length > 0;
    const productInfo = hasProduct 
      ? `\n📦 <b>Продукт:</b> ✅ ${products[0].title} (${products[0].status === 'approved' ? '✅' : products[0].status === 'pending' ? '⏳' : '❌'})\n🏷 <b>Код:</b> <code>${products[0].short_code || 'N/A'}</code>`
      : '\n📦 <b>Продукт:</b> ❌ Нет';

    const message = `👤 <b>Профиль пользователя</b>${blocked}

📛 <b>Имя:</b> ${user.first_name || ''} ${user.last_name || ''}
🔗 <b>Username:</b> ${user.username ? `@${user.username}` : 'Не указан'}
🆔 <b>Telegram ID:</b> ${user.telegram_id}
⭐ <b>Репутация:</b> ${user.reputation || 0}
📊 <b>Статус:</b> ${premium}${premiumExpiry}${productInfo}
📅 <b>Регистрация:</b> ${new Date(user.created_at).toLocaleDateString('ru-RU')}`;

    // Build action buttons
    const buttons: any[][] = [];
    
    if (user.is_premium) {
      buttons.push([{ text: '❌ Забрать Premium', callback_data: `premium_revoke:${user.telegram_id}` }]);
      buttons.push([{ text: '📅 Продлить на 30 дней', callback_data: `premium_extend:${user.telegram_id}:30` }]);
    } else {
      buttons.push([{ text: '👑 Выдать Premium (30 дней)', callback_data: `premium_grant:${user.telegram_id}` }]);
    }

    if (user.is_blocked) {
      buttons.push([{ text: '✅ Разблокировать', callback_data: `unblock:${user.telegram_id}` }]);
    } else {
      buttons.push([
        { text: '🚫 Блок навсегда', callback_data: `block:${user.telegram_id}` },
        { text: '⏱ Блок временно', callback_data: `block_temp_menu:${user.telegram_id}` }
      ]);
    }

    const keyboard = { inline_keyboard: buttons };

    await sendAdminMessage(chatId, message, { reply_markup: keyboard });
  }
}

// Handle /search_product command - search product by short code
async function handleSearchProduct(chatId: number, userId: number, query: string) {
  if (!isAdmin(userId)) return;

  if (!query) {
    await sendAdminMessage(chatId, `🔍 <b>Поиск продукта</b>

Используйте:
<code>/search_product КОД</code> — поиск по уникальному коду продукта

Пример:
<code>/search_product AB12CD34</code>`);
    return;
  }

  const cleanQuery = query.trim().toUpperCase();

  const { data: product, error } = await supabase
    .from('user_products')
    .select(`
      *,
      user:user_profile_id(telegram_id, username, first_name)
    `)
    .eq('short_code', cleanQuery)
    .maybeSingle();

  if (error || !product) {
    await sendAdminMessage(chatId, `🔍 Продукт с кодом "<b>${query}</b>" не найден`);
    return;
  }

  const user = product.user as any;
  const statusIcon = product.status === 'pending' ? '⏳' : product.status === 'approved' ? '✅' : '❌';
  const statusText = product.status === 'pending' ? 'На модерации' : product.status === 'approved' ? 'Одобрен' : 'Отклонён';
  const userDisplay = user?.username ? '@' + user.username : user?.first_name || `ID:${user?.telegram_id}`;

  const message = `📦 <b>Продукт</b>

🏷 <b>Код:</b> <code>${product.short_code}</code>
📛 <b>Название:</b> ${product.title}
💰 <b>Цена:</b> ${product.price} ${product.currency}

📝 <b>Описание:</b>
${product.description?.substring(0, 300) || 'Нет описания'}${product.description?.length > 300 ? '...' : ''}

${product.media_url ? `🎬 <b>Медиа:</b> ${product.media_url}` : ''}
${product.link ? `🔗 <b>Ссылка:</b> ${product.link}` : ''}

👤 <b>Владелец:</b> ${userDisplay}
${statusIcon} <b>Статус:</b> ${statusText}
${product.rejection_reason ? `❌ <b>Причина отклонения:</b> ${product.rejection_reason}` : ''}
📅 <b>Создан:</b> ${new Date(product.created_at).toLocaleDateString('ru-RU')}`;

  const buttons: any[][] = [];
  
  if (product.status === 'pending') {
    buttons.push([
      { text: '✅ Одобрить', callback_data: `product_approve:${product.id}` },
      { text: '❌ Отклонить', callback_data: `product_reject:${product.id}` },
    ]);
  }
  
  // Always add delete button
  buttons.push([{ text: '🗑 Удалить продукт', callback_data: `product_delete:${product.id}` }]);

  const keyboard = { inline_keyboard: buttons };

  await sendAdminMessage(chatId, message, { reply_markup: keyboard });
}

// Handle /premium command
async function handlePremium(chatId: number, userId: number) {
  if (!isAdmin(userId)) return;

  // Get counts by subscription tier
  const { count: plusCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('subscription_tier', 'plus');

  const { count: premiumCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('subscription_tier', 'premium');

  const { data: subUsers } = await supabase
    .from('profiles')
    .select('telegram_id, username, first_name, subscription_tier, premium_expires_at')
    .in('subscription_tier', ['plus', 'premium'])
    .order('premium_expires_at', { ascending: true })
    .limit(15);

  let message = `👑 <b>Управление подписками</b>

📊 <b>Статистика:</b>
├ Plus: ${plusCount || 0}
└ Premium: ${premiumCount || 0}

<b>Типы подписок:</b>

🔵 <b>Plus</b> — Безлимит публикаций, ИИ ассистент, био до 100 символов
🟣 <b>Premium</b> — Всё из Plus + продажа своих продуктов, соц сети в профиле

<b>Команды:</b>
• /plus [telegram_id] [дней] — выдать Plus
• /prem [telegram_id] [дней] — выдать Premium
• /extend [telegram_id] [дней] — продлить текущую подписку
• /search [username/ID] — найти пользователя

<b>Подписчики:</b>\n`;

  if (subUsers && subUsers.length > 0) {
    for (const user of subUsers) {
      const username = user.username ? `@${user.username}` : `ID:${user.telegram_id}`;
      const expiry = user.premium_expires_at 
        ? new Date(user.premium_expires_at).toLocaleDateString('ru-RU')
        : '∞';
      const tierIcon = user.subscription_tier === 'premium' ? '🟣' : '🔵';
      const tierName = user.subscription_tier === 'premium' ? 'Premium' : 'Plus';
      message += `\n${tierIcon} <b>${username}</b> (${tierName})\n   📅 До: ${expiry}\n`;
    }
  } else {
    message += '\n<i>Пока нет подписчиков</i>';
  }

  await sendAdminMessage(chatId, message);
}

// Handle premium grant
async function handlePremiumGrant(callbackQuery: any, telegramId: string) {
  const { id, message } = callbackQuery;

  console.log('Granting premium to telegram_id:', telegramId);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  // Find profile first
  const { data: profile, error: findError } = await supabase
    .from('profiles')
    .select('id, telegram_id, username')
    .eq('telegram_id', telegramId)
    .maybeSingle();

  if (findError || !profile) {
    console.error('Error finding profile:', findError);
    await answerCallbackQuery(id, '❌ Пользователь не найден');
    return;
  }

  console.log('Found profile:', profile.id, 'updating premium...');

  const { error } = await supabase
    .from('profiles')
    .update({ 
      is_premium: true,
      premium_expires_at: expiresAt.toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', profile.id);

  if (error) {
    console.error('Error granting premium:', error);
    await answerCallbackQuery(id, '❌ Ошибка при обновлении');
    return;
  }

  console.log('Premium granted successfully');

  // Notify user
  await sendUserMessage(telegramId, `🎉 <b>Поздравляем!</b>

Вам выдана Premium подписка на 30 дней!

Теперь вам доступны:
👑 Продажа продуктов через профиль
📱 Соц сети в профиле  
🤖 ИИ ассистент
📚 Премиум материалы
♾ Безлимит публикаций
✨ PRO значок

Подписка активна до: ${expiresAt.toLocaleDateString('ru-RU')}`);

  await answerCallbackQuery(id, '✅ Premium выдан');
  await editMessageReplyMarkup(message.chat.id, message.message_id);
  
  const username = profile.username ? `@${profile.username}` : telegramId;
  await sendAdminMessage(message.chat.id, `✅ Premium выдан пользователю ${username} до ${expiresAt.toLocaleDateString('ru-RU')}`);
}

// Handle premium revoke
async function handlePremiumRevoke(callbackQuery: any, telegramId: string) {
  const { id, message } = callbackQuery;

  console.log('Revoking premium from telegram_id:', telegramId);

  const { data: profile, error: findError } = await supabase
    .from('profiles')
    .select('id, username')
    .eq('telegram_id', telegramId)
    .maybeSingle();

  if (findError || !profile) {
    console.error('Error finding profile:', findError);
    await answerCallbackQuery(id, '❌ Пользователь не найден');
    return;
  }

  const { error } = await supabase
    .from('profiles')
    .update({ 
      is_premium: false,
      premium_expires_at: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', profile.id);

  if (error) {
    console.error('Error revoking premium:', error);
    await answerCallbackQuery(id, '❌ Ошибка');
    return;
  }

  // Notify user
  await sendUserMessage(telegramId, `ℹ️ <b>Уведомление</b>

Ваша Premium подписка была отменена.

Вы можете приобрести её снова в приложении ManHub.`);

  await answerCallbackQuery(id, '✅ Premium отозван');
  await editMessageReplyMarkup(message.chat.id, message.message_id);
  
  const username = profile.username ? `@${profile.username}` : telegramId;
  await sendAdminMessage(message.chat.id, `❌ Premium отозван у пользователя ${username}`);
}

// Handle premium extend with custom days
async function handlePremiumExtend(callbackQuery: any, telegramId: string, days: number = 30) {
  const { id, message } = callbackQuery;

  console.log('Extending premium for telegram_id:', telegramId, 'days:', days);

  const { data: profile, error: findError } = await supabase
    .from('profiles')
    .select('id, premium_expires_at, is_premium, username')
    .eq('telegram_id', telegramId)
    .maybeSingle();

  if (findError || !profile) {
    console.error('Error finding profile:', findError);
    await answerCallbackQuery(id, '❌ Пользователь не найден');
    return;
  }

  let newExpiry: Date;
  if (profile.premium_expires_at && new Date(profile.premium_expires_at) > new Date()) {
    newExpiry = new Date(profile.premium_expires_at);
  } else {
    newExpiry = new Date();
  }
  newExpiry.setDate(newExpiry.getDate() + days);

  const { error } = await supabase
    .from('profiles')
    .update({ 
      is_premium: true,
      premium_expires_at: newExpiry.toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', profile.id);

  if (error) {
    console.error('Error extending premium:', error);
    await answerCallbackQuery(id, '❌ Ошибка');
    return;
  }

  // Notify user
  await sendUserMessage(telegramId, `🎉 <b>Premium продлён!</b>

Ваша подписка продлена на ${days} дней.
Новая дата окончания: ${newExpiry.toLocaleDateString('ru-RU')}`);

  await answerCallbackQuery(id, '✅ Premium продлён');
  await editMessageReplyMarkup(message.chat.id, message.message_id);
  
  const username = profile.username ? `@${profile.username}` : telegramId;
  await sendAdminMessage(message.chat.id, `✅ Premium продлён для ${username} на ${days} дней (до ${newExpiry.toLocaleDateString('ru-RU')})`);
}

// Handle /extend command - extend premium by custom days
async function handleExtendCommand(chatId: number, userId: number, args: string) {
  if (!isAdmin(userId)) return;

  const parts = args.trim().split(/\s+/);
  if (parts.length < 2) {
    await sendAdminMessage(chatId, `📅 <b>Продление Premium</b>

Используйте:
<code>/extend [telegram_id] [дней]</code>

Примеры:
<code>/extend 123456789 7</code> — продлить на 7 дней
<code>/extend 123456789 90</code> — продлить на 90 дней`);
    return;
  }

  const telegramId = parts[0];
  const days = parseInt(parts[1]);

  if (isNaN(days) || days <= 0 || days > 365) {
    await sendAdminMessage(chatId, '❌ Укажите количество дней от 1 до 365');
    return;
  }

  const { data: profile, error: findError } = await supabase
    .from('profiles')
    .select('id, premium_expires_at, is_premium, username')
    .eq('telegram_id', telegramId)
    .maybeSingle();

  if (findError || !profile) {
    await sendAdminMessage(chatId, `❌ Пользователь с ID ${telegramId} не найден`);
    return;
  }

  let newExpiry: Date;
  if (profile.premium_expires_at && new Date(profile.premium_expires_at) > new Date()) {
    newExpiry = new Date(profile.premium_expires_at);
  } else {
    newExpiry = new Date();
  }
  newExpiry.setDate(newExpiry.getDate() + days);

  const { error } = await supabase
    .from('profiles')
    .update({ 
      is_premium: true,
      premium_expires_at: newExpiry.toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', profile.id);

  if (error) {
    await sendAdminMessage(chatId, '❌ Ошибка при продлении');
    return;
  }

  await sendUserMessage(telegramId, `🎉 <b>Premium продлён!</b>

Ваша подписка продлена на ${days} дней.
Новая дата окончания: ${newExpiry.toLocaleDateString('ru-RU')}`);

  const username = profile.username ? `@${profile.username}` : telegramId;
  await sendAdminMessage(chatId, `✅ Premium продлён для ${username} на ${days} дней (до ${newExpiry.toLocaleDateString('ru-RU')})`);
}

// Handle /plus command - grant Plus subscription
async function handlePlusCommand(chatId: number, userId: number, args: string) {
  if (!isAdmin(userId)) return;

  const parts = args.trim().split(/\s+/);
  if (parts.length < 2) {
    await sendAdminMessage(chatId, `🔵 <b>Выдача Plus подписки</b>

Используйте:
<code>/plus [telegram_id] [дней]</code>

<b>Привилегии Plus:</b>
• ♾ Безлимитные публикации (без ограничения 3/день)
• 🤖 Доступ к ИИ ассистенту
• 📝 Описание профиля до 100 символов

Примеры:
<code>/plus 123456789 30</code> — на 30 дней
<code>/plus 123456789 90</code> — на 90 дней`);
    return;
  }

  const telegramId = parts[0];
  const days = parseInt(parts[1]);

  if (isNaN(days) || days <= 0 || days > 365) {
    await sendAdminMessage(chatId, '❌ Укажите количество дней от 1 до 365');
    return;
  }

  const { data: profile, error: findError } = await supabase
    .from('profiles')
    .select('id, premium_expires_at, subscription_tier, username')
    .eq('telegram_id', telegramId)
    .maybeSingle();

  if (findError || !profile) {
    await sendAdminMessage(chatId, `❌ Пользователь с ID ${telegramId} не найден`);
    return;
  }

  let newExpiry: Date;
  if (profile.premium_expires_at && new Date(profile.premium_expires_at) > new Date()) {
    newExpiry = new Date(profile.premium_expires_at);
  } else {
    newExpiry = new Date();
  }
  newExpiry.setDate(newExpiry.getDate() + days);

  const { error } = await supabase
    .from('profiles')
    .update({ 
      subscription_tier: 'plus',
      is_premium: true,
      premium_expires_at: newExpiry.toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', profile.id);

  if (error) {
    await sendAdminMessage(chatId, '❌ Ошибка при выдаче подписки');
    return;
  }

  await sendUserMessage(telegramId, `🎉 <b>Поздравляем!</b>

Вам выдана <b>Plus</b> подписка на ${days} дней!

<b>Теперь вам доступны:</b>
♾ Безлимитные публикации
🤖 ИИ ассистент
📝 Описание профиля (до 100 символов)

Подписка активна до: ${newExpiry.toLocaleDateString('ru-RU')}`);

  const username = profile.username ? `@${profile.username}` : telegramId;
  await sendAdminMessage(chatId, `✅ Plus подписка выдана пользователю ${username} на ${days} дней (до ${newExpiry.toLocaleDateString('ru-RU')})`);
}

// Handle /prem command - grant Premium subscription
async function handlePremCommand(chatId: number, userId: number, args: string) {
  if (!isAdmin(userId)) return;

  const parts = args.trim().split(/\s+/);
  if (parts.length < 2) {
    await sendAdminMessage(chatId, `🟣 <b>Выдача Premium подписки</b>

Используйте:
<code>/prem [telegram_id] [дней]</code>

<b>Привилегии Premium:</b>
• ♾ Безлимитные публикации
• 🤖 Доступ к ИИ ассистенту
• 📝 Описание профиля до 100 символов
• 👑 Продажа своих продуктов через профиль
• 📱 Соц сети в профиле
• ✨ PRO значок

Примеры:
<code>/prem 123456789 30</code> — на 30 дней
<code>/prem 123456789 90</code> — на 90 дней`);
    return;
  }

  const telegramId = parts[0];
  const days = parseInt(parts[1]);

  if (isNaN(days) || days <= 0 || days > 365) {
    await sendAdminMessage(chatId, '❌ Укажите количество дней от 1 до 365');
    return;
  }

  const { data: profile, error: findError } = await supabase
    .from('profiles')
    .select('id, premium_expires_at, subscription_tier, username')
    .eq('telegram_id', telegramId)
    .maybeSingle();

  if (findError || !profile) {
    await sendAdminMessage(chatId, `❌ Пользователь с ID ${telegramId} не найден`);
    return;
  }

  let newExpiry: Date;
  if (profile.premium_expires_at && new Date(profile.premium_expires_at) > new Date()) {
    newExpiry = new Date(profile.premium_expires_at);
  } else {
    newExpiry = new Date();
  }
  newExpiry.setDate(newExpiry.getDate() + days);

  const { error } = await supabase
    .from('profiles')
    .update({ 
      subscription_tier: 'premium',
      is_premium: true,
      premium_expires_at: newExpiry.toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', profile.id);

  if (error) {
    await sendAdminMessage(chatId, '❌ Ошибка при выдаче подписки');
    return;
  }

  await sendUserMessage(telegramId, `🎉 <b>Поздравляем!</b>

Вам выдана <b>Premium</b> подписка на ${days} дней!

<b>Теперь вам доступны:</b>
👑 Продажа продуктов через профиль
📱 Соц сети в профиле
🤖 ИИ ассистент
📝 Описание профиля (до 100 символов)
♾ Безлимит публикаций
✨ PRO значок

Подписка активна до: ${newExpiry.toLocaleDateString('ru-RU')}`);

  const username = profile.username ? `@${profile.username}` : telegramId;
  await sendAdminMessage(chatId, `✅ Premium подписка выдана пользователю ${username} на ${days} дней (до ${newExpiry.toLocaleDateString('ru-RU')})`);
}

// Handle /prices command - show current pricing
async function handlePrices(chatId: number, userId: number) {
  if (!isAdmin(userId)) return;

  const { data: pricing, error } = await supabase
    .from('subscription_pricing')
    .select('*')
    .order('tier');

  if (error || !pricing) {
    await sendAdminMessage(chatId, '❌ Ошибка при загрузке цен');
    return;
  }

  const plusData = pricing.find(p => p.tier === 'plus');
  const premiumData = pricing.find(p => p.tier === 'premium');

  const message = `💰 <b>Управление ценами тарифов</b>

🔵 <b>Plus:</b>
├ Месяц: ${plusData?.monthly_price || 0}₽ (было ${plusData?.monthly_original_price || 0}₽)
└ Год: ${plusData?.yearly_price || 0}₽ (было ${plusData?.yearly_original_price || 0}₽)

🟣 <b>Premium:</b>
├ Месяц: ${premiumData?.monthly_price || 0}₽ (было ${premiumData?.monthly_original_price || 0}₽)
└ Год: ${premiumData?.yearly_price || 0}₽ (было ${premiumData?.yearly_original_price || 0}₽)

📊 <b>Скидка:</b> ${plusData?.discount_percent || 50}%
📅 <b>Скидка за год:</b> ${plusData?.yearly_discount_percent || 30}%

<b>Команды:</b>
• <code>/set_price plus monthly 299</code> — установить цену Plus/месяц
• <code>/set_price plus yearly 2990</code> — установить цену Plus/год
• <code>/set_price premium monthly 2490</code> — установить цену Premium/месяц
• <code>/set_price premium yearly 24900</code> — установить цену Premium/год
• <code>/set_orig_price plus monthly 598</code> — установить старую цену
• <code>/set_discount 50</code> — установить скидку (%)
• <code>/set_yearly_discount 30</code> — установить годовую скидку (%)`;

  await sendAdminMessage(chatId, message);
}

// Handle /set_price command
async function handleSetPrice(chatId: number, userId: number, args: string) {
  if (!isAdmin(userId)) return;

  const parts = args.trim().split(/\s+/);
  if (parts.length < 3) {
    await sendAdminMessage(chatId, `💰 <b>Установка цены</b>

Используйте:
<code>/set_price [plus|premium] [monthly|yearly] [цена]</code>

Примеры:
<code>/set_price plus monthly 299</code>
<code>/set_price premium yearly 24900</code>`);
    return;
  }

  const tier = parts[0].toLowerCase();
  const period = parts[1].toLowerCase();
  const price = parseInt(parts[2]);

  if (!['plus', 'premium'].includes(tier)) {
    await sendAdminMessage(chatId, '❌ Тариф должен быть plus или premium');
    return;
  }

  if (!['monthly', 'yearly'].includes(period)) {
    await sendAdminMessage(chatId, '❌ Период должен быть monthly или yearly');
    return;
  }

  if (isNaN(price) || price < 0) {
    await sendAdminMessage(chatId, '❌ Цена должна быть положительным числом');
    return;
  }

  const column = period === 'monthly' ? 'monthly_price' : 'yearly_price';
  
  const { error } = await supabase
    .from('subscription_pricing')
    .update({ [column]: price, updated_at: new Date().toISOString() })
    .eq('tier', tier);

  if (error) {
    console.error('Error setting price:', error);
    await sendAdminMessage(chatId, '❌ Ошибка при обновлении цены');
    return;
  }

  const tierLabel = tier === 'plus' ? 'Plus' : 'Premium';
  const periodLabel = period === 'monthly' ? 'месяц' : 'год';
  await sendAdminMessage(chatId, `✅ Цена ${tierLabel} за ${periodLabel} установлена: ${price}₽`);
}

// Handle /set_orig_price command
async function handleSetOrigPrice(chatId: number, userId: number, args: string) {
  if (!isAdmin(userId)) return;

  const parts = args.trim().split(/\s+/);
  if (parts.length < 3) {
    await sendAdminMessage(chatId, `💰 <b>Установка старой цены</b>

Используйте:
<code>/set_orig_price [plus|premium] [monthly|yearly] [цена]</code>`);
    return;
  }

  const tier = parts[0].toLowerCase();
  const period = parts[1].toLowerCase();
  const price = parseInt(parts[2]);

  if (!['plus', 'premium'].includes(tier) || !['monthly', 'yearly'].includes(period) || isNaN(price) || price < 0) {
    await sendAdminMessage(chatId, '❌ Неверные параметры');
    return;
  }

  const column = period === 'monthly' ? 'monthly_original_price' : 'yearly_original_price';
  
  const { error } = await supabase
    .from('subscription_pricing')
    .update({ [column]: price, updated_at: new Date().toISOString() })
    .eq('tier', tier);

  if (error) {
    await sendAdminMessage(chatId, '❌ Ошибка при обновлении цены');
    return;
  }

  await sendAdminMessage(chatId, `✅ Старая цена ${tier} за ${period} установлена: ${price}₽`);
}

// Handle /set_discount command
async function handleSetDiscount(chatId: number, userId: number, args: string) {
  if (!isAdmin(userId)) return;

  const percent = parseInt(args.trim());
  if (isNaN(percent) || percent < 0 || percent > 100) {
    await sendAdminMessage(chatId, `📊 <b>Установка скидки</b>

Используйте:
<code>/set_discount [процент]</code>

Пример:
<code>/set_discount 50</code>`);
    return;
  }

  const { error } = await supabase
    .from('subscription_pricing')
    .update({ discount_percent: percent, updated_at: new Date().toISOString() })
    .neq('tier', '');

  if (error) {
    console.error('Error updating discount:', error);
    await sendAdminMessage(chatId, '❌ Ошибка при обновлении скидки');
    return;
  }

  await sendAdminMessage(chatId, `✅ Скидка установлена: ${percent}%`);
}

// Handle /set_yearly_discount command
async function handleSetYearlyDiscount(chatId: number, userId: number, args: string) {
  if (!isAdmin(userId)) return;

  const percent = parseInt(args.trim());
  if (isNaN(percent) || percent < 0 || percent > 100) {
    await sendAdminMessage(chatId, `📅 <b>Установка годовой скидки</b>

Используйте:
<code>/set_yearly_discount [процент]</code>

Пример:
<code>/set_yearly_discount 30</code>`);
    return;
  }

  const { error } = await supabase
    .from('subscription_pricing')
    .update({ yearly_discount_percent: percent, updated_at: new Date().toISOString() })
    .neq('tier', '');

  if (error) {
    console.error('Error updating yearly discount:', error);
    await sendAdminMessage(chatId, '❌ Ошибка при обновлении скидки');
    return;
  }

  await sendAdminMessage(chatId, `✅ Годовая скидка установлена: ${percent}%`);
}

// Handle /pr command - list promo codes
async function handlePromoCodes(chatId: number, userId: number) {
  if (!isAdmin(userId)) return;

  const { data: promoCodes, error } = await supabase
    .from('promo_codes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching promo codes:', error);
    await sendAdminMessage(chatId, '❌ Ошибка при загрузке промокодов');
    return;
  }

  if (!promoCodes || promoCodes.length === 0) {
    await sendAdminMessage(chatId, `🏷️ <b>Промокоды</b>

Активных промокодов нет.

<b>Создать новый:</b>
<code>/pr_add КОД скидка%</code>

Пример:
<code>/pr_add NEWYEAR 20</code>`);
    return;
  }

  let message = `🏷️ <b>Промокоды</b> (${promoCodes.length})\n\n`;

  for (const promo of promoCodes) {
    const status = promo.is_active ? '✅' : '❌';
    const expiryText = promo.expires_at 
      ? `до ${new Date(promo.expires_at).toLocaleDateString('ru-RU')}`
      : 'бессрочно';
    const usesText = promo.max_uses 
      ? `${promo.uses_count}/${promo.max_uses}`
      : `${promo.uses_count}/∞`;

    message += `${status} <code>${promo.code}</code> — ${promo.discount_percent}%
├ Использований: ${usesText}
└ ${expiryText}\n\n`;
  }

  message += `<b>Команды:</b>
• <code>/pr_add КОД скидка%</code> — создать
• <code>/pr_del КОД</code> — удалить
• <code>/pr_edit КОД скидка%</code> — изменить скидку
• <code>/pr_toggle КОД</code> — вкл/выкл`;

  const buttons = promoCodes.slice(0, 5).map(promo => ([
    { text: `❌ ${promo.code}`, callback_data: `pr_del:${promo.id}` },
    { text: promo.is_active ? '🔴 Выкл' : '🟢 Вкл', callback_data: `pr_toggle:${promo.id}` }
  ]));

  await sendAdminMessage(chatId, message, {
    reply_markup: buttons.length > 0 ? { inline_keyboard: buttons } : undefined
  });
}

// Handle /pr_add command - add new promo code
async function handleAddPromoCode(chatId: number, userId: number, args: string) {
  if (!isAdmin(userId)) return;

  const parts = args.trim().split(/\s+/);
  if (parts.length < 2) {
    await sendAdminMessage(chatId, `🏷️ <b>Создание промокода</b>

Используйте:
<code>/pr_add КОД скидка% [макс_использований] [дней_действия]</code>

Примеры:
<code>/pr_add NEWYEAR 20</code> — скидка 20%, без ограничений
<code>/pr_add SALE50 50 100</code> — 50%, макс 100 использований
<code>/pr_add FLASH30 30 50 7</code> — 30%, 50 использований, 7 дней`);
    return;
  }

  const code = parts[0].toUpperCase();
  const discount = parseInt(parts[1]);
  const maxUses = parts[2] ? parseInt(parts[2]) : null;
  const days = parts[3] ? parseInt(parts[3]) : null;

  if (isNaN(discount) || discount < 1 || discount > 100) {
    await sendAdminMessage(chatId, '❌ Скидка должна быть от 1 до 100%');
    return;
  }

  // Check if code already exists
  const { data: existing } = await supabase
    .from('promo_codes')
    .select('id')
    .eq('code', code)
    .maybeSingle();

  if (existing) {
    await sendAdminMessage(chatId, `❌ Промокод <code>${code}</code> уже существует`);
    return;
  }

  const expiresAt = days ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString() : null;

  const { error } = await supabase
    .from('promo_codes')
    .insert({
      code,
      discount_percent: discount,
      max_uses: maxUses,
      expires_at: expiresAt,
      is_active: true
    });

  if (error) {
    console.error('Error creating promo code:', error);
    await sendAdminMessage(chatId, '❌ Ошибка при создании промокода');
    return;
  }

  let msg = `✅ Промокод создан!\n\n<code>${code}</code> — ${discount}%`;
  if (maxUses) msg += `\nМакс. использований: ${maxUses}`;
  if (days) msg += `\nДействует: ${days} дней`;

  await sendAdminMessage(chatId, msg);
}

// Handle /pr_del command - delete promo code
async function handleDeletePromoCode(chatId: number, userId: number, args: string) {
  if (!isAdmin(userId)) return;

  const code = args.trim().toUpperCase();
  if (!code) {
    await sendAdminMessage(chatId, 'Используйте: <code>/pr_del КОД</code>');
    return;
  }

  const { error } = await supabase
    .from('promo_codes')
    .delete()
    .eq('code', code);

  if (error) {
    console.error('Error deleting promo code:', error);
    await sendAdminMessage(chatId, '❌ Ошибка при удалении');
    return;
  }

  await sendAdminMessage(chatId, `✅ Промокод <code>${code}</code> удалён`);
}

// Handle /pr_edit command - edit promo code discount
async function handleEditPromoCode(chatId: number, userId: number, args: string) {
  if (!isAdmin(userId)) return;

  const parts = args.trim().split(/\s+/);
  if (parts.length < 2) {
    await sendAdminMessage(chatId, 'Используйте: <code>/pr_edit КОД скидка%</code>');
    return;
  }

  const code = parts[0].toUpperCase();
  const discount = parseInt(parts[1]);

  if (isNaN(discount) || discount < 1 || discount > 100) {
    await sendAdminMessage(chatId, '❌ Скидка должна быть от 1 до 100%');
    return;
  }

  const { error } = await supabase
    .from('promo_codes')
    .update({ discount_percent: discount, updated_at: new Date().toISOString() })
    .eq('code', code);

  if (error) {
    console.error('Error updating promo code:', error);
    await sendAdminMessage(chatId, '❌ Ошибка при обновлении');
    return;
  }

  await sendAdminMessage(chatId, `✅ Скидка промокода <code>${code}</code> изменена на ${discount}%`);
}

// Handle /pr_toggle command - toggle promo code active state
async function handleTogglePromoCode(chatId: number, userId: number, args: string) {
  if (!isAdmin(userId)) return;

  const code = args.trim().toUpperCase();
  if (!code) {
    await sendAdminMessage(chatId, 'Используйте: <code>/pr_toggle КОД</code>');
    return;
  }

  const { data: promo } = await supabase
    .from('promo_codes')
    .select('is_active')
    .eq('code', code)
    .maybeSingle();

  if (!promo) {
    await sendAdminMessage(chatId, '❌ Промокод не найден');
    return;
  }

  const newState = !promo.is_active;
  const { error } = await supabase
    .from('promo_codes')
    .update({ is_active: newState, updated_at: new Date().toISOString() })
    .eq('code', code);

  if (error) {
    console.error('Error toggling promo code:', error);
    await sendAdminMessage(chatId, '❌ Ошибка при обновлении');
    return;
  }

  await sendAdminMessage(chatId, `✅ Промокод <code>${code}</code> ${newState ? 'активирован' : 'деактивирован'}`);
}

// Handle promo code callbacks
async function handlePromoCodeCallback(callbackQuery: any, action: string, promoId: string) {
  const { id, message, from } = callbackQuery;
  
  if (!isAdmin(from.id)) {
    await answerCallbackQuery(id, '❌ Нет доступа');
    return;
  }

  if (action === 'del') {
    const { error } = await supabase
      .from('promo_codes')
      .delete()
      .eq('id', promoId);

    if (error) {
      await answerCallbackQuery(id, '❌ Ошибка');
      return;
    }

    await answerCallbackQuery(id, '✅ Удалён');
    await handlePromoCodes(message.chat.id, from.id);
  } else if (action === 'toggle') {
    const { data: promo } = await supabase
      .from('promo_codes')
      .select('is_active')
      .eq('id', promoId)
      .maybeSingle();

    if (!promo) {
      await answerCallbackQuery(id, '❌ Не найден');
      return;
    }

    await supabase
      .from('promo_codes')
      .update({ is_active: !promo.is_active, updated_at: new Date().toISOString() })
      .eq('id', promoId);

    await answerCallbackQuery(id, promo.is_active ? '🔴 Выключен' : '🟢 Включен');
    await handlePromoCodes(message.chat.id, from.id);
  }
}

// Subscription callback handlers
async function handleSubGrantPlus(callbackQuery: any, telegramId: string) {
  const { id, message } = callbackQuery;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const { data: profile } = await supabase.from('profiles').select('id, username').eq('telegram_id', telegramId).maybeSingle();
  if (!profile) { await answerCallbackQuery(id, '❌ Не найден'); return; }

  await supabase.from('profiles').update({ subscription_tier: 'plus', is_premium: true, premium_expires_at: expiresAt.toISOString(), updated_at: new Date().toISOString() }).eq('id', profile.id);
  await sendUserMessage(telegramId, `🎉 Вам выдана <b>Plus</b> подписка на 30 дней!\n\n♾ Безлимит публикаций\n🤖 ИИ ассистент\n📝 Описание профиля\n\nДо: ${expiresAt.toLocaleDateString('ru-RU')}`);
  await answerCallbackQuery(id, '✅ Plus выдан');
  await editMessageReplyMarkup(message.chat.id, message.message_id);
  await sendAdminMessage(message.chat.id, `✅ Plus выдан ${profile.username ? '@' + profile.username : telegramId}`);
}

async function handleSubGrantPremium(callbackQuery: any, telegramId: string) {
  const { id, message } = callbackQuery;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const { data: profile } = await supabase.from('profiles').select('id, username').eq('telegram_id', telegramId).maybeSingle();
  if (!profile) { await answerCallbackQuery(id, '❌ Не найден'); return; }

  await supabase.from('profiles').update({ subscription_tier: 'premium', is_premium: true, premium_expires_at: expiresAt.toISOString(), updated_at: new Date().toISOString() }).eq('id', profile.id);
  await sendUserMessage(telegramId, `🎉 Вам выдана <b>Premium</b> подписка на 30 дней!\n\n👑 Продажа продуктов\n📱 Соц сети\n🤖 ИИ ассистент\n♾ Безлимит\n\nДо: ${expiresAt.toLocaleDateString('ru-RU')}`);
  await answerCallbackQuery(id, '✅ Premium выдан');
  await editMessageReplyMarkup(message.chat.id, message.message_id);
  await sendAdminMessage(message.chat.id, `✅ Premium выдан ${profile.username ? '@' + profile.username : telegramId}`);
}

async function handleSubUpgradePremium(callbackQuery: any, telegramId: string) {
  const { id, message } = callbackQuery;
  const { data: profile } = await supabase.from('profiles').select('id, username, premium_expires_at').eq('telegram_id', telegramId).maybeSingle();
  if (!profile) { await answerCallbackQuery(id, '❌ Не найден'); return; }

  await supabase.from('profiles').update({ subscription_tier: 'premium', updated_at: new Date().toISOString() }).eq('id', profile.id);
  await sendUserMessage(telegramId, `🎉 Ваша подписка повышена до <b>Premium</b>!\n\nТеперь доступны: продажа продуктов, соц сети в профиле`);
  await answerCallbackQuery(id, '✅ Повышен до Premium');
  await editMessageReplyMarkup(message.chat.id, message.message_id);
  await sendAdminMessage(message.chat.id, `✅ Повышен до Premium: ${profile.username ? '@' + profile.username : telegramId}`);
}

async function handleSubDowngradePlus(callbackQuery: any, telegramId: string) {
  const { id, message } = callbackQuery;
  const { data: profile } = await supabase.from('profiles').select('id, username').eq('telegram_id', telegramId).maybeSingle();
  if (!profile) { await answerCallbackQuery(id, '❌ Не найден'); return; }

  await supabase.from('profiles').update({ subscription_tier: 'plus', updated_at: new Date().toISOString() }).eq('id', profile.id);
  await sendUserMessage(telegramId, `ℹ️ Ваша подписка изменена на <b>Plus</b>`);
  await answerCallbackQuery(id, '✅ Понижен до Plus');
  await editMessageReplyMarkup(message.chat.id, message.message_id);
  await sendAdminMessage(message.chat.id, `✅ Понижен до Plus: ${profile.username ? '@' + profile.username : telegramId}`);
}

async function handleSubRevoke(callbackQuery: any, telegramId: string) {
  const { id, message } = callbackQuery;
  const { data: profile } = await supabase.from('profiles').select('id, username').eq('telegram_id', telegramId).maybeSingle();
  if (!profile) { await answerCallbackQuery(id, '❌ Не найден'); return; }

  await supabase.from('profiles').update({ subscription_tier: 'free', is_premium: false, premium_expires_at: null, updated_at: new Date().toISOString() }).eq('id', profile.id);
  await sendUserMessage(telegramId, `ℹ️ Ваша подписка отменена`);
  await answerCallbackQuery(id, '✅ Подписка отозвана');
  await editMessageReplyMarkup(message.chat.id, message.message_id);
  await sendAdminMessage(message.chat.id, `❌ Подписка отозвана: ${profile.username ? '@' + profile.username : telegramId}`);
}

async function handleSubExtend(callbackQuery: any, telegramId: string, days: number) {
  const { id, message } = callbackQuery;
  const { data: profile } = await supabase.from('profiles').select('id, username, premium_expires_at').eq('telegram_id', telegramId).maybeSingle();
  if (!profile) { await answerCallbackQuery(id, '❌ Не найден'); return; }

  let newExpiry = profile.premium_expires_at && new Date(profile.premium_expires_at) > new Date() ? new Date(profile.premium_expires_at) : new Date();
  newExpiry.setDate(newExpiry.getDate() + days);

  await supabase.from('profiles').update({ premium_expires_at: newExpiry.toISOString(), updated_at: new Date().toISOString() }).eq('id', profile.id);
  await sendUserMessage(telegramId, `🎉 Подписка продлена на ${days} дней!\nДо: ${newExpiry.toLocaleDateString('ru-RU')}`);
  await answerCallbackQuery(id, '✅ Продлено');
  await editMessageReplyMarkup(message.chat.id, message.message_id);
  await sendAdminMessage(message.chat.id, `✅ Продлено на ${days}д: ${profile.username ? '@' + profile.username : telegramId}`);
}

// Handle block user
async function handleBlockUser(callbackQuery: any, telegramId: string) {
  const { id, message } = callbackQuery;

  const { data: profile, error: findError } = await supabase
    .from('profiles')
    .select('id, username, is_premium')
    .eq('telegram_id', telegramId)
    .maybeSingle();

  if (findError || !profile) {
    await answerCallbackQuery(id, '❌ Пользователь не найден');
    return;
  }

  // Block user permanently and revoke premium
  const { error } = await supabase
    .from('profiles')
    .update({ 
      is_blocked: true,
      blocked_at: new Date().toISOString(),
      blocked_until: null, // permanent block
      is_premium: false,
      premium_expires_at: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', profile.id);

  if (error) {
    console.error('Error blocking user:', error);
    await answerCallbackQuery(id, '❌ Ошибка');
    return;
  }

  // Notify user
  await sendUserMessage(telegramId, `🚫 <b>Ваш аккаунт заблокирован</b>

Вы больше не можете использовать ManHub.

Если вы считаете, что это ошибка, обратитесь в поддержку.`);

  await answerCallbackQuery(id, '🚫 Пользователь заблокирован');
  await editMessageReplyMarkup(message.chat.id, message.message_id);
  
  const username = profile.username ? `@${profile.username}` : telegramId;
  await sendAdminMessage(message.chat.id, `🚫 Пользователь ${username} заблокирован`);
}

// Handle unblock user
async function handleUnblockUser(callbackQuery: any, telegramId: string) {
  const { id, message } = callbackQuery;

  const { data: profile, error: findError } = await supabase
    .from('profiles')
    .select('id, username')
    .eq('telegram_id', telegramId)
    .maybeSingle();

  if (findError || !profile) {
    await answerCallbackQuery(id, '❌ Пользователь не найден');
    return;
  }

  const { error } = await supabase
    .from('profiles')
    .update({ 
      is_blocked: false,
      blocked_at: null,
      blocked_until: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', profile.id);

  if (error) {
    console.error('Error unblocking user:', error);
    await answerCallbackQuery(id, '❌ Ошибка');
    return;
  }

  // Notify user
  await sendUserMessage(telegramId, `✅ <b>Ваш аккаунт разблокирован</b>

Вы снова можете использовать ManHub.`);

  await answerCallbackQuery(id, '✅ Пользователь разблокирован');
  await editMessageReplyMarkup(message.chat.id, message.message_id);
  
  const username = profile.username ? `@${profile.username}` : telegramId;
  await sendAdminMessage(message.chat.id, `✅ Пользователь ${username} разблокирован`);
}

// Handle temporary block menu
async function handleTempBlockMenu(callbackQuery: any, telegramId: string) {
  const { id, message } = callbackQuery;
  
  await answerCallbackQuery(id);
  
  const keyboard = {
    inline_keyboard: [
      [
        { text: '1 час', callback_data: `block_temp:${telegramId}:1h` },
        { text: '6 часов', callback_data: `block_temp:${telegramId}:6h` },
        { text: '12 часов', callback_data: `block_temp:${telegramId}:12h` }
      ],
      [
        { text: '1 день', callback_data: `block_temp:${telegramId}:1d` },
        { text: '3 дня', callback_data: `block_temp:${telegramId}:3d` },
        { text: '7 дней', callback_data: `block_temp:${telegramId}:7d` }
      ],
      [
        { text: '14 дней', callback_data: `block_temp:${telegramId}:14d` },
        { text: '30 дней', callback_data: `block_temp:${telegramId}:30d` }
      ],
      [{ text: '◀️ Назад', callback_data: `user:${telegramId}` }]
    ]
  };
  
  await editAdminMessage(message.chat.id, message.message_id, `⏱ <b>Временная блокировка</b>

Выберите срок блокировки:`, { reply_markup: keyboard });
}

// Handle temporary block action
async function handleTempBlock(callbackQuery: any, telegramId: string, duration: string) {
  const { id, message } = callbackQuery;
  
  const { data: profile, error: findError } = await supabase
    .from('profiles')
    .select('id, username, is_premium')
    .eq('telegram_id', telegramId)
    .maybeSingle();
    
  if (findError || !profile) {
    await answerCallbackQuery(id, '❌ Пользователь не найден');
    return;
  }
  
  // Parse duration
  let blockedUntil: Date;
  let durationText: string;
  const now = new Date();
  
  switch (duration) {
    case '1h':
      blockedUntil = new Date(now.getTime() + 1 * 60 * 60 * 1000);
      durationText = '1 час';
      break;
    case '6h':
      blockedUntil = new Date(now.getTime() + 6 * 60 * 60 * 1000);
      durationText = '6 часов';
      break;
    case '12h':
      blockedUntil = new Date(now.getTime() + 12 * 60 * 60 * 1000);
      durationText = '12 часов';
      break;
    case '1d':
      blockedUntil = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
      durationText = '1 день';
      break;
    case '3d':
      blockedUntil = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      durationText = '3 дня';
      break;
    case '7d':
      blockedUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      durationText = '7 дней';
      break;
    case '14d':
      blockedUntil = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      durationText = '14 дней';
      break;
    case '30d':
      blockedUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      durationText = '30 дней';
      break;
    default:
      await answerCallbackQuery(id, '❌ Неверный срок');
      return;
  }
  
  // Block user temporarily
  const { error } = await supabase
    .from('profiles')
    .update({
      is_blocked: true,
      blocked_at: now.toISOString(),
      blocked_until: blockedUntil.toISOString(),
      updated_at: now.toISOString()
    })
    .eq('id', profile.id);
    
  if (error) {
    console.error('Error temp blocking user:', error);
    await answerCallbackQuery(id, '❌ Ошибка');
    return;
  }
  
  // Notify user
  const formattedDate = blockedUntil.toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  await sendUserMessage(telegramId, `🚫 <b>Ваш аккаунт временно заблокирован</b>

Срок: ${durationText}
Разблокировка: ${formattedDate}

Если вы считаете, что это ошибка, обратитесь в поддержку.`);

  await answerCallbackQuery(id, `🚫 Заблокирован на ${durationText}`);
  await editMessageReplyMarkup(message.chat.id, message.message_id);
  
  const username = profile.username ? `@${profile.username}` : telegramId;
  await sendAdminMessage(message.chat.id, `🚫 Пользователь ${username} заблокирован на ${durationText} (до ${formattedDate})`);
}

// Handle /pending command - show pending articles
async function handlePending(chatId: number, userId: number) {
  if (!isAdmin(userId)) return;

  const { data: articles, error } = await supabase
    .from('articles')
    .select('id, title, preview, created_at, author:author_id(first_name, username, telegram_id)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching pending articles:', error);
    await sendAdminMessage(chatId, '❌ Ошибка при загрузке статей');
    return;
  }

  if (!articles || articles.length === 0) {
    await sendAdminMessage(chatId, '✨ Нет статей на модерации');
    return;
  }

  await sendAdminMessage(chatId, `📝 <b>Статьи на модерации (${articles.length}):</b>\n\nНажмите на статью для модерации:`);

  for (const article of articles) {
    const shortId = await getOrCreateShortId(article.id);
    const authorData = article.author as any;
    const authorDisplay = authorData?.username ? `@${authorData.username}` : `ID:${authorData?.telegram_id || 'N/A'}`;
    
    const message = `📄 <b>${article.title}</b>

👤 Автор: ${authorDisplay}

📝 ${article.preview?.substring(0, 150) || 'Нет превью'}...

🕐 ${new Date(article.created_at).toLocaleString('ru-RU')}`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '✅ Принять', callback_data: `approve:${shortId}` },
          { text: '❌ Отклонить', callback_data: `reject:${shortId}` },
        ],
      ],
    };

    await sendAdminMessage(chatId, message, { reply_markup: keyboard });
  }
}

// Handle /st command - show published articles with pagination
async function handleArticles(chatId: number, userId: number, page: number = 0, messageId?: number, searchQuery?: string) {
  if (!isAdmin(userId)) return;

  const from = page * ARTICLES_PER_PAGE;

  let query = supabase
    .from('articles')
    .select('id, title, created_at, status, author:author_id(username, telegram_id)', { count: 'exact' })
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (searchQuery) {
    query = query.ilike('title', `%${searchQuery}%`);
  }

  const { data: articles, count: totalCount, error } = await query.range(from, from + ARTICLES_PER_PAGE - 1);

  if (error) {
    console.error('Error fetching articles:', error);
    await sendAdminMessage(chatId, '❌ Ошибка при загрузке статей');
    return;
  }

  const totalPages = Math.ceil((totalCount || 0) / ARTICLES_PER_PAGE);

  let message = `📰 <b>Опубликованные статьи</b> (${totalCount || 0})`;
  if (searchQuery) {
    message += `\n🔍 Поиск: "${searchQuery}"`;
  }
  message += `\n📄 Страница ${page + 1}/${totalPages || 1}\n\n`;

  if (!articles || articles.length === 0) {
    message += searchQuery ? '<i>Статьи не найдены</i>' : '<i>Нет опубликованных статей</i>';
  } else {
    for (const article of articles) {
      const authorData = article.author as any;
      const authorDisplay = authorData?.username ? `@${authorData.username}` : `ID:${authorData?.telegram_id || 'N/A'}`;
      const date = new Date(article.created_at).toLocaleDateString('ru-RU');
      const time = new Date(article.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      
      message += `📄 <b>${article.title.substring(0, 40)}${article.title.length > 40 ? '...' : ''}</b>\n`;
      message += `   👤 ${authorDisplay} | 📅 ${date} ${time}\n\n`;
    }
  }

  message += `\n🔍 Поиск: <code>/search_st запрос</code>`;

  // Create article buttons (используем short_id из moderation_short_ids)
  const articleButtons: any[][] = [];
  if (articles) {
    for (const article of articles) {
      const shortId = await getOrCreateShortId(article.id);
      const shortTitle = article.title.length > 25 ? article.title.substring(0, 25) + '...' : article.title;
      articleButtons.push([{ text: `📄 ${shortTitle}`, callback_data: `article:${shortId}` }]);
    }
  }

  // Pagination buttons
  const navButtons: any[] = [];
  if (page > 0) {
    navButtons.push({ text: '⬅️ Назад', callback_data: `articles:${page - 1}` });
  }
  if (page < totalPages - 1) {
    navButtons.push({ text: 'Вперёд ➡️', callback_data: `articles:${page + 1}` });
  }

  const keyboard = {
    inline_keyboard: [...articleButtons, ...(navButtons.length > 0 ? [navButtons] : [])],
  };

  if (messageId) {
    await editAdminMessage(chatId, messageId, message, { reply_markup: keyboard });
  } else {
    await sendAdminMessage(chatId, message, { reply_markup: keyboard });
  }
}

// Handle article view
async function handleViewArticle(callbackQuery: any, articleShortId: string) {
  const { id, message } = callbackQuery;

  const articleId = await getArticleIdByShortId(articleShortId);
  if (!articleId) {
    await answerCallbackQuery(id, '❌ Статья не найдена');
    return;
  }

  const { data: article, error } = await supabase
    .from('articles')
    .select('id, title, preview, body, created_at, status, comments_count, author:author_id(username, telegram_id, first_name)')
    .eq('id', articleId)
    .maybeSingle();

  if (error || !article) {
    await answerCallbackQuery(id, '❌ Статья не найдена');
    return;
  }

  const authorData = article.author as any;
  const authorDisplay = authorData?.username ? `@${authorData.username}` : `ID:${authorData?.telegram_id || 'N/A'}`;
  const date = new Date(article.created_at).toLocaleDateString('ru-RU');
  const time = new Date(article.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  const articleMessage = `📄 <b>${article.title}</b>

👤 <b>Автор:</b> ${authorDisplay}
📅 <b>Дата:</b> ${date} ${time}
📊 <b>Статус:</b> ${article.status === 'approved' ? '✅ Опубликована' : article.status}
💬 <b>Комментариев:</b> ${article.comments_count || 0}

📝 <b>Превью:</b>
${article.preview || article.body?.substring(0, 300) || 'Нет превью'}...`;

  const keyboard = {
    inline_keyboard: [
      [{ text: '💬 Комментарии', callback_data: `comments:${articleShortId}:0` }],
      [{ text: '🗑 Удалить статью', callback_data: `delete_article:${articleShortId}` }],
      [{ text: '◀️ Назад к списку', callback_data: 'articles:0' }],
    ],
  };

  await answerCallbackQuery(id);
  await editAdminMessage(message.chat.id, message.message_id, articleMessage, { reply_markup: keyboard });
}

// Handle comments view for an article
async function handleViewComments(callbackQuery: any, articleShortId: string, page: number = 0) {
  const { id, message } = callbackQuery;
  const COMMENTS_PER_PAGE = 5;

  const articleId = await getArticleIdByShortId(articleShortId);
  if (!articleId) {
    await answerCallbackQuery(id, '❌ Статья не найдена');
    return;
  }

  const { data: article } = await supabase
    .from('articles')
    .select('id, title')
    .eq('id', articleId)
    .maybeSingle();

  if (!article) {
    await answerCallbackQuery(id, '❌ Статья не найдена');
    return;
  }

  // Get comments with pagination
  const from = page * COMMENTS_PER_PAGE;
  const { data: comments, count: totalCount, error } = await supabase
    .from('article_comments')
    .select('id, body, created_at, author:author_id(username, telegram_id, first_name)', { count: 'exact' })
    .eq('article_id', articleId)
    .order('created_at', { ascending: false })
    .range(from, from + COMMENTS_PER_PAGE - 1);

  if (error) {
    console.error('Error fetching comments:', error);
    await answerCallbackQuery(id, '❌ Ошибка загрузки комментариев');
    return;
  }

  const totalPages = Math.ceil((totalCount || 0) / COMMENTS_PER_PAGE);

  let commentsMessage = `💬 <b>Комментарии к статье</b>\n📄 "${article.title.substring(0, 40)}${article.title.length > 40 ? '...' : ''}"\n\n`;
  commentsMessage += `📊 Всего: ${totalCount || 0} | Страница ${page + 1}/${totalPages || 1}\n\n`;

  if (!comments || comments.length === 0) {
    commentsMessage += '<i>Комментариев пока нет</i>';
  } else {
    for (let i = 0; i < comments.length; i++) {
      const c = comments[i];
      const authorData = c.author as any;
      const authorDisplay = authorData?.username ? `@${authorData.username}` : (authorData?.first_name || `ID:${authorData?.telegram_id || 'N/A'}`);
      const date = new Date(c.created_at).toLocaleDateString('ru-RU');
      const time = new Date(c.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      const shortBody = c.body.length > 100 ? c.body.substring(0, 100) + '...' : c.body;
      
      commentsMessage += `${from + i + 1}. 👤 <b>${authorDisplay}</b> | ${date} ${time}\n`;
      commentsMessage += `   "${shortBody}"\n\n`;
    }
  }

  // Build buttons
  const buttons: any[][] = [];

  // Delete buttons for each comment
  if (comments && comments.length > 0) {
    for (const c of comments) {
      const shortBody = c.body.length > 20 ? c.body.substring(0, 20) + '...' : c.body;
      buttons.push([{ text: `🗑 "${shortBody}"`, callback_data: `del_comment:${c.id}:${articleShortId}` }]);
    }
  }

  // Pagination
  const navButtons: any[] = [];
  if (page > 0) {
    navButtons.push({ text: '⬅️ Назад', callback_data: `comments:${articleShortId}:${page - 1}` });
  }
  if (page < totalPages - 1) {
    navButtons.push({ text: 'Вперёд ➡️', callback_data: `comments:${articleShortId}:${page + 1}` });
  }
  if (navButtons.length > 0) {
    buttons.push(navButtons);
  }

  buttons.push([{ text: '◀️ К статье', callback_data: `article:${articleShortId}` }]);

  const keyboard = { inline_keyboard: buttons };

  await answerCallbackQuery(id);
  await editAdminMessage(message.chat.id, message.message_id, commentsMessage, { reply_markup: keyboard });
}

// Handle delete comment
async function handleDeleteComment(callbackQuery: any, commentId: string, articleShortId: string) {
  const { id, message } = callbackQuery;

  const { data: comment, error: findErr } = await supabase
    .from('article_comments')
    .select('id, body, article_id, author:author_id(telegram_id)')
    .eq('id', commentId)
    .maybeSingle();

  if (findErr || !comment) {
    await answerCallbackQuery(id, '❌ Комментарий не найден');
    return;
  }

  // Delete comment
  const { error } = await supabase
    .from('article_comments')
    .delete()
    .eq('id', commentId);

  if (error) {
    console.error('Error deleting comment:', error);
    await answerCallbackQuery(id, '❌ Ошибка удаления');
    return;
  }

  // Decrement comments_count on article
  const { data: article } = await supabase
    .from('articles')
    .select('comments_count')
    .eq('id', comment.article_id)
    .maybeSingle();
  
  if (article) {
    await supabase
      .from('articles')
      .update({ comments_count: Math.max(0, (article.comments_count || 1) - 1) })
      .eq('id', comment.article_id);
  }

  // Notify comment author
  const authorData = comment.author as any;
  if (authorData?.telegram_id) {
    const shortBody = comment.body.length > 50 ? comment.body.substring(0, 50) + '...' : comment.body;
    await sendUserMessage(authorData.telegram_id, `ℹ️ <b>Уведомление</b>

Ваш комментарий был удалён администратором:
"${shortBody}"`);
  }

  await answerCallbackQuery(id, '✅ Комментарий удалён');
  
  // Refresh comments list
  await handleViewComments({ id, message, from: callbackQuery.from }, articleShortId, 0);
}

// Handle delete article
async function handleDeleteArticle(callbackQuery: any, articleShortId: string) {
  const { id, message } = callbackQuery;

  const articleId = await getArticleIdByShortId(articleShortId);
  if (!articleId) {
    await answerCallbackQuery(id, '❌ Статья не найдена');
    return;
  }

  const { data: article, error: findError } = await supabase
    .from('articles')
    .select('id, title, author:author_id(telegram_id)')
    .eq('id', articleId)
    .maybeSingle();

  if (findError || !article) {
    await answerCallbackQuery(id, '❌ Статья не найдена');
    return;
  }

  const { error } = await supabase
    .from('articles')
    .delete()
    .eq('id', article.id);

  if (error) {
    console.error('Error deleting article:', error);
    await answerCallbackQuery(id, '❌ Ошибка при удалении');
    return;
  }

  // Notify author
  const authorData = article.author as any;
  if (authorData?.telegram_id) {
    await sendUserMessage(authorData.telegram_id, `ℹ️ <b>Уведомление</b>

Ваша статья "${article.title}" была удалена администратором.`);
  }

  await answerCallbackQuery(id, '✅ Статья удалена');
  await sendAdminMessage(message.chat.id, `🗑 Статья "${article.title}" удалена`);
  
  // Go back to articles list
  await handleArticles(message.chat.id, parseInt(TELEGRAM_ADMIN_CHAT_ID), 0);
}

// Handle /search_st command
async function handleSearchArticles(chatId: number, userId: number, query: string) {
  if (!isAdmin(userId)) return;

  if (!query) {
    await sendAdminMessage(chatId, `🔍 <b>Поиск статей</b>

Используйте:
<code>/search_st заголовок</code>

Пример:
<code>/search_st криптовалюта</code>`);
    return;
  }

  await handleArticles(chatId, userId, 0, undefined, query);
}

// ==================== PODCASTS MANAGEMENT ====================

const MAX_PODCASTS = 10;

// Extract YouTube ID from URL
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Handle /podc command
async function handlePodcasts(chatId: number, userId: number) {
  if (!isAdmin(userId)) return;

  const { count } = await supabase
    .from('podcasts')
    .select('*', { count: 'exact', head: true });

  const message = `🎙 <b>Управление подкастами</b>

📊 Загружено: ${count || 0}/10 роликов

Выберите действие:`;

  const keyboard = {
    inline_keyboard: [
      [{ text: '➕ Добавить', callback_data: 'podcast_add' }],
      [{ text: '🗑 Удалить', callback_data: 'podcast_delete_list' }],
    ],
  };

  await sendAdminMessage(chatId, message, { reply_markup: keyboard });
}

// Handle podcast add start
async function handlePodcastAddStart(callbackQuery: any) {
  const { id, message, from } = callbackQuery;

  // Check limit
  const { count } = await supabase
    .from('podcasts')
    .select('*', { count: 'exact', head: true });

  if ((count || 0) >= MAX_PODCASTS) {
    await answerCallbackQuery(id, '❌ Ошибка, загружено уже 10 роликов');
    return;
  }

  // Store state
  await supabase.from('admin_settings').upsert({
    key: `pending_podcast_${from.id}`,
    value: JSON.stringify({ step: 'url' }),
  });

  await answerCallbackQuery(id);
  await sendAdminMessage(message.chat.id, `🎙 <b>Добавление подкаста</b>

Шаг 1/3: Отправьте ссылку на YouTube видео`);
}

// Handle podcast URL input
async function handlePodcastUrlInput(chatId: number, userId: number, text: string): Promise<boolean> {
  const { data: pending } = await supabase
    .from('admin_settings')
    .select('value')
    .eq('key', `pending_podcast_${userId}`)
    .maybeSingle();

  if (!pending) return false;

  let state;
  try {
    state = JSON.parse(pending.value || '{}');
  } catch {
    return false;
  }

  if (state.step === 'url') {
    const youtubeId = extractYouTubeId(text.trim());
    if (!youtubeId) {
      await sendAdminMessage(chatId, '❌ Неверная ссылка на YouTube. Попробуйте ещё раз.');
      return true;
    }

    // Update state
    await supabase.from('admin_settings').upsert({
      key: `pending_podcast_${userId}`,
      value: JSON.stringify({ step: 'title', youtube_id: youtubeId, youtube_url: text.trim() }),
    });

    await sendAdminMessage(chatId, `✅ Ссылка принята!

Шаг 2/3: Отправьте заголовок подкаста`);
    return true;
  }

  if (state.step === 'title') {
    // Accept any text as title (no YouTube validation here!)
    await supabase.from('admin_settings').upsert({
      key: `pending_podcast_${userId}`,
      value: JSON.stringify({ ...state, step: 'description', title: text.trim() }),
    });

    await sendAdminMessage(chatId, `✅ Заголовок сохранён!

Шаг 3/3: Отправьте описание подкаста`);
  }

  if (state.step === 'description') {
    // Check limit again
    const { count } = await supabase
      .from('podcasts')
      .select('*', { count: 'exact', head: true });

    if ((count || 0) >= MAX_PODCASTS) {
      await supabase.from('admin_settings').delete().eq('key', `pending_podcast_${userId}`);
      await sendAdminMessage(chatId, '❌ Ошибка, загружено уже 10 роликов');
      return true;
    }

    // Save podcast
    const { error } = await supabase.from('podcasts').insert({
      youtube_url: state.youtube_url,
      youtube_id: state.youtube_id,
      title: state.title,
      description: text.trim(),
      thumbnail_url: `https://img.youtube.com/vi/${state.youtube_id}/maxresdefault.jpg`,
    });

    // Clear state
    await supabase.from('admin_settings').delete().eq('key', `pending_podcast_${userId}`);

    if (error) {
      console.error('Error saving podcast:', error);
      await sendAdminMessage(chatId, '❌ Ошибка при сохранении');
    } else {
      await sendAdminMessage(chatId, `✅ Подкаст "${state.title}" успешно добавлен!`);
    }
    return true;
  }

  return false;
}

// Handle podcast delete list
async function handlePodcastDeleteList(callbackQuery: any) {
  const { id, message } = callbackQuery;

  const { data: podcasts, error } = await supabase
    .from('podcasts')
    .select('id, title')
    .order('created_at', { ascending: false });

  if (error || !podcasts || podcasts.length === 0) {
    await answerCallbackQuery(id, 'Нет подкастов для удаления');
    return;
  }

  const buttons = podcasts.map(p => [{ 
    text: `🗑 ${p.title.substring(0, 30)}${p.title.length > 30 ? '...' : ''}`, 
    callback_data: `podcast_del:${p.id.substring(0, 8)}` 
  }]);
  buttons.push([{ text: '◀️ Назад', callback_data: 'podcast_back' }]);

  await answerCallbackQuery(id);
  await editAdminMessage(message.chat.id, message.message_id, '🗑 <b>Выберите подкаст для удаления:</b>', {
    reply_markup: { inline_keyboard: buttons },
  });
}

// Handle podcast delete
async function handlePodcastDelete(callbackQuery: any, podcastIdPrefix: string) {
  const { id, message } = callbackQuery;

  // Find podcast
  const { data: podcasts } = await supabase
    .from('podcasts')
    .select('id, title')
    .order('created_at', { ascending: false });

  const podcast = podcasts?.find(p => p.id.startsWith(podcastIdPrefix));
  if (!podcast) {
    await answerCallbackQuery(id, '❌ Подкаст не найден');
    return;
  }

  const { error } = await supabase.from('podcasts').delete().eq('id', podcast.id);

  if (error) {
    await answerCallbackQuery(id, '❌ Ошибка при удалении');
    return;
  }

  await answerCallbackQuery(id, '✅ Подкаст удалён');
  await sendAdminMessage(message.chat.id, `🗑 Подкаст "${podcast.title}" удалён`);
}

// ==================== PLAYLISTS MANAGEMENT ====================

const MAX_PLAYLISTS_PER_SERVICE = 10;

// Handle /pl command
async function handlePlaylists(chatId: number, userId: number) {
  if (!isAdmin(userId)) return;

  const message = `🎵 <b>Управление плейлистами</b>

Выберите сервис:`;

  const keyboard = {
    inline_keyboard: [
      [{ text: '🟢 Spotify', callback_data: 'pl_service:spotify' }],
      [{ text: '🟠 SoundCloud', callback_data: 'pl_service:soundcloud' }],
      [{ text: '🟡 Яндекс Музыка', callback_data: 'pl_service:yandex' }],
    ],
  };

  await sendAdminMessage(chatId, message, { reply_markup: keyboard });
}

// Handle playlist service selection
async function handlePlaylistService(callbackQuery: any, service: string) {
  const { id, message } = callbackQuery;

  const serviceNames: Record<string, string> = {
    spotify: 'Spotify',
    soundcloud: 'SoundCloud',
    yandex: 'Яндекс Музыка',
  };

  const { data: playlists } = await supabase
    .from('playlists')
    .select('id, title, category')
    .eq('service', service)
    .order('created_at', { ascending: false });

  const count = playlists?.length || 0;

  let listText = '';
  if (playlists && playlists.length > 0) {
    const categoryLabels: Record<string, string> = {
      motivation: 'Мотивация',
      workout: 'Тренировка',
      'self-development': 'Саморазвитие',
    };
    listText = '\n\n<b>Текущие плейлисты:</b>\n' + playlists.map(p => 
      `• ${p.title} (${categoryLabels[p.category] || p.category})`
    ).join('\n');
  }

  const serviceMessage = `🎵 <b>${serviceNames[service]}</b>

📊 Загружено: ${count}/${MAX_PLAYLISTS_PER_SERVICE} плейлистов${listText}`;

  const buttons: any[][] = [];
  
  if (count < MAX_PLAYLISTS_PER_SERVICE) {
    buttons.push([{ text: '➕ Добавить плейлист', callback_data: `pl_add:${service}` }]);
  }
  
  if (playlists && playlists.length > 0) {
    buttons.push([{ text: '🗑 Удалить плейлист', callback_data: `pl_del_list:${service}` }]);
  }
  
  buttons.push([{ text: '◀️ Назад', callback_data: 'pl_back' }]);

  await answerCallbackQuery(id);
  await editAdminMessage(message.chat.id, message.message_id, serviceMessage, {
    reply_markup: { inline_keyboard: buttons },
  });
}

// Handle playlist add start
async function handlePlaylistAddStart(callbackQuery: any, service: string) {
  const { id, message, from } = callbackQuery;

  const { count } = await supabase
    .from('playlists')
    .select('*', { count: 'exact', head: true })
    .eq('service', service);

  if ((count || 0) >= MAX_PLAYLISTS_PER_SERVICE) {
    await answerCallbackQuery(id, '❌ Максимум 10 плейлистов на сервис');
    return;
  }

  // Store state
  await supabase.from('admin_settings').upsert({
    key: `pending_playlist_${from.id}`,
    value: JSON.stringify({ step: 'category', service }),
  });

  const keyboard = {
    inline_keyboard: [
      [{ text: '🔥 Мотивация', callback_data: 'pl_cat:motivation' }],
      [{ text: '💪 Тренировка', callback_data: 'pl_cat:workout' }],
      [{ text: '🧠 Саморазвитие', callback_data: 'pl_cat:self-development' }],
    ],
  };

  await answerCallbackQuery(id);
  await sendAdminMessage(message.chat.id, `🎵 <b>Добавление плейлиста</b>

Шаг 1/3: Выберите категорию`, { reply_markup: keyboard });
}

// Handle playlist category selection
async function handlePlaylistCategory(callbackQuery: any, category: string) {
  const { id, message, from } = callbackQuery;

  const { data: pending } = await supabase
    .from('admin_settings')
    .select('value')
    .eq('key', `pending_playlist_${from.id}`)
    .maybeSingle();

  if (!pending) {
    await answerCallbackQuery(id, '❌ Сессия истекла');
    return;
  }

  let state;
  try {
    state = JSON.parse(pending.value || '{}');
  } catch {
    await answerCallbackQuery(id, '❌ Ошибка');
    return;
  }

  // Update state
  await supabase.from('admin_settings').upsert({
    key: `pending_playlist_${from.id}`,
    value: JSON.stringify({ ...state, step: 'title', category }),
  });

  await answerCallbackQuery(id);
  await sendAdminMessage(message.chat.id, `✅ Категория выбрана!

Шаг 2/3: Отправьте название плейлиста`);
}

// Handle playlist title/url input
async function handlePlaylistInput(chatId: number, userId: number, text: string): Promise<boolean> {
  const { data: pending } = await supabase
    .from('admin_settings')
    .select('value')
    .eq('key', `pending_playlist_${userId}`)
    .maybeSingle();

  if (!pending) return false;

  let state;
  try {
    state = JSON.parse(pending.value || '{}');
  } catch {
    return false;
  }

  if (state.step === 'title') {
    await supabase.from('admin_settings').upsert({
      key: `pending_playlist_${userId}`,
      value: JSON.stringify({ ...state, step: 'url', title: text.trim() }),
    });

    await sendAdminMessage(chatId, `✅ Название сохранено!

Шаг 3/3: Отправьте ссылку на плейлист`);
    return true;
  }

  if (state.step === 'url') {
    // Save playlist
    const { error } = await supabase.from('playlists').insert({
      service: state.service,
      category: state.category,
      title: state.title,
      url: text.trim(),
      cover_urls: [],
    });

    // Clear state
    await supabase.from('admin_settings').delete().eq('key', `pending_playlist_${userId}`);

    if (error) {
      console.error('Error saving playlist:', error);
      await sendAdminMessage(chatId, '❌ Ошибка при сохранении');
    } else {
      await sendAdminMessage(chatId, `✅ Плейлист "${state.title}" успешно добавлен!`);
    }
    return true;
  }

  return false;
}

// Handle playlist delete list
async function handlePlaylistDeleteList(callbackQuery: any, service: string) {
  const { id, message } = callbackQuery;

  const { data: playlists } = await supabase
    .from('playlists')
    .select('id, title')
    .eq('service', service)
    .order('created_at', { ascending: false });

  if (!playlists || playlists.length === 0) {
    await answerCallbackQuery(id, 'Нет плейлистов для удаления');
    return;
  }

  const buttons = playlists.map(p => [{ 
    text: `🗑 ${p.title.substring(0, 30)}${p.title.length > 30 ? '...' : ''}`, 
    callback_data: `pl_del:${p.id.substring(0, 8)}` 
  }]);
  buttons.push([{ text: '◀️ Назад', callback_data: `pl_service:${service}` }]);

  await answerCallbackQuery(id);
  await editAdminMessage(message.chat.id, message.message_id, '🗑 <b>Выберите плейлист для удаления:</b>', {
    reply_markup: { inline_keyboard: buttons },
  });
}

// Handle playlist delete
async function handlePlaylistDelete(callbackQuery: any, playlistIdPrefix: string) {
  const { id, message } = callbackQuery;

  const { data: playlists } = await supabase
    .from('playlists')
    .select('id, title, service')
    .order('created_at', { ascending: false });

  const playlist = playlists?.find(p => p.id.startsWith(playlistIdPrefix));
  if (!playlist) {
    await answerCallbackQuery(id, '❌ Плейлист не найден');
    return;
  }

  const { error } = await supabase.from('playlists').delete().eq('id', playlist.id);

  if (error) {
    await answerCallbackQuery(id, '❌ Ошибка при удалении');
    return;
  }

  await answerCallbackQuery(id, '✅ Плейлист удалён');
  await sendAdminMessage(message.chat.id, `🗑 Плейлист "${playlist.title}" удалён`);
}


async function handleBroadcast(chatId: number, userId: number, text?: string) {
  if (!isAdmin(userId)) return;

  if (!text || text === '/broadcast') {
    await sendAdminMessage(chatId, `📢 <b>Рассылка</b>

Чтобы отправить сообщение всем пользователям, используйте:

<code>/broadcast Текст сообщения</code>

Пример:
<code>/broadcast Привет! У нас новый функционал!</code>`);
    return;
  }

  const { data: users, error } = await supabase
    .from('profiles')
    .select('telegram_id')
    .eq('is_blocked', false)
    .not('telegram_id', 'is', null);

  if (error) {
    console.error('Error fetching users:', error);
    await sendAdminMessage(chatId, '❌ Ошибка при загрузке пользователей');
    return;
  }

  if (!users || users.length === 0) {
    await sendAdminMessage(chatId, '❌ Нет пользователей для рассылки');
    return;
  }

  const broadcastText = text.replace('/broadcast ', '');
  let sent = 0;
  let failed = 0;

  await sendAdminMessage(chatId, `📤 Отправка сообщения ${users.length} пользователям...`);

  for (const user of users) {
    if (user.telegram_id) {
      try {
        const result = await sendUserMessage(user.telegram_id, `📢 <b>Объявление от BoysHub</b>\n\n${broadcastText}`);
        if (result.ok) {
          sent++;
        } else {
          failed++;
        }
      } catch (e) {
        failed++;
      }
    }
  }

  await sendAdminMessage(chatId, `✅ <b>Рассылка завершена</b>

📤 Отправлено: ${sent}
❌ Не доставлено: ${failed}`);
}

// Handle /questions command - show pending support questions with inline buttons
async function handleQuestions(chatId: number, userId: number) {
  if (!isAdmin(userId)) return;

  const { data: questions, error } = await supabase
    .from('support_questions')
    .select('id, user_telegram_id, question, created_at, user_profile_id')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error fetching questions:', error);
    await sendAdminMessage(chatId, '❌ Ошибка при загрузке вопросов');
    return;
  }

  if (!questions || questions.length === 0) {
    await sendAdminMessage(chatId, '✨ Нет вопросов в поддержку');
    return;
  }

  // Show each question with answer button
  for (const q of questions) {
    // Get user profile for display
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, first_name')
      .eq('telegram_id', q.user_telegram_id)
      .maybeSingle();

    const userDisplay = profile?.username ? `@${profile.username}` : `ID:${q.user_telegram_id}`;
    const userName = profile?.first_name || 'User';

    const questionMessage = `❓ <b>Вопрос в поддержку</b>

👤 <b>От:</b> ${userName} (${userDisplay})
🆔 <b>Telegram ID:</b> ${q.user_telegram_id}

📝 <b>Вопрос:</b>
${q.question}`;

    const keyboard = {
      inline_keyboard: [
        [{ text: '💬 Ответить', callback_data: `support_answer:${q.user_telegram_id}:${q.id.substring(0, 8)}` }]
      ]
    };

    await sendAdminMessage(chatId, questionMessage, { reply_markup: keyboard });
  }
}

// Handle support answer button click - start answer mode
async function handleSupportAnswerStart(callbackQuery: any, userTelegramId: string, questionShortId: string) {
  const { id, message, from } = callbackQuery;

  // Store pending answer state
  await supabase.from('admin_settings').upsert({
    key: `pending_support_answer_${from.id}`,
    value: JSON.stringify({ userTelegramId, questionShortId, messageId: message.message_id }),
  });

  await answerCallbackQuery(id, '📝 Напишите ответ');
  await sendAdminMessage(message.chat.id, `📝 <b>Напишите ответ пользователю</b> (ID: ${userTelegramId})\n\n<i>Следующее ваше сообщение будет отправлено как ответ.</i>`);
}

// Handle pending support answer
async function handlePendingSupportAnswer(chatId: number, userId: number, text: string): Promise<boolean> {
  const { data: pending, error } = await supabase
    .from('admin_settings')
    .select('value')
    .eq('key', `pending_support_answer_${userId}`)
    .maybeSingle();

  if (error || !pending) return false;

  let answerData;
  try {
    answerData = JSON.parse(pending.value || '{}');
  } catch {
    return false;
  }

  const { userTelegramId, questionShortId } = answerData;
  if (!userTelegramId) return false;

  console.log('Sending support answer to user:', userTelegramId);

  // Get original question for context
  let originalQuestion = '';
  let questionId = '';
  if (questionShortId && questionShortId !== 'none') {
    // Search for question by ID prefix using filter
    const { data: questions } = await supabase
      .from('support_questions')
      .select('id, question')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(50);
    
    const q = questions?.find(question => question.id.startsWith(questionShortId));
    
    if (q) {
      originalQuestion = q.question;
      // Update question status
      await supabase
        .from('support_questions')
        .update({
          answer: text,
          answered_by_telegram_id: userId,
          status: 'answered',
          answered_at: new Date().toISOString(),
        })
        .eq('id', q.id);
    }
  }

  // Send answer to user
  const userMessage = originalQuestion 
    ? `💬 <b>Ответ от поддержки BoysHub</b>

<b>Ваш вопрос:</b>
${originalQuestion}

<b>Ответ:</b>
${text}

<i>Если у вас есть ещё вопросы, напишите в бот.</i>`
    : `💬 <b>Ответ от поддержки BoysHub</b>

${text}

<i>Если у вас есть ещё вопросы, напишите в бот.</i>`;

  const sendResult = await sendUserMessage(parseInt(userTelegramId), userMessage);
  console.log('Send result:', sendResult);

  // Clear pending state
  await supabase
    .from('admin_settings')
    .delete()
    .eq('key', `pending_support_answer_${userId}`);

  if (sendResult.ok) {
    await sendAdminMessage(chatId, `✅ Ответ отправлен пользователю ${userTelegramId}`);
  } else {
    await sendAdminMessage(chatId, `❌ Не удалось отправить ответ: ${sendResult.description || 'ошибка'}`);
  }

  return true;
}

// Handle question view callback (legacy - now with button)
async function handleViewQuestion(callbackQuery: any, questionShortId: string) {
  const { id, message, from } = callbackQuery;

  const { data: question, error } = await supabase
    .from('support_questions')
    .select('id, user_telegram_id, question, created_at')
    .ilike('id', `${questionShortId}%`)
    .eq('status', 'pending')
    .maybeSingle();

  if (error || !question) {
    await answerCallbackQuery(id, '❌ Вопрос не найден');
    return;
  }

  // Get user profile for username
  const { data: profile } = await supabase
    .from('profiles')
    .select('username, first_name')
    .eq('telegram_id', question.user_telegram_id)
    .maybeSingle();

  const userDisplay = profile?.username ? `@${profile.username}` : `ID:${question.user_telegram_id}`;

  const questionMessage = `❓ <b>Вопрос в поддержку</b>

👤 <b>От:</b> ${profile?.first_name || 'User'} (${userDisplay})
🆔 <b>Telegram ID:</b> ${question.user_telegram_id}

📝 <b>Вопрос:</b>
${question.question}`;

  const keyboard = {
    inline_keyboard: [
      [{ text: '💬 Ответить', callback_data: `support_answer:${question.user_telegram_id}:${question.id.substring(0, 8)}` }]
    ]
  };

  await answerCallbackQuery(id);
  await sendAdminMessage(message.chat.id, questionMessage, { reply_markup: keyboard });
}

// Handle reply to support question
async function handleSupportReply(chatId: number, userId: number, text: string, replyToMessageId: number): Promise<boolean> {
  if (!isAdmin(userId)) return false;

  console.log('Checking for support question with admin_message_id:', replyToMessageId);

  const { data: question, error } = await supabase
    .from('support_questions')
    .select('id, user_telegram_id, question')
    .eq('admin_message_id', replyToMessageId)
    .eq('status', 'pending')
    .maybeSingle();

  if (error) {
    console.error('Error finding question:', error);
    return false;
  }
  
  if (!question) {
    console.log('No pending question found for message_id:', replyToMessageId);
    return false;
  }

  console.log('Found question:', question.id, 'sending reply to user:', question.user_telegram_id);

  // Update question status
  const { error: updateError } = await supabase
    .from('support_questions')
    .update({
      answer: text,
      answered_by_telegram_id: userId,
      status: 'answered',
      answered_at: new Date().toISOString(),
    })
    .eq('id', question.id);

  if (updateError) {
    console.error('Error updating question:', updateError);
    await sendAdminMessage(chatId, '❌ Ошибка при сохранении ответа');
    return true;
  }

  // Send reply to user
  const sendResult = await sendUserMessage(
    question.user_telegram_id,
    `💬 <b>Ответ от поддержки BoysHub</b>

<b>Ваш вопрос:</b>
${question.question}

<b>Ответ:</b>
${text}

<i>Если у вас есть ещё вопросы, напишите /start и выберите поддержку.</i>`
  );

  console.log('Send result:', sendResult);

  await sendAdminMessage(chatId, `✅ Ответ отправлен пользователю ${question.user_telegram_id}`);
  return true;
}

// Get or create short ID for article
async function getOrCreateShortId(articleId: string): Promise<string> {
  const { data, error } = await supabase.rpc('get_or_create_short_id', { p_article_id: articleId });
  
  if (error) {
    console.error('Error getting short ID:', error);
    return articleId.substring(0, 8);
  }
  
  return data;
}

// Get article ID by short ID
async function getArticleIdByShortId(shortId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('moderation_short_ids')
    .select('article_id')
    .eq('short_id', shortId)
    .maybeSingle();

  if (error || !data) {
    console.error('Error finding article by short ID:', error);
    return null;
  }

  return data.article_id;
}

// Handle approve callback
async function handleApprove(callbackQuery: any, shortId: string) {
  const { id, message, from } = callbackQuery;

  const articleId = await getArticleIdByShortId(shortId);
  if (!articleId) {
    await answerCallbackQuery(id, '❌ Статья не найдена');
    return;
  }

  const { error } = await supabase
    .from('articles')
    .update({ status: 'approved' })
    .eq('id', articleId);

  if (error) {
    console.error('Error approving article:', error);
    await answerCallbackQuery(id, '❌ Ошибка при одобрении');
    return;
  }

  const { data: article } = await supabase
    .from('articles')
    .select('title, topic, author:author_id(telegram_id, first_name, username)')
    .eq('id', articleId)
    .maybeSingle();

  const authorData = article?.author as any;
  const notifyLabel = (article?.topic && String(article.topic).trim().length ? article.topic : article?.title) || 'ваша статья';

  await supabase.from('moderation_logs').insert({
    article_id: articleId,
    moderator_telegram_id: from.id,
    action: 'approved',
  });

  if (authorData?.telegram_id) {
    await sendUserMessage(
      authorData.telegram_id,
      `✅ <b>Ваша статья одобрена!</b>

📝 "${notifyLabel}"

Статья опубликована и доступна для всех пользователей в приложении ManHub.`
    );
  }

  await answerCallbackQuery(id, '✅ Статья одобрена');
  await editMessageReplyMarkup(message.chat.id, message.message_id);
  await sendAdminMessage(message.chat.id, `✅ Статья "${article?.title}" одобрена и опубликована`);
}

// Handle reject callback
async function handleReject(callbackQuery: any, shortId: string) {
  const { id, message, from } = callbackQuery;

  const articleId = await getArticleIdByShortId(shortId);
  if (!articleId) {
    await answerCallbackQuery(id, '❌ Статья не найдена');
    return;
  }

  await supabase.from('pending_rejections').insert({
    short_id: shortId,
    article_id: articleId,
    admin_telegram_id: from.id,
  });

  await answerCallbackQuery(id, '📝 Напишите причину отклонения');
  await editMessageReplyMarkup(message.chat.id, message.message_id);
  await sendAdminMessage(message.chat.id, `📝 <b>Укажите причину отклонения:</b>\n\nОтправьте текст причины следующим сообщением.`);
}

// Handle rejection reason text
async function handleRejectionReason(chatId: number, userId: number, text: string): Promise<boolean> {
  const { data: pending, error } = await supabase
    .from('pending_rejections')
    .select('article_id, short_id')
    .eq('admin_telegram_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !pending) {
    return false;
  }

  const { error: updateError } = await supabase
    .from('articles')
    .update({
      status: 'rejected',
      rejection_reason: text,
    })
    .eq('id', pending.article_id);

  if (updateError) {
    console.error('Error rejecting article:', updateError);
    await sendAdminMessage(chatId, '❌ Ошибка при отклонении статьи');
    return true;
  }

  const { data: article } = await supabase
    .from('articles')
    .select('title, author:author_id(telegram_id, first_name, username)')
    .eq('id', pending.article_id)
    .maybeSingle();

  const authorData = article?.author as any;

  await supabase.from('moderation_logs').insert({
    article_id: pending.article_id,
    moderator_telegram_id: userId,
    action: 'rejected',
    reason: text,
  });

  if (authorData?.telegram_id) {
    await sendUserMessage(
      authorData.telegram_id,
      `❌ <b>Ваша статья отклонена</b>

📝 "${article?.title}"

<b>Причина:</b> ${text}

Вы можете исправить статью и отправить на модерацию повторно.`
    );
  }

  await supabase
    .from('pending_rejections')
    .delete()
    .eq('article_id', pending.article_id);

  await sendAdminMessage(chatId, `❌ Статья "${article?.title}" отклонена\n\n<b>Причина:</b> ${text}`);
  return true;
}

// Handle edit approve callback
async function handleEditApprove(callbackQuery: any, shortId: string) {
  const { id, message, from } = callbackQuery;

  const articleId = await getArticleIdByShortId(shortId);
  if (!articleId) {
    await answerCallbackQuery(id, '❌ Статья не найдена');
    return;
  }

  // Get article with pending edit
  const { data: article, error: aErr } = await supabase
    .from('articles')
    .select('id, title, pending_edit, author:author_id(telegram_id, username)')
    .eq('id', articleId)
    .maybeSingle();

  if (aErr || !article || !article.pending_edit) {
    await answerCallbackQuery(id, '❌ Редактирование не найдено');
    return;
  }

  const pendingEdit = article.pending_edit as any;

  // Apply the edit
  const { error: updateErr } = await supabase
    .from('articles')
    .update({
      title: pendingEdit.title || article.title,
      topic: pendingEdit.topic,
      body: pendingEdit.body,
      media_url: pendingEdit.media_url,
      is_anonymous: pendingEdit.is_anonymous,
      sources: pendingEdit.sources,
      pending_edit: null,
      edited_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', articleId);

  if (updateErr) {
    console.error('Error applying edit:', updateErr);
    await answerCallbackQuery(id, '❌ Ошибка при применении редактирования');
    return;
  }

  const authorData = article.author as any;

  // Log moderation action
  await supabase.from('moderation_logs').insert({
    article_id: articleId,
    moderator_telegram_id: from.id,
    action: 'edit_approved',
  });

  // Notify author
  if (authorData?.telegram_id) {
    await sendUserMessage(
      authorData.telegram_id,
      `✅ <b>Редактирование одобрено!</b>

📝 "${article.title}"

Ваши изменения применены и опубликованы.`
    );
  }

  await answerCallbackQuery(id, '✅ Редактирование одобрено');
  await editMessageReplyMarkup(message.chat.id, message.message_id);
  await sendAdminMessage(message.chat.id, `✅ Редактирование статьи "${article.title}" одобрено`);
}

// Handle edit reject callback
async function handleEditReject(callbackQuery: any, shortId: string) {
  const { id, message, from } = callbackQuery;

  const articleId = await getArticleIdByShortId(shortId);
  if (!articleId) {
    await answerCallbackQuery(id, '❌ Статья не найдена');
    return;
  }

  // Clear pending edit without applying
  const { data: article, error: aErr } = await supabase
    .from('articles')
    .select('id, title, author:author_id(telegram_id)')
    .eq('id', articleId)
    .maybeSingle();

  if (aErr || !article) {
    await answerCallbackQuery(id, '❌ Статья не найдена');
    return;
  }

  // Clear pending edit
  const { error: updateErr } = await supabase
    .from('articles')
    .update({
      pending_edit: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', articleId);

  if (updateErr) {
    console.error('Error rejecting edit:', updateErr);
    await answerCallbackQuery(id, '❌ Ошибка');
    return;
  }

  const authorData = article.author as any;

  // Log moderation action
  await supabase.from('moderation_logs').insert({
    article_id: articleId,
    moderator_telegram_id: from.id,
    action: 'edit_rejected',
  });

  // Notify author
  if (authorData?.telegram_id) {
    await sendUserMessage(
      authorData.telegram_id,
      `❌ <b>Редактирование отклонено</b>

📝 "${article.title}"

Ваши изменения не были применены. Вы можете попробовать ещё раз.`
    );
  }

  await answerCallbackQuery(id, '❌ Редактирование отклонено');
  await editMessageReplyMarkup(message.chat.id, message.message_id);
  await sendAdminMessage(message.chat.id, `❌ Редактирование статьи "${article.title}" отклонено`);
}

// ==================== PRODUCT MODERATION ====================

const PRODUCTS_PER_PAGE = 10;

// Handle /product command
async function handleProducts(chatId: number, userId: number, page: number = 0, messageId?: number) {
  if (!isAdmin(userId)) return;

  const from = page * PRODUCTS_PER_PAGE;

  // Get pending count
  const { count: pendingCount } = await supabase
    .from('user_products')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  // Get approved count
  const { count: approvedCount } = await supabase
    .from('user_products')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved');

  // Get rejected count
  const { count: rejectedCount } = await supabase
    .from('user_products')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'rejected');

  // Get all products ordered by created_at
  const { count: totalCount } = await supabase
    .from('user_products')
    .select('*', { count: 'exact', head: true });

  const { data: products, error } = await supabase
    .from('user_products')
    .select(`
      id,
      title,
      price,
      currency,
      status,
      short_code,
      created_at,
      user:user_profile_id(telegram_id, username, first_name)
    `)
    .order('created_at', { ascending: false })
    .range(from, from + PRODUCTS_PER_PAGE - 1);

  if (error) {
    console.error('Error fetching products:', error);
    await sendAdminMessage(chatId, '❌ Ошибка загрузки продуктов');
    return;
  }

  const totalPages = Math.ceil((totalCount || 0) / PRODUCTS_PER_PAGE);

  let message = `📦 <b>Продукты</b>

📊 <b>Статистика:</b>
├ ⏳ На модерации: ${pendingCount || 0}
├ ✅ Одобрено: ${approvedCount || 0}
└ ❌ Отклонено: ${rejectedCount || 0}

📄 Страница ${page + 1}/${totalPages || 1}\n\n`;

  if (!products || products.length === 0) {
    message += '<i>Нет продуктов</i>';
  } else {
    for (const product of products) {
      const user = (product as any).user;
      const statusIcon = product.status === 'pending' ? '⏳' : product.status === 'approved' ? '✅' : '❌';
      const userDisplay = user?.username ? '@' + user.username : user?.first_name || `ID:${user?.telegram_id}`;
      
      message += `${statusIcon} <b>${product.title}</b>\n`;
      message += `   🏷 <code>${product.short_code || 'N/A'}</code>\n`;
      message += `   💰 ${product.price} ${product.currency}\n`;
      message += `   👤 ${userDisplay}\n\n`;
    }
  }

  // Build keyboard
  const buttons: any[][] = [];
  if (products && products.length > 0) {
    for (const product of products) {
      if (product.status === 'pending') {
        buttons.push([
          { text: `✅ ${(product.title || '').substring(0, 15)}`, callback_data: `product_approve:${product.id}` },
          { text: `❌`, callback_data: `product_reject:${product.id}` },
        ]);
      }
    }
  }

  // Pagination
  const prevPage = page > 0 ? page - 1 : page;
  const nextPage = page < totalPages - 1 ? page + 1 : page;
  if (totalPages > 1) {
    buttons.push([
      { text: '⬅️ Назад', callback_data: `products:${prevPage}` },
      { text: 'Вперёд ➡️', callback_data: `products:${nextPage}` },
    ]);
  }

  const keyboard = { inline_keyboard: buttons };

  if (messageId) {
    await editAdminMessage(chatId, messageId, message, { reply_markup: keyboard });
  } else {
    await sendAdminMessage(chatId, message, { reply_markup: keyboard });
  }
}

// Handle product approve callback
async function handleProductApprove(callbackQuery: any, productId: string) {
  const { id, message, from } = callbackQuery;

  const { data: product, error: fetchError } = await supabase
    .from('user_products')
    .select('*, user:user_profile_id(telegram_id, first_name, username)')
    .eq('id', productId)
    .maybeSingle();

  if (fetchError || !product) {
    await answerCallbackQuery(id, '❌ Продукт не найден');
    return;
  }

  const { error } = await supabase
    .from('user_products')
    .update({
      status: 'approved',
      moderated_at: new Date().toISOString(),
      moderated_by_telegram_id: from.id,
      rejection_reason: null,
    })
    .eq('id', productId);

  if (error) {
    console.error('Error approving product:', error);
    await answerCallbackQuery(id, '❌ Ошибка одобрения');
    return;
  }

  const user = product.user as any;
  
  // Notify user
  if (user?.telegram_id) {
    await sendUserMessage(
      user.telegram_id,
      `✅ <b>Ваш продукт одобрен!</b>

📦 "${product.title}"

Теперь он виден в вашем публичном профиле.`
    );
  }

  await answerCallbackQuery(id, '✅ Продукт одобрен');
  await editMessageReplyMarkup(message.chat.id, message.message_id);
  await sendAdminMessage(message.chat.id, `✅ Продукт "${product.title}" одобрен`);
}

// Handle product reject callback (start)
async function handleProductRejectStart(callbackQuery: any, productId: string) {
  const { id, message, from } = callbackQuery;

  const { data: product } = await supabase
    .from('user_products')
    .select('id, title')
    .eq('id', productId)
    .maybeSingle();

  if (!product) {
    await answerCallbackQuery(id, '❌ Продукт не найден');
    return;
  }

  // Clean up old pending rejections for this admin
  await supabase
    .from('pending_product_rejections')
    .delete()
    .eq('admin_telegram_id', from.id);

  // Store pending rejection in database
  await supabase
    .from('pending_product_rejections')
    .insert({
      product_id: productId,
      admin_telegram_id: from.id,
    });

  await answerCallbackQuery(id);
  await editMessageReplyMarkup(message.chat.id, message.message_id);
  await sendAdminMessage(
    message.chat.id,
    `❌ Отклонение продукта "<b>${product.title}</b>"\n\nОтправьте причину отклонения:`
  );
}

// Handle product rejection reason
async function handleProductRejectionReason(chatId: number, userId: number, text: string): Promise<boolean> {
  // Check database for pending rejection
  const { data: pending, error: pendingError } = await supabase
    .from('pending_product_rejections')
    .select('product_id')
    .eq('admin_telegram_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (pendingError || !pending) return false;

  const productId = pending.product_id;

  // Delete pending rejection
  await supabase
    .from('pending_product_rejections')
    .delete()
    .eq('admin_telegram_id', userId);

  const { data: product, error: fetchError } = await supabase
    .from('user_products')
    .select('*, user:user_profile_id(telegram_id, first_name, username)')
    .eq('id', productId)
    .maybeSingle();

  if (fetchError || !product) {
    await sendAdminMessage(chatId, '❌ Продукт не найден');
    return true;
  }

  const { error } = await supabase
    .from('user_products')
    .update({
      status: 'rejected',
      rejection_reason: text,
      moderated_at: new Date().toISOString(),
      moderated_by_telegram_id: userId,
    })
    .eq('id', productId);

  if (error) {
    console.error('Error rejecting product:', error);
    await sendAdminMessage(chatId, '❌ Ошибка отклонения продукта');
    return true;
  }

  const user = product.user as any;
  
  // Notify user
  if (user?.telegram_id) {
    await sendUserMessage(
      user.telegram_id,
      `❌ <b>Ваш продукт отклонён</b>

📦 "${product.title}"

<b>Причина:</b> ${text}

Вы можете исправить продукт и отправить повторно.`
    );
    
    // Create notification in database
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('telegram_id', user.telegram_id)
      .maybeSingle();
    
    if (userProfile) {
      await supabase.from('notifications').insert({
        user_profile_id: userProfile.id,
        type: 'product_rejected',
        message: `Ваш продукт "${product.title}" был отклонён: ${text}`,
        is_read: false,
      });
    }
  }

  await sendAdminMessage(chatId, `❌ Продукт "${product.title}" отклонён\n\n<b>Причина:</b> ${text}`);
  return true;
}

// Handle product delete callback
async function handleProductDelete(callbackQuery: any, productId: string) {
  const { id, message } = callbackQuery;

  const { data: product, error: fetchError } = await supabase
    .from('user_products')
    .select('id, title, user:user_profile_id(telegram_id)')
    .eq('id', productId)
    .maybeSingle();

  if (fetchError || !product) {
    await answerCallbackQuery(id, '❌ Продукт не найден');
    return;
  }

  const { error } = await supabase
    .from('user_products')
    .delete()
    .eq('id', productId);

  if (error) {
    console.error('Error deleting product:', error);
    await answerCallbackQuery(id, '❌ Ошибка удаления');
    return;
  }

  const user = product.user as any;
  
  // Notify user
  if (user?.telegram_id) {
    await sendUserMessage(
      user.telegram_id,
      `🗑 <b>Ваш продукт был удалён</b>

📦 "${product.title}"

Продукт удалён администратором.`
    );
  }

  await answerCallbackQuery(id, '🗑 Продукт удалён');
  await editMessageReplyMarkup(message.chat.id, message.message_id);
  await sendAdminMessage(message.chat.id, `🗑 Продукт "${product.title}" удалён`);
}

// ==================== REFERRAL MANAGEMENT ====================

const REFERRERS_PER_PAGE = 15;

// Get user's bot username - use correct bot name
function getBotUsername(): string {
  return 'Man_Hub_Bot';
}

// Handle /ref command - list users who invite others
async function handleReferrals(chatId: number, userId: number, page: number = 0, messageId?: number) {
  if (!isAdmin(userId)) return;

  const from = page * REFERRERS_PER_PAGE;

  // Get users who have referrals (those who referred at least one person)
  const { data: referrers, error } = await supabase
    .from('profiles')
    .select(`
      id,
      telegram_id,
      username,
      first_name,
      last_name,
      referral_code,
      referral_earnings
    `)
    .not('referral_code', 'is', null)
    .order('referral_earnings', { ascending: false })
    .range(from, from + REFERRERS_PER_PAGE - 1);

  if (error) {
    console.error('Error fetching referrers:', error);
    await sendAdminMessage(chatId, '❌ Ошибка загрузки данных рефералов');
    return;
  }

  // Get total count of referrers
  const { count: totalCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .not('referral_code', 'is', null);

  // Get referral counts for each referrer
  const referrerIds = referrers?.map(r => r.id) || [];
  const referralCounts: Record<string, number> = {};
  
  if (referrerIds.length > 0) {
    for (const referrerId of referrerIds) {
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('referred_by', referrerId);
      referralCounts[referrerId] = count || 0;
    }
  }

  // Sort by referral count descending
  const sortedReferrers = referrers?.sort((a, b) => 
    (referralCounts[b.id] || 0) - (referralCounts[a.id] || 0)
  ) || [];

  const totalPages = Math.ceil((totalCount || 0) / REFERRERS_PER_PAGE);

  let message = `🔗 <b>Управление рефералами</b>\n`;
  message += `📄 Страница ${page + 1}/${totalPages || 1}\n\n`;

  if (!sortedReferrers || sortedReferrers.length === 0) {
    message += '<i>Нет пользователей с реферальными ссылками</i>';
  } else {
    for (const ref of sortedReferrers) {
      const username = ref.username ? `@${ref.username}` : `${ref.first_name || 'ID:' + ref.telegram_id}`;
      const count = referralCounts[ref.id] || 0;
      const earnings = ref.referral_earnings || 0;
      message += `👤 <b>${username}</b>\n`;
      message += `   👥 Приглашено: ${count} | 💰 ${earnings} ₽\n`;
    }
  }

  // Build keyboard
  const buttons: any[][] = [];
  if (sortedReferrers && sortedReferrers.length > 0) {
    for (const ref of sortedReferrers) {
      const label = ref.username ? `@${ref.username}` : `${ref.telegram_id}`;
      buttons.push([{ text: `⚙️ ${label}`, callback_data: `ref_user:${ref.telegram_id}` }]);
    }
  }

  // Pagination
  const prevPage = page > 0 ? page - 1 : page;
  const nextPage = page < totalPages - 1 ? page + 1 : page;
  if (totalPages > 1) {
    buttons.push([
      { text: '⬅️ Назад', callback_data: `referrals:${prevPage}` },
      { text: 'Вперёд ➡️', callback_data: `referrals:${nextPage}` },
    ]);
  }

  const keyboard = { inline_keyboard: buttons };

  if (messageId) {
    await editAdminMessage(chatId, messageId, message, { reply_markup: keyboard });
  } else {
    await sendAdminMessage(chatId, message, { reply_markup: keyboard });
  }
}

// Handle viewing referrer details
async function handleReferrerProfile(callbackQuery: any, telegramId: string) {
  const { id, message } = callbackQuery;

  const { data: user, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('telegram_id', telegramId)
    .maybeSingle();

  if (error || !user) {
    await answerCallbackQuery(id, '❌ Пользователь не найден');
    return;
  }

  // Get referral count
  const { count: referralCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('referred_by', user.id);

  // Get list of referred users (last 5)
  const { data: referredUsers } = await supabase
    .from('profiles')
    .select('telegram_id, username, first_name, created_at')
    .eq('referred_by', user.id)
    .order('created_at', { ascending: false })
    .limit(5);

  const botUsername = getBotUsername();
  const referralLink = user.referral_code 
    ? `https://t.me/${botUsername}?start=ref_${user.referral_code}`
    : 'Не создана';

  const username = user.username ? `@${user.username}` : (user.first_name || `ID:${user.telegram_id}`);

  let profileMessage = `🔗 <b>Реферальный профиль</b>

👤 <b>Пользователь:</b> ${username}
🆔 <b>Telegram ID:</b> ${user.telegram_id}

📊 <b>Статистика:</b>
├ 👥 Приглашено: ${referralCount || 0}
├ 💰 Заработано: ${user.referral_earnings || 0} ₽
└ 🔗 Код: <code>${user.referral_code || 'Нет'}</code>

🔗 <b>Ссылка:</b>
<code>${referralLink}</code>`;

  if (referredUsers && referredUsers.length > 0) {
    profileMessage += `\n\n👥 <b>Последние приглашённые:</b>`;
    for (const ru of referredUsers) {
      const ruName = ru.username ? `@${ru.username}` : (ru.first_name || `ID:${ru.telegram_id}`);
      const date = new Date(ru.created_at).toLocaleDateString('ru-RU');
      profileMessage += `\n├ ${ruName} (${date})`;
    }
  }

  const buttons: any[][] = [
    [
      { text: '💰 Добавить баланс', callback_data: `ref_add_balance:${user.telegram_id}` },
      { text: '🗑 Обнулить баланс', callback_data: `ref_reset_balance:${user.telegram_id}` }
    ],
    [{ text: '🔄 Обнулить рефералов', callback_data: `ref_reset_referrals:${user.telegram_id}` }],
    [{ text: '◀️ К списку рефералов', callback_data: 'referrals:0' }]
  ];

  const keyboard = { inline_keyboard: buttons };

  await answerCallbackQuery(id);
  await editAdminMessage(message.chat.id, message.message_id, profileMessage, { reply_markup: keyboard });
}

// Handle reset referrals
async function handleResetReferrals(callbackQuery: any, telegramId: string) {
  const { id, message } = callbackQuery;

  const { data: user } = await supabase
    .from('profiles')
    .select('id')
    .eq('telegram_id', telegramId)
    .maybeSingle();

  if (!user) {
    await answerCallbackQuery(id, '❌ Пользователь не найден');
    return;
  }

  // Remove referred_by for all users who were referred by this user
  const { error } = await supabase
    .from('profiles')
    .update({ referred_by: null })
    .eq('referred_by', user.id);

  if (error) {
    console.error('Error resetting referrals:', error);
    await answerCallbackQuery(id, '❌ Ошибка сброса');
    return;
  }

  await answerCallbackQuery(id, '✅ Рефералы обнулены');
  await handleReferrerProfile(callbackQuery, telegramId);
}

// Handle reset balance
async function handleResetReferralBalance(callbackQuery: any, telegramId: string) {
  const { id, message } = callbackQuery;

  const { error } = await supabase
    .from('profiles')
    .update({ referral_earnings: 0 })
    .eq('telegram_id', telegramId);

  if (error) {
    console.error('Error resetting balance:', error);
    await answerCallbackQuery(id, '❌ Ошибка сброса');
    return;
  }

  await answerCallbackQuery(id, '✅ Баланс обнулён');
  await handleReferrerProfile(callbackQuery, telegramId);
}

// Handle add balance start - store in admin_settings for persistence
async function handleAddBalanceStart(callbackQuery: any, telegramId: string) {
  const { id, message, from } = callbackQuery;

  // Store pending balance addition in admin_settings
  await supabase.from('admin_settings').upsert({
    key: `pending_balance_${from.id}`,
    value: telegramId
  }, { onConflict: 'key' });

  await answerCallbackQuery(id);
  await sendAdminMessage(message.chat.id, `💰 Введите сумму для добавления к балансу пользователя (в рублях):

Пример: <code>500</code>

Для отмены отправьте /cancel`);
}

// Handle balance input
async function handleBalanceInput(chatId: number, adminId: number, text: string): Promise<boolean> {
  // Check if there's a pending balance addition
  const { data: pending } = await supabase
    .from('admin_settings')
    .select('value')
    .eq('key', `pending_balance_${adminId}`)
    .maybeSingle();

  if (!pending?.value) return false;

  const targetTelegramId = pending.value;

  if (text === '/cancel') {
    await supabase.from('admin_settings').delete().eq('key', `pending_balance_${adminId}`);
    await sendAdminMessage(chatId, '❌ Отменено');
    return true;
  }

  const amount = parseFloat(text);
  if (isNaN(amount) || amount <= 0) {
    await sendAdminMessage(chatId, '❌ Введите корректную сумму (положительное число)');
    return true;
  }

  // Get current balance
  const { data: user } = await supabase
    .from('profiles')
    .select('referral_earnings')
    .eq('telegram_id', targetTelegramId)
    .maybeSingle();

  if (!user) {
    await supabase.from('admin_settings').delete().eq('key', `pending_balance_${adminId}`);
    await sendAdminMessage(chatId, '❌ Пользователь не найден');
    return true;
  }

  const newBalance = (user.referral_earnings || 0) + amount;

  const { error } = await supabase
    .from('profiles')
    .update({ referral_earnings: newBalance })
    .eq('telegram_id', targetTelegramId);

  // Clean up pending state
  await supabase.from('admin_settings').delete().eq('key', `pending_balance_${adminId}`);

  if (error) {
    console.error('Error adding balance:', error);
    await sendAdminMessage(chatId, '❌ Ошибка добавления баланса');
    return true;
  }

  await sendAdminMessage(chatId, `✅ Добавлено ${amount} ₽ к балансу

Новый баланс: ${newBalance} ₽`, {
    reply_markup: {
      inline_keyboard: [[{ text: '◀️ К профилю', callback_data: `ref_user:${targetTelegramId}` }]]
    }
  });
  return true;
}

// ==================== END REFERRAL MANAGEMENT ====================

// Handle callback queries
async function handleCallbackQuery(callbackQuery: any) {
  const { data, from, message } = callbackQuery;
  
  if (!isAdmin(from.id)) {
    await answerCallbackQuery(callbackQuery.id, '⛔ Доступ запрещён');
    return;
  }

  console.log('Handling callback:', data);
  const parts = data.split(':');
  const action = parts[0];
  const param = parts[1];
  const param2 = parts[2];

  if (action === 'approve') {
    await handleApprove(callbackQuery, param);
  } else if (action === 'reject') {
    await handleReject(callbackQuery, param);
  } else if (action === 'users') {
    await answerCallbackQuery(callbackQuery.id);
    await handleUsers(message.chat.id, from.id, parseInt(param), message.message_id);
  } else if (action === 'user') {
    await handleUserProfile(callbackQuery, param);
  } else if (action === 'premium_grant') {
    await handlePremiumGrant(callbackQuery, param);
  } else if (action === 'premium_revoke') {
    await handlePremiumRevoke(callbackQuery, param);
  } else if (action === 'premium_extend') {
    const days = param2 ? parseInt(param2) : 30;
    await handlePremiumExtend(callbackQuery, param, days);
  } else if (action === 'block') {
    await handleBlockUser(callbackQuery, param);
  } else if (action === 'block_temp_menu') {
    await handleTempBlockMenu(callbackQuery, param);
  } else if (action === 'block_temp') {
    await handleTempBlock(callbackQuery, param, param2);
  } else if (action === 'unblock') {
    await handleUnblockUser(callbackQuery, param);
  } else if (action === 'question') {
    await handleViewQuestion(callbackQuery, param);
  } else if (action === 'support_answer') {
    await handleSupportAnswerStart(callbackQuery, param, param2 || 'none');
  } else if (action === 'articles') {
    await answerCallbackQuery(callbackQuery.id);
    await handleArticles(message.chat.id, from.id, parseInt(param), message.message_id);
  } else if (action === 'article') {
    await handleViewArticle(callbackQuery, param);
  } else if (action === 'delete_article') {
    await handleDeleteArticle(callbackQuery, param);
  } else if (action === 'podcast_add') {
    await handlePodcastAddStart(callbackQuery);
  } else if (action === 'podcast_delete_list') {
    await handlePodcastDeleteList(callbackQuery);
  } else if (action === 'podcast_del') {
    await handlePodcastDelete(callbackQuery, param);
  } else if (action === 'podcast_back') {
    await answerCallbackQuery(callbackQuery.id);
    await handlePodcasts(message.chat.id, from.id);
  } else if (action === 'pl_service') {
    await handlePlaylistService(callbackQuery, param);
  } else if (action === 'pl_add') {
    await handlePlaylistAddStart(callbackQuery, param);
  } else if (action === 'pl_cat') {
    await handlePlaylistCategory(callbackQuery, param);
  } else if (action === 'pl_del_list') {
    await handlePlaylistDeleteList(callbackQuery, param);
  } else if (action === 'pl_del') {
    await handlePlaylistDelete(callbackQuery, param);
  } else if (action === 'pl_back') {
    await answerCallbackQuery(callbackQuery.id);
    await handlePlaylists(message.chat.id, from.id);
  } else if (action === 'edit_approve') {
    await handleEditApprove(callbackQuery, param);
  } else if (action === 'edit_reject') {
    await handleEditReject(callbackQuery, param);
  } else if (action === 'comments') {
    await handleViewComments(callbackQuery, param, parseInt(param2 || '0'));
  } else if (action === 'del_comment') {
    await handleDeleteComment(callbackQuery, param, param2);
  } else if (action === 'report_done') {
    await handleReportDone(callbackQuery, param);
  } else if (action === 'reports') {
    await answerCallbackQuery(callbackQuery.id);
    await handleReports(message.chat.id, from.id, parseInt(param || '0'), message.message_id);
  } else if (action === 'reviews') {
    await answerCallbackQuery(callbackQuery.id);
    await handleReviews(message.chat.id, from.id, parseInt(param || '0'), message.message_id);
  } else if (action === 'review_approve') {
    await handleReviewApprove(callbackQuery, param);
  } else if (action === 'review_reject') {
    await handleReviewReject(callbackQuery, param);
  } else if (action === 'review_delete') {
    await handleReviewDelete(callbackQuery, param);
  } else if (action === 'review_search_delete') {
    await handleReviewSearchDelete(callbackQuery, param);
  } else if (action === 'sub_grant_plus') {
    await handleSubGrantPlus(callbackQuery, param);
  } else if (action === 'sub_grant_premium') {
    await handleSubGrantPremium(callbackQuery, param);
  } else if (action === 'sub_upgrade_premium') {
    await handleSubUpgradePremium(callbackQuery, param);
  } else if (action === 'sub_downgrade_plus') {
    await handleSubDowngradePlus(callbackQuery, param);
  } else if (action === 'sub_revoke') {
    await handleSubRevoke(callbackQuery, param);
  } else if (action === 'sub_extend') {
    await handleSubExtend(callbackQuery, param, parseInt(param2 || '30'));
  } else if (action === 'pr_del') {
    await handlePromoCodeCallback(callbackQuery, 'del', param);
  } else if (action === 'pr_toggle') {
    await handlePromoCodeCallback(callbackQuery, 'toggle', param);
  } else if (action === 'user_report_done') {
    await handleUserReportDone(callbackQuery, param);
  } else if (action === 'user_reports') {
    await answerCallbackQuery(callbackQuery.id);
    await handleUserReports(message.chat.id, from.id, parseInt(param || '0'), message.message_id);
  } else if (action === 'product_approve') {
    await handleProductApprove(callbackQuery, param);
  } else if (action === 'product_reject') {
    await handleProductRejectStart(callbackQuery, param);
  } else if (action === 'product_delete') {
    await handleProductDelete(callbackQuery, param);
  } else if (action === 'products') {
    await answerCallbackQuery(callbackQuery.id);
    await handleProducts(message.chat.id, from.id, parseInt(param || '0'), message.message_id);
  } else if (action === 'hi') {
    // New /hi callback format: hi:action:param
    await handleHiCallback(callbackQuery, param || '', param2);
  } else if (action === 'referrals') {
    await answerCallbackQuery(callbackQuery.id);
    await handleReferrals(message.chat.id, from.id, parseInt(param || '0'), message.message_id);
  } else if (action === 'ref_user') {
    await handleReferrerProfile(callbackQuery, param);
  } else if (action === 'ref_reset_referrals') {
    await handleResetReferrals(callbackQuery, param);
  } else if (action === 'ref_reset_balance') {
    await handleResetReferralBalance(callbackQuery, param);
  } else if (action === 'ref_add_balance') {
    await handleAddBalanceStart(callbackQuery, param);
  }
}

// Handle /zb - article reports
async function handleReports(chatId: number, userId: number, page: number = 0, messageId?: number) {
  if (!isAdmin(userId)) return;

  const REPORTS_PER_PAGE = 10;
  const from = page * REPORTS_PER_PAGE;

  const { count: totalCount } = await supabase
    .from('article_reports')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  const { data: reports, error } = await supabase
    .from('article_reports')
    .select(`
      id,
      reason,
      created_at,
      article_id,
      reporter_profile_id,
      articles:article_id(id, title),
      profiles:reporter_profile_id(telegram_id, username, first_name)
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .range(from, from + REPORTS_PER_PAGE - 1);

  if (error) {
    console.error('Error fetching reports:', error);
    await sendAdminMessage(chatId, '❌ Ошибка загрузки жалоб');
    return;
  }

  const totalPages = Math.ceil((totalCount || 0) / REPORTS_PER_PAGE);

  let message = `🚨 <b>Жалобы на статьи</b> (${totalCount || 0})\n`;
  message += `📄 Страница ${page + 1}/${totalPages || 1}\n\n`;

  if (!reports || reports.length === 0) {
    message += '<i>Нет нерассмотренных жалоб</i>';
  } else {
    for (const report of reports) {
      const art = (report as any).articles;
      const rep = (report as any).profiles;
      const date = new Date(report.created_at).toLocaleDateString('ru-RU');
      message += `📝 <b>${art?.title || 'Статья удалена'}</b>\n`;
      message += `   👤 От: ${rep?.username ? '@' + rep.username : rep?.first_name || 'ID:' + rep?.telegram_id}\n`;
      message += `   📋 ${(report.reason || '').substring(0, 60)}${(report.reason || '').length > 60 ? '...' : ''}\n`;
      message += `   📅 ${date}\n\n`;
    }
  }

  // Build keyboard
  const buttons: any[][] = [];
  if (reports && reports.length > 0) {
    for (const report of reports) {
      const art = (report as any).articles;
      buttons.push([{ text: `✅ Рассмотрено: ${(art?.title || 'Статья').substring(0, 20)}`, callback_data: `report_done:${report.id}` }]);
    }
  }

  // Pagination
  const prevPage = page > 0 ? page - 1 : page;
  const nextPage = page < totalPages - 1 ? page + 1 : page;
  if (totalPages > 1) {
    buttons.push([
      { text: '⬅️ Назад', callback_data: `reports:${prevPage}` },
      { text: 'Вперёд ➡️', callback_data: `reports:${nextPage}` },
    ]);
  }

  const keyboard = { inline_keyboard: buttons };

  if (messageId) {
    await editAdminMessage(chatId, messageId, message, { reply_markup: keyboard });
  } else {
    await sendAdminMessage(chatId, message, { reply_markup: keyboard });
  }
}

// Handle report_done callback
async function handleReportDone(callbackQuery: any, reportId: string) {
  const { id, message, from } = callbackQuery;

  const { error } = await supabase
    .from('article_reports')
    .update({
      status: 'reviewed',
      reviewed_at: new Date().toISOString(),
      reviewed_by_telegram_id: from.id,
    })
    .eq('id', reportId);

  if (error) {
    console.error('Error marking report as done:', error);
    await answerCallbackQuery(id, '❌ Ошибка обновления');
    return;
  }

  await answerCallbackQuery(id, '✅ Жалоба рассмотрена');
  await handleReports(message.chat.id, from.id, 0, message.message_id);
}

// ==================== USER REPORTS MANAGEMENT ====================

const USER_REPORTS_PER_PAGE = 10;

// Handle /user_reports command - show user reports
async function handleUserReports(chatId: number, userId: number, page: number = 0, messageId?: number) {
  if (!isAdmin(userId)) return;

  const from = page * USER_REPORTS_PER_PAGE;

  const { count: totalCount } = await supabase
    .from('user_reports')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  const { data: reports, error } = await supabase
    .from('user_reports')
    .select(`
      id,
      reason,
      status,
      created_at,
      reported_user:reported_user_id(telegram_id, username, first_name),
      reporter:reporter_profile_id(telegram_id, username, first_name)
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .range(from, from + USER_REPORTS_PER_PAGE - 1);

  if (error) {
    console.error('Error fetching user reports:', error);
    await sendAdminMessage(chatId, '❌ Ошибка загрузки жалоб на пользователей');
    return;
  }

  const totalPages = Math.ceil((totalCount || 0) / USER_REPORTS_PER_PAGE);

  let message = `👤 <b>Жалобы на пользователей</b> (${totalCount || 0})\n`;
  message += `📄 Страница ${page + 1}/${totalPages || 1}\n\n`;

  if (!reports || reports.length === 0) {
    message += '<i>Нет нерассмотренных жалоб</i>';
  } else {
    for (const report of reports) {
      const reported = (report as any).reported_user;
      const reporter = (report as any).reporter;
      const date = new Date(report.created_at).toLocaleDateString('ru-RU');
      const reportedDisplay = reported?.username ? '@' + reported.username : reported?.first_name || `ID:${reported?.telegram_id}`;
      const reporterDisplay = reporter?.username ? '@' + reporter.username : reporter?.first_name || `ID:${reporter?.telegram_id}`;
      
      message += `🚨 <b>${reportedDisplay}</b>\n`;
      message += `   📋 ${(report.reason || '').substring(0, 60)}${(report.reason || '').length > 60 ? '...' : ''}\n`;
      message += `   👮 От: ${reporterDisplay}\n`;
      message += `   📅 ${date}\n\n`;
    }
  }

  // Build keyboard
  const buttons: any[][] = [];
  if (reports && reports.length > 0) {
    for (const report of reports) {
      const reported = (report as any).reported_user;
      const reportedDisplay = reported?.username ? '@' + reported.username : (reported?.first_name || 'Пользователь').substring(0, 15);
      buttons.push([
        { text: `✅ Рассмотрено: ${reportedDisplay}`, callback_data: `user_report_done:${report.id}` },
        { text: `🚫 Заблок.`, callback_data: `block:${reported?.telegram_id}` },
      ]);
    }
  }

  // Pagination
  const prevPage = page > 0 ? page - 1 : page;
  const nextPage = page < totalPages - 1 ? page + 1 : page;
  if (totalPages > 1) {
    buttons.push([
      { text: '⬅️ Назад', callback_data: `user_reports:${prevPage}` },
      { text: 'Вперёд ➡️', callback_data: `user_reports:${nextPage}` },
    ]);
  }

  const keyboard = { inline_keyboard: buttons };

  if (messageId) {
    await editAdminMessage(chatId, messageId, message, { reply_markup: keyboard });
  } else {
    await sendAdminMessage(chatId, message, { reply_markup: keyboard });
  }
}

// Handle user_report_done callback
async function handleUserReportDone(callbackQuery: any, reportId: string) {
  const { id, message, from } = callbackQuery;

  const { error } = await supabase
    .from('user_reports')
    .update({
      status: 'reviewed',
      reviewed_at: new Date().toISOString(),
      reviewed_by_telegram_id: from.id,
    })
    .eq('id', reportId);

  if (error) {
    console.error('Error marking user report as done:', error);
    await answerCallbackQuery(id, '❌ Ошибка обновления');
    return;
  }

  await answerCallbackQuery(id, '✅ Жалоба рассмотрена');
  await handleUserReports(message.chat.id, from.id, 0, message.message_id);
}

// ==================== REVIEWS MANAGEMENT ====================

const REVIEWS_PER_PAGE = 10;

// Handle /otz command - show reviews
async function handleReviews(chatId: number, userId: number, page: number = 0, messageId?: number) {
  if (!isAdmin(userId)) return;

  const from = page * REVIEWS_PER_PAGE;

  // Get stats
  const { count: totalCount } = await supabase
    .from('reviews')
    .select('*', { count: 'exact', head: true });

  const { count: pendingCount } = await supabase
    .from('reviews')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  const { data: allReviews } = await supabase
    .from('reviews')
    .select('rating')
    .eq('status', 'approved');

  const avgRating = allReviews && allReviews.length > 0
    ? (allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length).toFixed(1)
    : '0.0';

  // Get reviews with pagination
  const { data: reviews, error } = await supabase
    .from('reviews')
    .select(`
      id,
      rating,
      review_text,
      suggestions,
      status,
      created_at,
      user:user_profile_id(telegram_id, username, first_name)
    `)
    .order('created_at', { ascending: false })
    .range(from, from + REVIEWS_PER_PAGE - 1);

  if (error) {
    console.error('Error fetching reviews:', error);
    await sendAdminMessage(chatId, '❌ Ошибка загрузки отзывов');
    return;
  }

  const totalPages = Math.ceil((totalCount || 0) / REVIEWS_PER_PAGE);

  let message = `⭐ <b>Отзывы пользователей</b>

📊 <b>Статистика:</b>
├ Всего: ${totalCount || 0}
├ На модерации: ${pendingCount || 0}
└ Средний рейтинг: ${avgRating}/5

📄 Страница ${page + 1}/${totalPages || 1}\n\n`;

  if (!reviews || reviews.length === 0) {
    message += '<i>Нет отзывов</i>';
  } else {
    for (const review of reviews) {
      const user = review.user as any;
      const stars = '⭐'.repeat(review.rating);
      const statusIcon = review.status === 'pending' ? '⏳' : review.status === 'approved' ? '✅' : '❌';
      const authorDisplay = user?.username ? `@${user.username}` : user?.first_name || `ID:${user?.telegram_id}`;
      
      message += `${statusIcon} ${stars} (${review.rating}/5)\n`;
      message += `   👤 ${authorDisplay}\n`;
      message += `   💬 ${(review.review_text || '').substring(0, 50)}${(review.review_text || '').length > 50 ? '...' : ''}\n`;
      if (review.suggestions) {
        message += `   💡 ${(review.suggestions || '').substring(0, 30)}...\n`;
      }
      message += '\n';
    }
  }

  message += '\n🔍 Поиск: <code>/search_otz текст</code>';

  // Build buttons
  const buttons: any[][] = [];
  if (reviews && reviews.length > 0) {
    for (const review of reviews) {
      const user = review.user as any;
      const label = user?.username ? `@${user.username}` : (user?.first_name || 'Отзыв').substring(0, 15);
      const statusIcon = review.status === 'pending' ? '⏳' : review.status === 'approved' ? '✅' : '❌';
      
      if (review.status === 'pending') {
        buttons.push([
          { text: `✅ ${label}`, callback_data: `review_approve:${review.id}` },
          { text: `❌ ${label}`, callback_data: `review_reject:${review.id}` },
        ]);
      } else {
        buttons.push([{ text: `${statusIcon} 🗑 ${label}`, callback_data: `review_delete:${review.id}` }]);
      }
    }
  }

  // Pagination
  const navButtons: any[] = [];
  if (page > 0) {
    navButtons.push({ text: '⬅️ Назад', callback_data: `reviews:${page - 1}` });
  }
  if (page < totalPages - 1) {
    navButtons.push({ text: 'Вперёд ➡️', callback_data: `reviews:${page + 1}` });
  }
  if (navButtons.length > 0) {
    buttons.push(navButtons);
  }

  const keyboard = { inline_keyboard: buttons };

  if (messageId) {
    await editAdminMessage(chatId, messageId, message, { reply_markup: keyboard });
  } else {
    await sendAdminMessage(chatId, message, { reply_markup: keyboard });
  }
}

// Handle review approve
async function handleReviewApprove(callbackQuery: any, reviewId: string) {
  const { id, message, from } = callbackQuery;

  const { error } = await supabase
    .from('reviews')
    .update({ status: 'approved', updated_at: new Date().toISOString() })
    .eq('id', reviewId);

  if (error) {
    console.error('Error approving review:', error);
    await answerCallbackQuery(id, '❌ Ошибка');
    return;
  }

  await answerCallbackQuery(id, '✅ Отзыв одобрен');
  await handleReviews(message.chat.id, from.id, 0, message.message_id);
}

// Handle review reject
async function handleReviewReject(callbackQuery: any, reviewId: string) {
  const { id, message, from } = callbackQuery;

  const { error } = await supabase
    .from('reviews')
    .update({ status: 'rejected', updated_at: new Date().toISOString() })
    .eq('id', reviewId);

  if (error) {
    console.error('Error rejecting review:', error);
    await answerCallbackQuery(id, '❌ Ошибка');
    return;
  }

  await answerCallbackQuery(id, '❌ Отзыв отклонён');
  await handleReviews(message.chat.id, from.id, 0, message.message_id);
}

// Handle review delete
async function handleReviewDelete(callbackQuery: any, reviewId: string) {
  const { id, message, from } = callbackQuery;

  const { error } = await supabase
    .from('reviews')
    .delete()
    .eq('id', reviewId);

  if (error) {
    console.error('Error deleting review:', error);
    await answerCallbackQuery(id, '❌ Ошибка удаления');
    return;
  }

  await answerCallbackQuery(id, '🗑 Отзыв удалён');
  await handleReviews(message.chat.id, from.id, 0, message.message_id);
}

// Handle review delete from search results
async function handleReviewSearchDelete(callbackQuery: any, reviewId: string) {
  const { id, message } = callbackQuery;

  const { error } = await supabase
    .from('reviews')
    .delete()
    .eq('id', reviewId);

  if (error) {
    console.error('Error deleting review from search:', error);
    await answerCallbackQuery(id, '❌ Ошибка удаления');
    return;
  }

  await answerCallbackQuery(id, '🗑 Отзыв удалён');
  await deleteMessage(message.chat.id, message.message_id);
}

// Handle /search_otz command
async function handleSearchReviews(chatId: number, userId: number, query: string) {
  if (!isAdmin(userId)) return;

  if (!query) {
    await sendAdminMessage(chatId, `🔍 <b>Поиск отзывов</b>

Используйте:
<code>/search_otz текст</code>

Пример:
<code>/search_otz отличное приложение</code>`);
    return;
  }

  const { data: reviews, error } = await supabase
    .from('reviews')
    .select(`
      id,
      rating,
      review_text,
      suggestions,
      status,
      created_at,
      user:user_profile_id(telegram_id, username, first_name)
    `)
    .or(`review_text.ilike.%${query}%,suggestions.ilike.%${query}%`)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error || !reviews || reviews.length === 0) {
    await sendAdminMessage(chatId, `🔍 Отзывы по запросу "<b>${query}</b>" не найдены`);
    return;
  }

  // Send each review as a separate message with delete button
  await sendAdminMessage(chatId, `🔍 <b>Найдено отзывов: ${reviews.length}</b>`);

  for (const review of reviews) {
    const user = review.user as any;
    const stars = '⭐'.repeat(review.rating);
    const statusIcon = review.status === 'pending' ? '⏳' : review.status === 'approved' ? '✅' : '❌';
    const authorDisplay = user?.username ? `@${user.username}` : user?.first_name || `ID:${user?.telegram_id}`;
    
    let message = `${statusIcon} ${stars} (${review.rating}/5)\n`;
    message += `👤 ${authorDisplay}\n`;
    message += `💬 ${review.review_text}`;
    if (review.suggestions) {
      message += `\n💡 ${review.suggestions}`;
    }

    const keyboard = {
      inline_keyboard: [
        [{ text: '🗑 Удалить', callback_data: `review_search_delete:${review.id}` }],
      ],
    };

    await sendAdminMessage(chatId, message, { reply_markup: keyboard });
  }
}

// ==================== /hi COMMAND - WELCOME MESSAGE ====================
// Version: 2.0 - Полностью инлайн-кнопки, без текстовых команд

async function handleHi(chatId: number, userId: number, messageId?: number) {
  if (!isAdmin(userId)) return;

  const { data: settings } = await supabase
    .from('admin_settings')
    .select('key, value')
    .in('key', ['welcome_message_text', 'welcome_message_media_url', 'welcome_message_media_type', 'welcome_message_delay_minutes', 'welcome_message_enabled']);

  const s: Record<string, string> = {};
  settings?.forEach(row => { if (row.value) s[row.key] = row.value; });

  const text = s['welcome_message_text'];
  const delay = s['welcome_message_delay_minutes'] || '15';
  const mediaUrl = s['welcome_message_media_url'];
  const mediaType = s['welcome_message_media_type'];
  const enabled = s['welcome_message_enabled'] !== 'false';

  let msg = `👋 <b>Приветственное сообщение</b>\n\n`;
  msg += `${enabled ? '✅' : '❌'} <b>Статус:</b> ${enabled ? 'Включено' : 'Выключено'}\n`;
  msg += `⏱ <b>Таймер:</b> ${delay} мин\n`;
  msg += `🎬 <b>Медиа:</b> ${mediaUrl ? '✅ (' + mediaType + ')' : '❌ Нет'}\n\n`;
  msg += `📝 <b>Текст:</b>\n`;
  msg += text ? (text.length > 200 ? text.substring(0, 200) + '...' : text) : '<i>Не настроено</i>';

  const keyboard = {
    inline_keyboard: [
      [{ text: '✏️ Изменить текст', callback_data: 'hi:edit_text' }],
      [
        { text: mediaUrl ? '🔄 Изменить медиа' : '➕ Добавить медиа', callback_data: 'hi:edit_media' },
        ...(mediaUrl ? [{ text: '🗑 Убрать медиа', callback_data: 'hi:clear_media' }] : []),
      ],
      [{ text: enabled ? '🔴 Выключить' : '🟢 Включить', callback_data: 'hi:toggle' }],
      [{ text: `⏱ Таймер: ${delay} мин`, callback_data: 'hi:timer' }],
      [{ text: '👁 Предпросмотр', callback_data: 'hi:preview' }],
    ],
  };

  if (messageId) {
    await editAdminMessage(chatId, messageId, msg, { reply_markup: keyboard });
  } else {
    await sendAdminMessage(chatId, msg, { reply_markup: keyboard });
  }
}

async function handleHiCallback(callbackQuery: any, action: string, param?: string) {
  const { id, message, from } = callbackQuery;
  const chatId = message.chat.id;
  const msgId = message.message_id;

  if (action === 'edit_text') {
    await answerCallbackQuery(id);
    await supabase.from('admin_settings').upsert({ key: `hi_pending_${from.id}`, value: 'text' }, { onConflict: 'key' });
    
    await sendAdminMessage(chatId, `✏️ <b>Введите новый текст приветствия</b>\n\nМожно использовать HTML:\n• <code>&lt;b&gt;жирный&lt;/b&gt;</code>\n• <code>&lt;i&gt;курсив&lt;/i&gt;</code>\n• <code>&lt;a href="URL"&gt;ссылка&lt;/a&gt;</code>`, {
      reply_markup: { inline_keyboard: [[{ text: '❌ Отмена', callback_data: 'hi:cancel' }]] }
    });

  } else if (action === 'edit_media') {
    await answerCallbackQuery(id);
    await supabase.from('admin_settings').upsert({ key: `hi_pending_${from.id}`, value: 'media' }, { onConflict: 'key' });
    
    await sendAdminMessage(chatId, `🎬 <b>Отправьте URL медиа</b>\n\nПоддерживаются:\n• Прямые ссылки на изображения (.jpg, .png)\n• Прямые ссылки на видео (.mp4)`, {
      reply_markup: { inline_keyboard: [[{ text: '❌ Отмена', callback_data: 'hi:cancel' }]] }
    });

  } else if (action === 'clear_media') {
    await supabase.from('admin_settings').delete().eq('key', 'welcome_message_media_url');
    await supabase.from('admin_settings').delete().eq('key', 'welcome_message_media_type');
    await answerCallbackQuery(id, '✅ Медиа удалено');
    await handleHi(chatId, from.id, msgId);

  } else if (action === 'toggle') {
    const { data } = await supabase.from('admin_settings').select('value').eq('key', 'welcome_message_enabled').maybeSingle();
    const wasEnabled = data?.value !== 'false';
    await supabase.from('admin_settings').upsert({ key: 'welcome_message_enabled', value: wasEnabled ? 'false' : 'true' }, { onConflict: 'key' });
    await answerCallbackQuery(id, wasEnabled ? '❌ Выключено' : '✅ Включено');
    await handleHi(chatId, from.id, msgId);

  } else if (action === 'timer') {
    await answerCallbackQuery(id);
    const { data } = await supabase.from('admin_settings').select('value').eq('key', 'welcome_message_delay_minutes').maybeSingle();
    const current = data?.value || '15';

    await editAdminMessage(chatId, msgId, `⏱ <b>Таймер приветствия</b>\n\nТекущее значение: <b>${current} мин</b>\n\nВыберите через сколько минут после первого запуска бота отправлять приветствие:`, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '5', callback_data: 'hi:set_timer:5' },
            { text: '10', callback_data: 'hi:set_timer:10' },
            { text: '15', callback_data: 'hi:set_timer:15' },
          ],
          [
            { text: '30', callback_data: 'hi:set_timer:30' },
            { text: '60', callback_data: 'hi:set_timer:60' },
            { text: '120', callback_data: 'hi:set_timer:120' },
          ],
          [{ text: '◀️ Назад', callback_data: 'hi:back' }],
        ],
      },
    });

  } else if (action === 'set_timer' && param) {
    await supabase.from('admin_settings').upsert({ key: 'welcome_message_delay_minutes', value: param }, { onConflict: 'key' });
    await answerCallbackQuery(id, `✅ Таймер: ${param} мин`);
    await handleHi(chatId, from.id, msgId);

  } else if (action === 'preview') {
    await answerCallbackQuery(id);
    
    const { data: settings } = await supabase.from('admin_settings').select('key, value').in('key', ['welcome_message_text', 'welcome_message_media_url', 'welcome_message_media_type', 'welcome_message_delay_minutes']);
    const s: Record<string, string> = {};
    settings?.forEach(row => { if (row.value) s[row.key] = row.value; });

    const text = s['welcome_message_text'];
    const mediaUrl = s['welcome_message_media_url'];
    const mediaType = s['welcome_message_media_type'];
    const delay = s['welcome_message_delay_minutes'] || '15';

    if (!text) {
      await sendAdminMessage(chatId, '❌ Текст не настроен');
      return;
    }

    await sendAdminMessage(chatId, `👁 <b>Предпросмотр</b> (отправляется через ${delay} мин):\n\n───────────`);

    if (mediaUrl && mediaType === 'photo') {
      await fetch(`https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, photo: mediaUrl, caption: text, parse_mode: 'HTML' }),
      });
    } else if (mediaUrl && mediaType === 'video') {
      await fetch(`https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/sendVideo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, video: mediaUrl, caption: text, parse_mode: 'HTML' }),
      });
    } else {
      await sendAdminMessage(chatId, text);
    }

  } else if (action === 'back') {
    await answerCallbackQuery(id);
    await handleHi(chatId, from.id, msgId);

  } else if (action === 'cancel') {
    await supabase.from('admin_settings').delete().eq('key', `hi_pending_${from.id}`);
    await answerCallbackQuery(id, 'Отменено');
    await deleteMessage(chatId, msgId);
  }
}

async function handleHiPendingInput(chatId: number, userId: number, text: string): Promise<boolean> {
  const { data } = await supabase.from('admin_settings').select('value').eq('key', `hi_pending_${userId}`).maybeSingle();
  if (!data?.value) return false;

  const mode = data.value;

  if (mode === 'text') {
    await supabase.from('admin_settings').delete().eq('key', `hi_pending_${userId}`);
    await supabase.from('admin_settings').upsert({ key: 'welcome_message_text', value: text }, { onConflict: 'key' });
    await sendAdminMessage(chatId, '✅ Текст сохранён!', {
      reply_markup: { inline_keyboard: [[{ text: '📋 К настройкам', callback_data: 'hi:back' }]] }
    });
    return true;
  }

  // For media mode, we expect a photo/video, not text - ignore text input
  if (mode === 'media' && text) {
    await sendAdminMessage(chatId, '📷 Отправьте фото или видео, не текст.', {
      reply_markup: { inline_keyboard: [[{ text: '❌ Отмена', callback_data: 'hi:cancel' }]] }
    });
    return true;
  }

  return false;
}

// Handle photo/video uploads for /hi command
async function handleHiMediaUpload(chatId: number, userId: number, message: any): Promise<boolean> {
  const { data } = await supabase.from('admin_settings').select('value').eq('key', `hi_pending_${userId}`).maybeSingle();
  if (!data?.value || data.value !== 'media') return false;

  await supabase.from('admin_settings').delete().eq('key', `hi_pending_${userId}`);

  let fileId: string | null = null;
  let mediaType = 'photo';

  // Check for photo
  if (message.photo && message.photo.length > 0) {
    // Get the largest photo
    fileId = message.photo[message.photo.length - 1].file_id;
    mediaType = 'photo';
  }
  // Check for video
  else if (message.video) {
    fileId = message.video.file_id;
    mediaType = 'video';
  }
  // Check for animation (GIF)
  else if (message.animation) {
    fileId = message.animation.file_id;
    mediaType = 'animation';
  }

  if (!fileId) {
    await sendAdminMessage(chatId, '❌ Не удалось получить файл. Попробуйте ещё раз.', {
      reply_markup: { inline_keyboard: [[{ text: '📋 К настройкам', callback_data: 'hi:back' }]] }
    });
    return true;
  }

  try {
    // Get file path from Telegram
    const fileInfoUrl = `https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/getFile?file_id=${fileId}`;
    const fileInfoRes = await fetch(fileInfoUrl);
    const fileInfo = await fileInfoRes.json();

    if (!fileInfo.ok || !fileInfo.result?.file_path) {
      throw new Error('Failed to get file path');
    }

    // Download file from Telegram
    const fileUrl = `https://api.telegram.org/file/bot${ADMIN_BOT_TOKEN}/${fileInfo.result.file_path}`;
    const fileRes = await fetch(fileUrl);
    const fileBlob = await fileRes.blob();

    // Generate unique filename
    const ext = fileInfo.result.file_path.split('.').pop() || (mediaType === 'video' ? 'mp4' : 'jpg');
    const fileName = `welcome_${Date.now()}.${ext}`;

    // Upload to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('product-media')
      .upload(`welcome/${fileName}`, fileBlob, {
        contentType: fileBlob.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('product-media')
      .getPublicUrl(`welcome/${fileName}`);

    const publicUrl = urlData.publicUrl;

    // Save to settings
    await supabase.from('admin_settings').upsert({ key: 'welcome_message_media_url', value: publicUrl }, { onConflict: 'key' });
    await supabase.from('admin_settings').upsert({ key: 'welcome_message_media_type', value: mediaType }, { onConflict: 'key' });

    await sendAdminMessage(chatId, `✅ ${mediaType === 'video' ? 'Видео' : mediaType === 'animation' ? 'GIF' : 'Фото'} сохранено!`, {
      reply_markup: { inline_keyboard: [[{ text: '📋 К настройкам', callback_data: 'hi:back' }]] }
    });

  } catch (error) {
    console.error('Error uploading media:', error);
    await sendAdminMessage(chatId, '❌ Ошибка загрузки медиа. Попробуйте ещё раз.', {
      reply_markup: { inline_keyboard: [[{ text: '📋 К настройкам', callback_data: 'hi:back' }]] }
    });
  }

  return true;
}
// ==================== END /hi COMMAND ====================

// Send new article notification to admin
export async function sendModerationNotification(article: any) {
  const shortId = await getOrCreateShortId(article.id);
  const authorDisplay = article.author?.username ? `@${article.author.username}` : `ID:${article.author?.telegram_id || 'N/A'}`;

  const message = `🆕 <b>Новая статья на модерации</b>

📝 <b>Заголовок:</b> ${article.title}

👤 <b>Автор:</b> ${article.is_anonymous ? 'Аноним' : authorDisplay}
🆔 <b>Telegram ID:</b> ${article.author?.telegram_id || 'N/A'}

📂 <b>Категория:</b> ${article.category_id || 'Без категории'}

📄 <b>Превью:</b>
${article.preview || article.body?.substring(0, 200) || 'Нет превью'}...

${article.media_url ? `🎬 <b>Медиа:</b> ${article.media_url}` : ''}

⏳ <b>Статус:</b> Ожидает модерации`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '✅ Принять', callback_data: `approve:${shortId}` },
        { text: '❌ Отклонить', callback_data: `reject:${shortId}` },
      ],
    ],
  };

  const result = await sendAdminMessage(TELEGRAM_ADMIN_CHAT_ID, message, {
    reply_markup: keyboard,
  });

  return result;
}

// Main handler
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // GET request - setup webhook or check status
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    
    if (action === 'set_webhook') {
      // Set webhook
      const webhookUrl = `${SUPABASE_URL}/functions/v1/admin-bot`;
      const telegramUrl = `https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/setWebhook`;
      
      const response = await fetch(telegramUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl }),
      });
      
      const result = await response.json();
      console.log('Set webhook result:', result);
      
      return new Response(JSON.stringify({ 
        success: result.ok, 
        webhook_url: webhookUrl,
        telegram_response: result 
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    if (action === 'delete_webhook') {
      const telegramUrl = `https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/deleteWebhook`;
      const response = await fetch(telegramUrl, { method: 'POST' });
      const result = await response.json();
      console.log('Delete webhook result:', result);
      
      return new Response(JSON.stringify({ success: result.ok, telegram_response: result }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    if (action === 'info') {
      const telegramUrl = `https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/getWebhookInfo`;
      const response = await fetch(telegramUrl);
      const result = await response.json();
      console.log('Webhook info:', result);
      
      return new Response(JSON.stringify(result), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    // Default: show available actions
    return new Response(JSON.stringify({
      message: 'Admin Bot API',
      actions: [
        'GET ?action=set_webhook - установить webhook',
        'GET ?action=delete_webhook - удалить webhook',
        'GET ?action=info - информация о webhook'
      ]
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }

  try {
    const update = await req.json();
    console.log('Admin bot received update:', JSON.stringify(update));

    // Handle callback queries (button presses)
    if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
      return new Response('OK', { headers: corsHeaders });
    }

    // Handle messages
    if (update.message) {
      const { chat, text, from, photo, video, animation } = update.message;

      // Check admin access
      if (!isAdmin(from.id)) {
        await sendAdminMessage(chat.id, '⛔ Доступ запрещён. Этот бот только для администраторов.');
        return new Response('OK', { headers: corsHeaders });
      }

      // FIRST: Check if this is a media upload for /hi command
      if (photo || video || animation) {
        const mediaHandled = await handleHiMediaUpload(chat.id, from.id, update.message);
        if (mediaHandled) {
          return new Response('OK', { headers: corsHeaders });
        }
      }

      // Commands
      if (text === '/start') {
        await handleStart(chat.id, from.id);
      } else if (text === '/stats') {
        await handleStats(chat.id, from.id);
      } else if (text === '/users') {
        await handleUsers(chat.id, from.id);
      } else if (text?.startsWith('/search ')) {
        const query = text.replace('/search ', '').trim();
        await handleSearch(chat.id, from.id, query);
      } else if (text === '/search') {
        await handleSearch(chat.id, from.id, '');
      } else if (text === '/premium') {
        await handlePremium(chat.id, from.id);
      } else if (text === '/prices') {
        await handlePrices(chat.id, from.id);
      } else if (text?.startsWith('/set_price ')) {
        const args = text.replace('/set_price ', '').trim();
        await handleSetPrice(chat.id, from.id, args);
      } else if (text === '/set_price') {
        await handleSetPrice(chat.id, from.id, '');
      } else if (text?.startsWith('/set_orig_price ')) {
        const args = text.replace('/set_orig_price ', '').trim();
        await handleSetOrigPrice(chat.id, from.id, args);
      } else if (text === '/set_orig_price') {
        await handleSetOrigPrice(chat.id, from.id, '');
      } else if (text?.startsWith('/set_discount ')) {
        const args = text.replace('/set_discount ', '').trim();
        await handleSetDiscount(chat.id, from.id, args);
      } else if (text === '/set_discount') {
        await handleSetDiscount(chat.id, from.id, '');
      } else if (text?.startsWith('/set_yearly_discount ')) {
        const args = text.replace('/set_yearly_discount ', '').trim();
        await handleSetYearlyDiscount(chat.id, from.id, args);
      } else if (text === '/set_yearly_discount') {
        await handleSetYearlyDiscount(chat.id, from.id, '');
      } else if (text?.startsWith('/extend ')) {
        const args = text.replace('/extend ', '').trim();
        await handleExtendCommand(chat.id, from.id, args);
      } else if (text === '/extend') {
        await handleExtendCommand(chat.id, from.id, '');
      } else if (text?.startsWith('/plus ')) {
        const args = text.replace('/plus ', '').trim();
        await handlePlusCommand(chat.id, from.id, args);
      } else if (text === '/plus') {
        await handlePlusCommand(chat.id, from.id, '');
      } else if (text?.startsWith('/prem ')) {
        const args = text.replace('/prem ', '').trim();
        await handlePremCommand(chat.id, from.id, args);
      } else if (text === '/prem') {
        await handlePremCommand(chat.id, from.id, '');
      } else if (text === '/pending') {
        await handlePending(chat.id, from.id);
      } else if (text === '/st') {
        await handleArticles(chat.id, from.id);
      } else if (text?.startsWith('/search_st ')) {
        const query = text.replace('/search_st ', '').trim();
        await handleSearchArticles(chat.id, from.id, query);
      } else if (text === '/search_st') {
        await handleSearchArticles(chat.id, from.id, '');
      } else if (text === '/questions') {
        await handleQuestions(chat.id, from.id);
      } else if (text === '/zb') {
        await handleReports(chat.id, from.id);
      } else if (text === '/otz') {
        await handleReviews(chat.id, from.id);
      } else if (text?.startsWith('/search_otz ')) {
        const query = text.replace('/search_otz ', '').trim();
        await handleSearchReviews(chat.id, from.id, query);
      } else if (text === '/search_otz') {
        await handleSearchReviews(chat.id, from.id, '');
      } else if (text?.startsWith('/broadcast')) {
        await handleBroadcast(chat.id, from.id, text);
      } else if (text === '/podc') {
        await handlePodcasts(chat.id, from.id);
      } else if (text === '/pl') {
        await handlePlaylists(chat.id, from.id);
      } else if (text === '/pr') {
        await handlePromoCodes(chat.id, from.id);
      } else if (text?.startsWith('/pr_add ')) {
        const args = text.replace('/pr_add ', '').trim();
        await handleAddPromoCode(chat.id, from.id, args);
      } else if (text === '/pr_add') {
        await handleAddPromoCode(chat.id, from.id, '');
      } else if (text?.startsWith('/pr_del ')) {
        const args = text.replace('/pr_del ', '').trim();
        await handleDeletePromoCode(chat.id, from.id, args);
      } else if (text?.startsWith('/pr_edit ')) {
        const args = text.replace('/pr_edit ', '').trim();
        await handleEditPromoCode(chat.id, from.id, args);
      } else if (text?.startsWith('/pr_toggle ')) {
        const args = text.replace('/pr_toggle ', '').trim();
        await handleTogglePromoCode(chat.id, from.id, args);
      } else if (text === '/user_reports') {
        await handleUserReports(chat.id, from.id);
      } else if (text === '/product') {
        await handleProducts(chat.id, from.id);
      } else if (text?.startsWith('/search_product ')) {
        const query = text.replace('/search_product ', '').trim();
        await handleSearchProduct(chat.id, from.id, query);
      } else if (text === '/search_product') {
        await handleSearchProduct(chat.id, from.id, '');
      } else if (text === '/hi') {
        await handleHi(chat.id, from.id);
      } else if (text === '/ref') {
        await handleReferrals(chat.id, from.id);
      } else if (text === '/help') {
        await handleStart(chat.id, from.id);
      } else {
        // FIRST: Check balance input for referral management
        const balanceHandled = await handleBalanceInput(chat.id, from.id, text);
        if (balanceHandled) {
          return new Response('OK', { headers: corsHeaders });
        }

        // Check hi pending input mode
        const hiHandled = await handleHiPendingInput(chat.id, from.id, text);
        if (hiHandled) {
          return new Response('OK', { headers: corsHeaders });
        }

        // Check if this is a product rejection reason
        const productRejectionHandled = await handleProductRejectionReason(chat.id, from.id, text);
        if (productRejectionHandled) {
          return new Response('OK', { headers: corsHeaders });
        }

        // Check if this is a rejection reason (has priority over other inputs)
        const rejectionHandled = await handleRejectionReason(chat.id, from.id, text);
        if (rejectionHandled) {
          return new Response('OK', { headers: corsHeaders });
        }

        // Check if this is a pending support answer
        const supportHandled = await handlePendingSupportAnswer(chat.id, from.id, text);
        if (supportHandled) {
          return new Response('OK', { headers: corsHeaders });
        }

        // Check if this is a reply to a support question (legacy)
        const replyToMessageId = update.message.reply_to_message?.message_id;
        if (replyToMessageId) {
          const handled = await handleSupportReply(chat.id, from.id, text, replyToMessageId);
          if (handled) {
            return new Response('OK', { headers: corsHeaders });
          }
        }

        // Check podcast input
        const podcastHandled = await handlePodcastUrlInput(chat.id, from.id, text);
        if (podcastHandled) {
          return new Response('OK', { headers: corsHeaders });
        }

        // Check playlist input
        const playlistHandled = await handlePlaylistInput(chat.id, from.id, text);
        if (playlistHandled) {
          return new Response('OK', { headers: corsHeaders });
        }
        
        await sendAdminMessage(chat.id, 'Используйте /help для списка команд.');
      }
    }

    return new Response('OK', { headers: corsHeaders });
  } catch (error) {
    console.error('Admin bot error:', error);
    return new Response('Error', { status: 500, headers: corsHeaders });
  }
});
