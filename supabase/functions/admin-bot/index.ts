import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ADMIN_BOT_TOKEN = Deno.env.get('ADMIN_BOT_TOKEN')!;
const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!; // For notifying users
const TELEGRAM_ADMIN_CHAT_ID = Deno.env.get('TELEGRAM_ADMIN_CHAT_ID')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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

  const welcomeMessage = `🔐 <b>BoysHub Admin Bot</b>

Добро пожаловать в админ-панель!

<b>Доступные команды:</b>

📊 /stats — Статистика проекта
📝 /pending — Статьи на модерации
📢 /broadcast — Рассылка всем пользователям
❓ /help — Справка

<i>Уведомления о новых статьях приходят автоматически.</i>`;

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

  const message = `📊 <b>Статистика BoysHub</b>

👥 <b>Пользователей:</b> ${userCount || 0}

📝 <b>Статьи:</b>
├ Всего: ${stats.total}
├ ⏳ На модерации: ${stats.pending}
├ ✅ Опубликовано: ${stats.approved}
└ ❌ Отклонено: ${stats.rejected}`;

  await sendAdminMessage(chatId, message);
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

// Send each article with buttons
  for (const article of articles) {
    const shortId = await getOrCreateShortId(article.id);
    const authorData = article.author as any;
    
    const message = `📄 <b>${article.title}</b>

👤 Автор: ${authorData?.first_name || 'Unknown'} ${authorData?.username ? `(@${authorData.username})` : ''}

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

// Handle /broadcast command
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

  // Get all users with telegram_id
  const { data: users, error } = await supabase
    .from('profiles')
    .select('telegram_id')
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

  // Update article status
  const { error } = await supabase
    .from('articles')
    .update({ status: 'approved' })
    .eq('id', articleId);

  if (error) {
    console.error('Error approving article:', error);
    await answerCallbackQuery(id, '❌ Ошибка при одобрении');
    return;
  }

  // Get article info
  const { data: article } = await supabase
    .from('articles')
    .select('title, author:author_id(telegram_id, first_name)')
    .eq('id', articleId)
    .maybeSingle();

  const authorData = article?.author as any;

  // Log moderation action
  await supabase.from('moderation_logs').insert({
    article_id: articleId,
    moderator_telegram_id: from.id,
    action: 'approved',
  });

  // Notify author via User Bot
  if (authorData?.telegram_id) {
    await sendUserMessage(
      authorData.telegram_id,
      `✅ <b>Ваша статья одобрена!</b>

📝 "${article?.title}"

Статья опубликована и доступна для всех пользователей в приложении BoysHub.`
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

  // Store pending rejection
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
  // Check for pending rejection
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

  // Update article
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

  // Get article info
  const { data: article } = await supabase
    .from('articles')
    .select('title, author:author_id(telegram_id, first_name)')
    .eq('id', pending.article_id)
    .maybeSingle();

  const authorData = article?.author as any;

  // Log moderation
  await supabase.from('moderation_logs').insert({
    article_id: pending.article_id,
    moderator_telegram_id: userId,
    action: 'rejected',
    reason: text,
  });

  // Notify author via User Bot
  if (authorData?.telegram_id) {
    await sendUserMessage(
      authorData.telegram_id,
      `❌ <b>Ваша статья отклонена</b>

📝 "${article?.title}"

<b>Причина:</b> ${text}

Вы можете исправить статью и отправить на модерацию повторно.`
    );
  }

  // Delete pending rejection
  await supabase
    .from('pending_rejections')
    .delete()
    .eq('article_id', pending.article_id);

  await sendAdminMessage(chatId, `❌ Статья "${article?.title}" отклонена\n\n<b>Причина:</b> ${text}`);
  return true;
}

// Handle callback queries
async function handleCallbackQuery(callbackQuery: any) {
  const { data, from } = callbackQuery;
  
  if (!isAdmin(from.id)) {
    await answerCallbackQuery(callbackQuery.id, '⛔ Доступ запрещён');
    return;
  }

  console.log('Handling callback:', data);
  const [action, shortId] = data.split(':');

  if (action === 'approve') {
    await handleApprove(callbackQuery, shortId);
  } else if (action === 'reject') {
    await handleReject(callbackQuery, shortId);
  }
}

// Send new article notification to admin
export async function sendModerationNotification(article: any) {
  const shortId = await getOrCreateShortId(article.id);

  const message = `🆕 <b>Новая статья на модерации</b>

📝 <b>Заголовок:</b> ${article.title}

👤 <b>Автор:</b> ${article.is_anonymous ? 'Аноним' : article.author?.first_name || 'Unknown'} ${article.author?.username ? `(@${article.author.username})` : ''}
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
      const { chat, text, from } = update.message;

      // Check admin access
      if (!isAdmin(from.id)) {
        await sendAdminMessage(chat.id, '⛔ Доступ запрещён. Этот бот только для администраторов.');
        return new Response('OK', { headers: corsHeaders });
      }

      // Commands
      if (text === '/start') {
        await handleStart(chat.id, from.id);
      } else if (text === '/stats') {
        await handleStats(chat.id, from.id);
      } else if (text === '/pending') {
        await handlePending(chat.id, from.id);
      } else if (text?.startsWith('/broadcast')) {
        await handleBroadcast(chat.id, from.id, text);
      } else if (text === '/help') {
        await handleStart(chat.id, from.id);
      } else {
        // Check if this is a rejection reason
        const handled = await handleRejectionReason(chat.id, from.id, text);
        if (!handled) {
          await sendAdminMessage(chat.id, 'Используйте /help для списка команд.');
        }
      }
    }

    return new Response('OK', { headers: corsHeaders });
  } catch (error) {
    console.error('Admin bot error:', error);
    return new Response('Error', { status: 500, headers: corsHeaders });
  }
});
