import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function parseInitData(initData: string) {
  return new URLSearchParams(initData);
}

async function hmacSha256Raw(key: string, data: string) {
  const enc = new TextEncoder();
  const keyData = enc.encode(key);
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  return crypto.subtle.sign('HMAC', cryptoKey, enc.encode(data));
}

async function hmacSha256Hex(key: ArrayBuffer, data: string) {
  const cryptoKey = await crypto.subtle.importKey(
    'raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyTelegramInitData(initData: string): Promise<{ user: any | null }> {
  const params = parseInitData(initData);
  const hash = params.get('hash');
  if (!hash) return { user: null };
  params.delete('hash');
  const keys = Array.from(params.keys()).sort();
  const dataCheckString = keys.map(k => `${k}=${params.get(k)}`).join('\n');
  const secretKey = await hmacSha256Raw('WebAppData', TELEGRAM_BOT_TOKEN);
  const calculatedHash = await hmacSha256Hex(secretKey, dataCheckString);
  if (calculatedHash !== hash) return { user: null };
  try {
    return { user: JSON.parse(params.get('user') || 'null') };
  } catch {
    return { user: null };
  }
}

// Extract @username mentions from text
function extractMentions(text: string): string[] {
  const regex = /@([a-zA-Z0-9_]{1,32})/g;
  const matches: string[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    matches.push(match[1].toLowerCase());
  }
  return [...new Set(matches)]; // Remove duplicates
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { initData, articleId, body, parentId } = await req.json();
    
    if (!body || !body.trim()) {
      return new Response(JSON.stringify({ error: 'Комментарий не может быть пустым' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { user: tgUser } = await verifyTelegramInitData(initData);
    if (!tgUser) {
      return new Response(JSON.stringify({ error: 'Неверные данные авторизации' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, username, avatar_url, is_premium')
      .eq('telegram_id', tgUser.id)
      .maybeSingle();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: 'Профиль не найден' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if article allows comments
    const { data: article } = await supabase
      .from('articles')
      .select('id, allow_comments, comments_count, author_id, title')
      .eq('id', articleId)
      .single();

    if (!article) {
      return new Response(JSON.stringify({ error: 'Статья не найдена' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (article.allow_comments === false) {
      return new Response(JSON.stringify({ error: 'Комментарии отключены для этой статьи' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Insert comment with optional parent_id for replies
    const insertData: any = {
      article_id: articleId,
      author_id: profile.id,
      body: body.trim()
    };
    
    if (parentId) {
      insertData.parent_id = parentId;
    }

    const { data: comment, error: insertError } = await supabase
      .from('article_comments')
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting comment:', insertError);
      throw insertError;
    }

    // Update comments count (only for top-level comments)
    if (!parentId) {
      await supabase
        .from('articles')
        .update({ comments_count: (article.comments_count || 0) + 1 })
        .eq('id', articleId);
    }

    // Create notification for article author (if not commenting on own article and not a reply)
    // Reply notifications are handled by database trigger
    if (!parentId && article.author_id && article.author_id !== profile.id) {
      const articleTitle = article.title?.substring(0, 50) || 'статью';
      await supabase
        .from('notifications')
        .insert({
          user_profile_id: article.author_id,
          from_user_id: profile.id,
          article_id: articleId,
          type: 'comment',
          message: `прокомментировал "${articleTitle}"`,
        });
      console.log(`Notification created for author ${article.author_id}`);
    }

    // Handle @username mentions
    const mentions = extractMentions(body);
    if (mentions.length > 0) {
      // Find mentioned users
      const { data: mentionedUsers } = await supabase
        .from('profiles')
        .select('id, username')
        .in('username', mentions);

      if (mentionedUsers && mentionedUsers.length > 0) {
        const articleTitle = article.title?.substring(0, 50) || 'статью';
        
        // Create notifications for each mentioned user (except the comment author)
        for (const mentionedUser of mentionedUsers) {
          if (mentionedUser.id !== profile.id) {
            await supabase
              .from('notifications')
              .insert({
                user_profile_id: mentionedUser.id,
                from_user_id: profile.id,
                article_id: articleId,
                type: 'mention',
                message: `упомянул вас в комментарии к "${articleTitle}"`,
              });
            console.log(`Mention notification created for @${mentionedUser.username}`);
          }
        }
      }
    }

    console.log(`Comment added to article ${articleId} by user ${tgUser.id}${parentId ? ` (reply to ${parentId})` : ''}`);

    return new Response(JSON.stringify({ 
      success: true,
      comment: {
        ...comment,
        author: profile
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error adding comment:', err);
    return new Response(JSON.stringify({ error: 'Ошибка сервера' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});