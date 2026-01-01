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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { initData, articleId } = await req.json();
    
    const { user: tgUser } = await verifyTelegramInitData(initData);
    
    let isLiked = false;
    let isFavorited = false;

    if (tgUser) {
      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('telegram_id', tgUser.id)
        .maybeSingle();

      if (profile) {
        // Check like status
        const { data: like } = await supabase
          .from('article_likes')
          .select('id')
          .eq('article_id', articleId)
          .eq('user_profile_id', profile.id)
          .maybeSingle();

        isLiked = !!like;

        // Check favorite status
        const { data: favorite } = await supabase
          .from('article_favorites')
          .select('id')
          .eq('article_id', articleId)
          .eq('user_profile_id', profile.id)
          .maybeSingle();

        isFavorited = !!favorite;
      }
    }

    // Get all comments including parent_id for threading
    const { data: comments } = await supabase
      .from('article_comments')
      .select(`
        id,
        body,
        created_at,
        parent_id,
        author:author_id(id, first_name, last_name, username, avatar_url, is_premium, subscription_tier)
      `)
      .eq('article_id', articleId)
      .order('created_at', { ascending: true });

    return new Response(JSON.stringify({ 
      isLiked,
      isFavorited,
      comments: comments || []
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error getting article state:', err);
    return new Response(JSON.stringify({ error: 'Ошибка сервера' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});