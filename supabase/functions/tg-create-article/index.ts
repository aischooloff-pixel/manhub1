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

function enc(text: string) {
  return new TextEncoder().encode(text);
}

async function hmacSha256Raw(key: string, data: string) {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    enc(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return crypto.subtle.sign('HMAC', cryptoKey, enc(data));
}

async function hmacSha256Hex(key: ArrayBuffer, data: string) {
  const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc(data));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

type VerifyDebug = {
  reason: 'ok' | 'missing_hash' | 'hash_mismatch' | 'missing_user' | 'bad_user_json';
  initDataLength: number;
  auth_date: string | null;
  has_query_id: boolean;
  user_id: number | null;
};

async function verifyTelegramInitData(initData: string): Promise<{ user: any | null; debug: VerifyDebug }> {
  const params = parseInitData(initData);
  const debugBase: Omit<VerifyDebug, 'reason' | 'user_id'> = {
    initDataLength: initData?.length || 0,
    auth_date: params.get('auth_date'),
    has_query_id: !!params.get('query_id'),
  };

  const hash = params.get('hash');
  if (!hash) {
    return { user: null, debug: { ...debugBase, reason: 'missing_hash', user_id: null } };
  }

  const pairs: string[] = [];
  params.forEach((value, key) => {
    if (key === 'hash') return;
    pairs.push(`${key}=${value}`);
  });
  pairs.sort();
  const dataCheckString = pairs.join('\n');

  const secretKey = await hmacSha256Raw('WebAppData', TELEGRAM_BOT_TOKEN);
  const checkHash = await hmacSha256Hex(secretKey, dataCheckString);

  if (checkHash !== hash) {
    let userId: number | null = null;
    try {
      const u = params.get('user');
      if (u) userId = JSON.parse(u)?.id ?? null;
    } catch {
      // ignore
    }

    return { user: null, debug: { ...debugBase, reason: 'hash_mismatch', user_id: userId } };
  }

  const userJson = params.get('user');
  if (!userJson) {
    return { user: null, debug: { ...debugBase, reason: 'missing_user', user_id: null } };
  }

  try {
    const user = JSON.parse(userJson);
    return { user, debug: { ...debugBase, reason: 'ok', user_id: user?.id ?? null } };
  } catch {
    return { user: null, debug: { ...debugBase, reason: 'bad_user_json', user_id: null } };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { initData, article } = await req.json();
    if (!initData || !article) {
      return new Response(JSON.stringify({ error: 'initData and article are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { user: tgUser, debug } = await verifyTelegramInitData(initData);
    console.log('[tg-create-article] verify', debug);

    if (!tgUser?.id) {
      return new Response(
        JSON.stringify({
          error:
            'Invalid Telegram initData. Убедитесь, что мини‑приложение открыто через того же бота, чей токен настроен на сервере.',
          reason: debug.reason,
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: profile, error: pErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('telegram_id', tgUser.id)
      .maybeSingle();

    if (pErr || !profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check article limit for free users (3 per day)
    const subscriptionTier = profile.subscription_tier || 'free';
    if (subscriptionTier === 'free') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { count, error: countError } = await supabase
        .from('articles')
        .select('*', { count: 'exact', head: true })
        .eq('author_id', profile.id)
        .gte('created_at', today.toISOString());

      if (!countError && (count || 0) >= 3) {
        return new Response(
          JSON.stringify({ 
            error: 'daily_limit_reached',
            message: 'Вы достигли лимита 3 статьи в день. Перейдите на Plus для безлимитных публикаций.'
          }),
          {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    const preview = (article.preview || article.body || '').substring(0, 200);

    let mediaType = article.media_type;
    if (article.media_url && !mediaType) {
      if (String(article.media_url).includes('youtube.com') || String(article.media_url).includes('youtu.be')) {
        mediaType = 'youtube';
      } else {
        mediaType = 'image';
      }
    }

    const { data: created, error } = await supabase
      .from('articles')
      .insert({
        author_id: profile.id,
        category_id: article.category_id || null,
        topic: (article.topic && String(article.topic).trim().length ? String(article.topic).trim() : null),
        title: article.title,
        body: article.body,
        preview,
        media_url: article.media_url || null,
        media_type: mediaType || null,
        is_anonymous: !!article.is_anonymous,
        allow_comments: article.allow_comments !== false,
        sources: Array.isArray(article.sources) && article.sources.length ? article.sources : null,
        status: 'pending',
      })
      .select('*')
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ article: created }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('tg-create-article error:', e);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
