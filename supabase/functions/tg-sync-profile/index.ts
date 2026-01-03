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

async function hmacSha256Hex(key: ArrayBuffer, data: string) {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc(data));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
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

type VerifyDebug = {
  reason: 'ok' | 'missing_hash' | 'hash_mismatch' | 'missing_user' | 'bad_user_json';
  initDataLength: number;
  auth_date: string | null;
  has_query_id: boolean;
  user_id: number | null;
  token_prefix: string; // first 10 chars of bot token for debugging
};

async function verifyTelegramInitData(initData: string): Promise<{ user: any | null; debug: VerifyDebug }> {
  const params = parseInitData(initData);
  const tokenPrefix = TELEGRAM_BOT_TOKEN ? TELEGRAM_BOT_TOKEN.substring(0, 10) + '...' : 'NOT_SET';
  
  const debugBase: Omit<VerifyDebug, 'reason' | 'user_id'> = {
    initDataLength: initData?.length || 0,
    auth_date: params.get('auth_date'),
    has_query_id: !!params.get('query_id'),
    token_prefix: tokenPrefix,
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

    console.log('[tg-sync-profile] hash_mismatch', { 
      expected: checkHash.substring(0, 16) + '...', 
      got: hash.substring(0, 16) + '...',
      dataCheckStringLength: dataCheckString.length,
    });

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
    const { initData, startParam } = await req.json();
    if (!initData) {
      return new Response(JSON.stringify({ error: 'initData is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { user: tgUser, debug } = await verifyTelegramInitData(initData);
    console.log('[tg-sync-profile] verify result:', debug, 'startParam:', startParam);

    if (!tgUser?.id) {
      return new Response(
        JSON.stringify({
          error: 'Invalid Telegram initData',
          reason: debug.reason,
          hint: debug.reason === 'hash_mismatch' 
            ? 'Токен бота в секретах не совпадает с ботом, через которого открыто мини-приложение. Проверьте TELEGRAM_BOT_TOKEN.'
            : undefined,
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Handle referral link: ref_CODE
    let referrerId: string | null = null;
    if (startParam?.startsWith('ref_')) {
      const referralCode = startParam.substring(4); // Remove 'ref_' prefix
      console.log('[tg-sync-profile] Processing referral code:', referralCode);
      
      // Find referrer by referral code
      const { data: referrer } = await supabase
        .from('profiles')
        .select('id, telegram_id')
        .eq('referral_code', referralCode)
        .maybeSingle();
      
      if (referrer && referrer.telegram_id !== tgUser.id) {
        referrerId = referrer.id;
        console.log('[tg-sync-profile] Found referrer:', referrer.id);
      } else {
        console.log('[tg-sync-profile] Referral code not found or self-referral:', referralCode);
      }
    }

    // Upsert profile by telegram_id
    const { data: existing } = await supabase
      .from('profiles')
      .select('*')
      .eq('telegram_id', tgUser.id)
      .maybeSingle();

    const payload: any = {
      telegram_id: tgUser.id,
      username: tgUser.username || null,
      first_name: tgUser.first_name || 'User',
      last_name: tgUser.last_name || null,
      avatar_url: tgUser.photo_url || null,
      // ВАЖНО: не перезаписываем is_premium из Telegram (это Telegram Premium),
      // чтобы Premium из админки приложения не сбрасывался при синке.
      updated_at: new Date().toISOString(),
    };

    let profile;
    let error;

    if (existing) {
      // Update existing profile
      // Set referrer only if not already set
      if (!existing.referred_by && referrerId) {
        payload.referred_by = referrerId;
        console.log('[tg-sync-profile] Setting referred_by for existing user:', referrerId);
      }
      
      const result = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', existing.id)
        .select('*')
        .single();
      profile = result.data;
      error = result.error;
    } else {
      // Create new profile with referrer
      if (referrerId) {
        payload.referred_by = referrerId;
        console.log('[tg-sync-profile] Creating new profile with referrer:', referrerId);
      }
      
      const result = await supabase
        .from('profiles')
        .insert({ ...payload, reputation: 0 })
        .select('*')
        .single();
      profile = result.data;
      error = result.error;
    }

    if (error || !profile) throw error;

    const { count: articlesCount } = await supabase
      .from('articles')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', profile.id);

    const { data: repAgg } = await supabase
      .from('reputation_history')
      .select('value')
      .eq('user_id', profile.id);

    const reputation = (repAgg || []).reduce((sum, r: any) => sum + (r?.value || 0), 0);

    return new Response(
      JSON.stringify({
        profile: { ...profile, reputation },
        articlesCount: articlesCount || 0,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('tg-sync-profile error:', e);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
