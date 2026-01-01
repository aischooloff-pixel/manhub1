import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!;
const TELEGRAM_ADMIN_CHAT_ID = Deno.env.get('TELEGRAM_ADMIN_CHAT_ID')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function sendTelegramMessage(chatId: string | number, text: string, options: any = {}) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  
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

async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`;
  
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
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageReplyMarkup`;
  
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

async function handleStart(chatId: number, user: any, startParam?: string) {
  console.log('Handling /start command for user:', user, 'startParam:', startParam);
  
  // Handle referral link: ref_CODE
  let referrerId: string | null = null;
  if (startParam?.startsWith('ref_')) {
    const referralCode = startParam.substring(4); // Remove 'ref_' prefix
    console.log('Processing referral code:', referralCode);
    
    // Find referrer by referral code
    const { data: referrer } = await supabase
      .from('profiles')
      .select('id, telegram_id')
      .eq('referral_code', referralCode)
      .maybeSingle();
    
    if (referrer) {
      referrerId = referrer.id;
      console.log('Found referrer:', referrer.id);
    } else {
      console.log('Referral code not found:', referralCode);
    }
  }
  
  // Check if user exists in profiles
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('telegram_id', user.id)
    .maybeSingle();
  
  if (!existingProfile) {
    // Create new profile with referrer
    const insertData: any = {
      telegram_id: user.id,
      username: user.username || null,
      first_name: user.first_name || 'User',
      last_name: user.last_name || null,
      is_premium: user.is_premium || false,
    };
    
    // Set referrer only if it's a different user
    if (referrerId) {
      const { data: referrerProfile } = await supabase
        .from('profiles')
        .select('telegram_id')
        .eq('id', referrerId)
        .maybeSingle();
      
      if (referrerProfile?.telegram_id !== user.id) {
        insertData.referred_by = referrerId;
        console.log('Setting referred_by to:', referrerId);
      }
    }
    
    const { data: newProfile } = await supabase.from('profiles').insert(insertData).select('id').single();
    console.log('Created new profile for telegram user:', user.id, 'with referrer:', insertData.referred_by);

    // Schedule welcome notification for new user
    if (newProfile?.id) {
      // Get delay from settings (default 15 minutes)
      const { data: delaySetting } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'welcome_message_delay_minutes')
        .maybeSingle();
      
      const delayMinutes = delaySetting?.value ? parseInt(delaySetting.value) : 15;
      const scheduledAt = new Date(Date.now() + delayMinutes * 60 * 1000);

      await supabase.from('scheduled_notifications').insert({
        user_profile_id: newProfile.id,
        notification_type: 'welcome',
        scheduled_at: scheduledAt.toISOString(),
      });
      console.log(`Scheduled welcome notification for ${user.id} at ${scheduledAt.toISOString()}`);
      
      // Send the welcome notification immediately by invoking the function
      try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/send-welcome-notifications`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
        });
        console.log('Triggered send-welcome-notifications:', await response.text());
      } catch (e) {
        console.error('Failed to trigger welcome notifications:', e);
      }
    }
  } else if (existingProfile && !existingProfile.referred_by && referrerId) {
    // User exists but has no referrer - set it now if referrer is different user
    const { data: referrerProfile } = await supabase
      .from('profiles')
      .select('telegram_id')
      .eq('id', referrerId)
      .maybeSingle();
    
    if (referrerProfile?.telegram_id !== user.id) {
      await supabase
        .from('profiles')
        .update({ referred_by: referrerId })
        .eq('id', existingProfile.id);
      console.log('Updated existing profile with referrer:', referrerId);
    }
  }
  
  // Handle support start param
  if (startParam === 'support') {
    await sendTelegramMessage(chatId, `💬 <b>Техническая поддержка ManHub</b>

Напишите ваш вопрос в этот чат, и мы ответим вам в ближайшее время.

<i>Просто отправьте сообщение с вашим вопросом.</i>`);
    
    // Set support mode for this user
    await supabase.from('admin_settings').upsert({
      key: `support_mode_${user.id}`,
      value: 'active',
    });
    return;
  }
  
  const welcomeMessage = `👋 <b>Добро пожаловать в ManHub!</b>

Это платформа для обмена знаниями и опытом.

🔹 <b>Что вы можете делать:</b>
• Читать статьи от авторов сообщества
• Слушать подкасты
• Писать свои статьи
• Получать репутацию за полезный контент

🔹 <b>Как начать:</b>
Откройте мини-приложение, чтобы погрузиться в мир ManHub!

📱 Нажмите на кнопку меню, чтобы открыть приложение.

⛓️‍💥 Подписывайся на наш канал: 
https://t.me/Man_HubRu`;

  await sendTelegramMessage(chatId, welcomeMessage);
}

async function handleSupportQuestion(chatId: number, user: any, text: string) {
  console.log('Handling support question from user:', user.id);
  
  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, first_name, username')
    .eq('telegram_id', user.id)
    .maybeSingle();
  
  // Save question to database (for history)
  const { data: question, error } = await supabase
    .from('support_questions')
    .insert({
      user_telegram_id: user.id,
      user_profile_id: profile?.id || null,
      question: text,
      status: 'pending',
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error saving support question:', error);
  }
  
  // Send confirmation to user
  await sendTelegramMessage(chatId, `✅ <b>Ваш вопрос получен!</b>

Мы ответим вам в ближайшее время. Ожидайте ответа в этом чате.`);
  
  // Notify admin via admin bot with answer button
  const adminMessage = `❓ <b>Новый вопрос в поддержку</b>

👤 <b>От:</b> ${user.first_name || 'User'} ${user.username ? `(@${user.username})` : ''}
🆔 <b>Telegram ID:</b> ${user.id}

📝 <b>Вопрос:</b>
${text}`;

  // Create keyboard with answer button - include telegram_id and question_id
  const questionId = question?.id?.substring(0, 8) || 'none';
  const keyboard = {
    inline_keyboard: [
      [{ text: '💬 Ответить', callback_data: `support_answer:${user.id}:${questionId}` }]
    ]
  };

  // Send to admin via ADMIN bot
  const ADMIN_BOT_TOKEN = Deno.env.get('ADMIN_BOT_TOKEN')!;
  const adminResponse = await fetch(`https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_ADMIN_CHAT_ID,
      text: adminMessage,
      parse_mode: 'HTML',
      reply_markup: keyboard,
    }),
  });
  
  const adminResult = await adminResponse.json();
  console.log('Admin notification result:', adminResult);
  
  // Save admin message ID for reference
  if (adminResult.ok && adminResult.result?.message_id && question) {
    await supabase
      .from('support_questions')
      .update({ admin_message_id: adminResult.result.message_id })
      .eq('id', question.id);
  }
  
  // Clear support mode
  await supabase
    .from('admin_settings')
    .delete()
    .eq('key', `support_mode_${user.id}`);
}

async function handleCallbackQuery(callbackQuery: any) {
  const { id, data, message, from } = callbackQuery;
  console.log('Handling callback query:', data);
  
  // Parse callback data: action:articleId
  const [action, articleId] = data.split(':');
  
  if (action === 'approve') {
    // Approve article
    const { error } = await supabase
      .from('articles')
      .update({ status: 'approved' })
      .eq('id', articleId);
    
    if (error) {
      console.error('Error approving article:', error);
      await answerCallbackQuery(id, '❌ Ошибка при одобрении');
      return;
    }
    
    // Get article info for notification
    const { data: article } = await supabase
      .from('articles')
      .select('*, author:author_id(telegram_id, first_name)')
      .eq('id', articleId)
      .maybeSingle();
    
    // Notify author
    if (article?.author?.telegram_id) {
      await sendTelegramMessage(
        article.author.telegram_id,
        `✅ <b>Ваша статья одобрена!</b>\n\n📝 "${article.title}"\n\nСтатья опубликована и доступна для всех пользователей.`
      );
    }
    
    await answerCallbackQuery(id, '✅ Статья одобрена');
    await editMessageReplyMarkup(message.chat.id, message.message_id);
    await sendTelegramMessage(message.chat.id, `✅ Статья "${article?.title}" одобрена`);
    
  } else if (action === 'reject') {
    // Set pending rejection state - ask for reason
    await answerCallbackQuery(id, '📝 Напишите причину отклонения');
    await editMessageReplyMarkup(message.chat.id, message.message_id);
    
    // Store rejection state in admin_settings temporarily
    await supabase.from('admin_settings').upsert({
      key: `pending_rejection_${from.id}`,
      value: articleId,
    });
    
    await sendTelegramMessage(
      message.chat.id,
      `📝 Напишите причину отклонения статьи в следующем сообщении:`
    );
  }
}

async function handleRejectionReason(chatId: number, userId: number, text: string) {
  // Check if there's a pending rejection
  const { data: pending } = await supabase
    .from('admin_settings')
    .select('value')
    .eq('key', `pending_rejection_${userId}`)
    .maybeSingle();
  
  if (!pending) return false;
  
  const articleId = pending.value;
  
  // Update article with rejection
  const { error } = await supabase
    .from('articles')
    .update({ 
      status: 'rejected',
      rejection_reason: text 
    })
    .eq('id', articleId);
  
  if (error) {
    console.error('Error rejecting article:', error);
    await sendTelegramMessage(chatId, '❌ Ошибка при отклонении статьи');
    return true;
  }
  
  // Get article info
  const { data: article } = await supabase
    .from('articles')
    .select('*, author:author_id(telegram_id, first_name)')
    .eq('id', articleId)
    .maybeSingle();
  
  // Notify author
  if (article?.author?.telegram_id) {
    await sendTelegramMessage(
      article.author.telegram_id,
      `❌ <b>Ваша статья отклонена</b>\n\n📝 "${article.title}"\n\n<b>Причина:</b> ${text}\n\nВы можете исправить статью и отправить на модерацию повторно.`
    );
  }
  
  // Clear pending state
  await supabase
    .from('admin_settings')
    .delete()
    .eq('key', `pending_rejection_${userId}`);
  
  await sendTelegramMessage(chatId, `❌ Статья "${article?.title}" отклонена\n\nПричина: ${text}`);
  
  return true;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // GET request - setup webhook or check status
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    
    if (action === 'set_webhook') {
      const webhookUrl = `${SUPABASE_URL}/functions/v1/telegram-bot`;
      const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`;
      
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
      const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteWebhook`;
      const response = await fetch(telegramUrl, { method: 'POST' });
      const result = await response.json();
      
      return new Response(JSON.stringify({ success: result.ok, telegram_response: result }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    if (action === 'info') {
      const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`;
      const response = await fetch(telegramUrl);
      const result = await response.json();
      
      return new Response(JSON.stringify(result), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    return new Response(JSON.stringify({
      message: 'Telegram Bot API',
      actions: ['set_webhook', 'delete_webhook', 'info']
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }

  try {
    const update = await req.json();
    console.log('Received Telegram update:', JSON.stringify(update));

    // Handle callback queries (button presses)
    if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
      return new Response('OK', { headers: corsHeaders });
    }

    // Handle messages
    if (update.message) {
      const { chat, text, from } = update.message;
      
      // Handle /start command (with optional deep link param)
      if (text?.startsWith('/start')) {
        const startParam = text.split(' ')[1]; // Get param after /start
        await handleStart(chat.id, from, startParam);
        return new Response('OK', { headers: corsHeaders });
      }
      
      // Check if this is a rejection reason from admin
      if (chat.id.toString() === TELEGRAM_ADMIN_CHAT_ID) {
        const handled = await handleRejectionReason(chat.id, from.id, text);
        if (handled) {
          return new Response('OK', { headers: corsHeaders });
        }
      }
      
      // Check if user is in support mode
      const { data: supportMode } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', `support_mode_${from.id}`)
        .maybeSingle();
      
      if (supportMode?.value === 'active') {
        await handleSupportQuestion(chat.id, from, text);
        return new Response('OK', { headers: corsHeaders });
      }
    }

    return new Response('OK', { headers: corsHeaders });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response('Error', { status: 500, headers: corsHeaders });
  }
});

// Export function to send moderation request
export async function sendModerationRequest(article: any) {
  const message = `📝 <b>Новая статья на модерацию</b>

<b>Заголовок:</b> ${article.title}

<b>Автор:</b> ${article.is_anonymous ? 'Аноним' : article.author?.first_name || 'Unknown'}

<b>Превью:</b>
${article.preview || article.body?.substring(0, 200) || 'Нет превью'}...

<b>ID:</b> <code>${article.id}</code>`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '✅ Одобрить', callback_data: `approve:${article.id}` },
        { text: '❌ Отклонить', callback_data: `reject:${article.id}` },
      ],
    ],
  };

  const result = await sendTelegramMessage(TELEGRAM_ADMIN_CHAT_ID, message, {
    reply_markup: keyboard,
  });

  return result;
}