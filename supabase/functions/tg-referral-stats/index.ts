import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!;

async function hmacSha256Hex(key: ArrayBuffer, data: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(data));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hmacSha256Raw(key: ArrayBuffer, data: string): Promise<ArrayBuffer> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  return await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(data));
}

async function verifyTelegramInitData(initData: string): Promise<{ user: any | null }> {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return { user: null };

    params.delete('hash');
    const keys = [...params.keys()].sort();
    const dataCheckString = keys.map(k => `${k}=${params.get(k)}`).join('\n');

    const enc = new TextEncoder();
    const secretKey = await hmacSha256Raw(enc.encode('WebAppData').buffer as ArrayBuffer, BOT_TOKEN);
    const calculatedHash = await hmacSha256Hex(secretKey, dataCheckString);

    if (calculatedHash !== hash) return { user: null };

    const userParam = params.get('user');
    if (!userParam) return { user: null };

    return { user: JSON.parse(userParam) };
  } catch {
    return { user: null };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { initData } = await req.json();
    const { user } = await verifyTelegramInitData(initData);

    if (!user?.id) {
      return new Response(
        JSON.stringify({ error: 'Invalid Telegram data' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, referral_code, referral_earnings')
      .eq('telegram_id', user.id)
      .maybeSingle();

    console.log('[tg-referral-stats] Profile lookup:', { 
      telegram_id: user.id, 
      profile_id: profile?.id,
      referral_code: profile?.referral_code,
      error: profileError?.message 
    });

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Count referrals
    const { count: referralCount, error: countError } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('referred_by', profile.id);

    console.log('[tg-referral-stats] Referral count:', { 
      profile_id: profile.id,
      referralCount, 
      countError: countError?.message 
    });

    // Get list of referred users for debugging
    const { data: referredUsers } = await supabase
      .from('profiles')
      .select('id, username, first_name, created_at')
      .eq('referred_by', profile.id)
      .limit(10);
    
    console.log('[tg-referral-stats] Referred users:', referredUsers);

    // Get earnings history with referred user names
    const { data: earnings, error: earningsError } = await supabase
      .from('referral_earnings')
      .select(`
        id,
        purchase_amount,
        earning_amount,
        purchase_type,
        created_at,
        referred:referred_id(first_name, username)
      `)
      .eq('referrer_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(20);
    
    console.log('[tg-referral-stats] Earnings:', { 
      count: earnings?.length, 
      error: earningsError?.message 
    });

    const formattedEarnings = (earnings || []).map((e: any) => ({
      id: e.id,
      purchase_amount: e.purchase_amount,
      earning_amount: e.earning_amount,
      purchase_type: e.purchase_type,
      created_at: e.created_at,
      referred_name: e.referred?.first_name || e.referred?.username || 'Пользователь',
    }));

    return new Response(
      JSON.stringify({
        referralCode: profile.referral_code,
        referralCount: referralCount || 0,
        totalEarnings: profile.referral_earnings || 0,
        earnings: formattedEarnings,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
