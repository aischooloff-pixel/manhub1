import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ADMIN_BOT_TOKEN = Deno.env.get('ADMIN_BOT_TOKEN')!;
const TELEGRAM_ADMIN_CHAT_ID = Deno.env.get('TELEGRAM_ADMIN_CHAT_ID')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function getOrCreateShortId(articleId: string): Promise<string> {
  const { data, error } = await supabase.rpc('get_or_create_short_id', { p_article_id: articleId });

  if (error) {
    console.error('Error getting short ID:', error);
    return articleId.substring(0, 8);
  }

  return data;
}

async function sendTelegramMessage(chatId: string | number, text: string, options: any = {}) {
  const url = `https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/sendMessage`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      ...options,
    }),
  });

  return response.json();
}

function decodeBase64ToBytes(base64: string): Uint8Array {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function parseDataUrl(dataUrl: string): { mime: string; bytes: Uint8Array; filename: string } | null {
  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) return null;

  const mime = matches[1];
  const base64Data = matches[2];
  const bytes = decodeBase64ToBytes(base64Data);

  const ext = mime.split('/')[1] || 'jpg';
  const filename = `media.${ext}`;

  return { mime, bytes, filename };
}

async function sendTelegramPhoto(chatId: string | number, photoDataUrl: string, caption: string) {
  const url = `https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/sendPhoto`;

  const parsed = parseDataUrl(photoDataUrl);
  if (!parsed) {
    console.error('Invalid base64 format (data url expected)');
    return { ok: false, error: 'Invalid base64 format' };
  }

  const formData = new FormData();
  formData.append('chat_id', String(chatId));
  // Use ArrayBuffer slice to satisfy BlobPart typing in Deno
  const arrayBuffer = parsed.bytes.buffer.slice(parsed.bytes.byteOffset, parsed.bytes.byteOffset + parsed.bytes.byteLength) as ArrayBuffer;
  formData.append('photo', new Blob([arrayBuffer], { type: parsed.mime }), parsed.filename);
  formData.append('caption', caption.slice(0, 900));
  formData.append('parse_mode', 'HTML');

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  return response.json();
}

function splitForTelegram(text: string, maxLen = 3800): string[] {
  if (text.length <= maxLen) return [text];

  const parts: string[] = [];
  let remaining = text;
  while (remaining.length > maxLen) {
    let cut = remaining.lastIndexOf('\n', maxLen);
    if (cut < 0 || cut < maxLen * 0.5) cut = maxLen;
    parts.push(remaining.slice(0, cut));
    remaining = remaining.slice(cut);
  }
  if (remaining.trim().length) parts.push(remaining);
  return parts;
}

function safe(s: any) {
  return String(s ?? '').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { articleId } = await req.json();
    console.log('Sending moderation request for article:', articleId);

    if (!articleId) {
      return new Response(JSON.stringify({ error: 'articleId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: article, error } = await supabase
      .from('articles')
      .select('*, author:author_id(id, telegram_id, username, first_name, last_name)')
      .eq('id', articleId)
      .maybeSingle();

    if (error || !article) {
      console.error('Error fetching article:', error);
      return new Response(JSON.stringify({ error: 'Article not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const shortId = await getOrCreateShortId(article.id);
    const author = (article.author as any) || {};

    const isBase64Image = typeof article.media_url === 'string' && article.media_url.startsWith('data:');
    const isYouTube = article.media_type === 'youtube' && !!article.media_url;
    const youtubeUrl = isYouTube ? `https://youtube.com/watch?v=${article.media_url}` : null;

    const header = `🆕 <b>Статья на модерации</b>\n🆔 Код: <code>${safe(shortId)}</code>\n`;

    const authorLine = `👤 <b>Автор (оригинал):</b> ${safe(`${author.first_name || ''} ${author.last_name || ''}`.trim() || 'Не указано')} ${author.username ? `(@${safe(author.username)})` : ''}`;
    const idsLine = `🆔 <b>Telegram ID:</b> ${safe(author.telegram_id || '—')}\n🧾 <b>Profile ID:</b> <code>${safe(author.id || '—')}</code>`;

    const meta =
      `\n\n🗂 <b>Категория:</b> ${safe(article.category_id || '—')}` +
      `\n🧩 <b>Тема:</b> ${safe(article.topic || '—')}` +
      `\n📝 <b>Заголовок:</b> ${safe(article.title)}` +
      `\n🙈 <b>Анонимная публикация:</b> ${article.is_anonymous ? 'Да' : 'Нет'}`;

    // Sources section
    const sourcesArr = article.sources as string[] | null;
    const sourcesLine = sourcesArr && sourcesArr.length > 0
      ? `\n\n🔗 <b>Источники:</b>\n${sourcesArr.map((s: string, i: number) => `${i + 1}. ${safe(s)}`).join('\n')}`
      : '';

    const mediaLine =
      article.media_url
        ? isBase64Image
          ? `\n\n🖼 <b>Медиа:</b> фото (см. выше)`
          : isYouTube
            ? `\n\n🎬 <b>Медиа:</b> <a href="${youtubeUrl}">YouTube ссылка</a>`
            : `\n\n🔗 <b>Медиа:</b> <a href="${safe(article.media_url)}">ссылка</a>`
        : '';

    const body = `\n\n📄 <b>Текст:</b>\n${safe(article.body || '')}`;

    const message = `${header}${authorLine}\n${idsLine}${meta}${body}${sourcesLine}${mediaLine}`;

    const keyboard = {
      inline_keyboard: [[{ text: '✅ Принять', callback_data: `approve:${shortId}` }, { text: '❌ Отклонить', callback_data: `reject:${shortId}` }]],
    };

    // 1) If base64 image: send photo first (caption short)
    if (isBase64Image) {
      const photoCaption = `🖼 <b>Медиа к статье</b>\n📝 ${safe(article.title)}`;
      const photoRes = await sendTelegramPhoto(TELEGRAM_ADMIN_CHAT_ID, article.media_url, photoCaption);
      console.log('[send-moderation] sendPhoto response:', photoRes);
    }

    // 2) Send full info split into parts; attach buttons on the last part
    const parts = splitForTelegram(message);
    let lastResult: any = null;

    for (let i = 0; i < parts.length; i++) {
      const opts = i === parts.length - 1 ? { reply_markup: keyboard } : {};
      // eslint-disable-next-line no-await-in-loop
      lastResult = await sendTelegramMessage(TELEGRAM_ADMIN_CHAT_ID, parts[i], opts);
    }

    console.log('[send-moderation] Telegram API response:', lastResult);

    if (lastResult?.ok && lastResult?.result?.message_id) {
      await supabase.from('articles').update({ telegram_message_id: lastResult.result.message_id }).eq('id', articleId);
    }

    return new Response(JSON.stringify({ success: true, messageId: lastResult?.result?.message_id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error sending moderation request:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
