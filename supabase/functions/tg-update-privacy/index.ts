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
    const body = await req.json();
    const { initData, telegram_channel, website, bio } = body;
    
    if (!initData) {
      return new Response(JSON.stringify({ error: 'initData is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { user: tgUser, debug } = await verifyTelegramInitData(initData);
    console.log('[tg-update-privacy] verify', debug);

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

    // Prepare update payload
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    // Social links (for premium users)

    // Social links (for premium users)
    if (telegram_channel !== undefined) updatePayload.telegram_channel = telegram_channel;
    if (website !== undefined) updatePayload.website = website;

    // Bio (for plus/premium users only, max 100 chars, no links)
    if (bio !== undefined && (profile.subscription_tier === 'plus' || profile.subscription_tier === 'premium')) {
      // Strip URLs from bio
      const urlPattern = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9-]+\.(com|ru|org|net|io|me|co|app|dev)[^\s]*)/gi;
      const cleanBio = (bio || '').replace(urlPattern, '').trim().slice(0, 100);
      updatePayload.bio = cleanBio || null;
    }

    const { data: updated, error } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', profile.id)
      .select('*')
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ profile: updated }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('tg-update-privacy error:', e);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
