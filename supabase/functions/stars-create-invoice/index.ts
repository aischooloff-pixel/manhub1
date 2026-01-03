import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Verify Telegram WebApp initData
async function verifyTelegramWebAppData(initData: string, botToken: string): Promise<{ valid: boolean; user?: any }> {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return { valid: false };

    params.delete('hash');
    const dataCheckArr: string[] = [];
    params.sort();
    params.forEach((value, key) => {
      dataCheckArr.push(`${key}=${value}`);
    });
    const dataCheckString = dataCheckArr.join('\n');

    const encoder = new TextEncoder();
    const secretKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode('WebAppData'),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const secret = await crypto.subtle.sign('HMAC', secretKey, encoder.encode(botToken));
    const signKey = await crypto.subtle.importKey(
      'raw',
      secret,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', signKey, encoder.encode(dataCheckString));
    const hexHash = Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    if (hexHash !== hash) return { valid: false };

    const userParam = params.get('user');
    if (!userParam) return { valid: false };
    const user = JSON.parse(userParam);
    return { valid: true, user };
  } catch (e) {
    console.error('Error verifying Telegram data:', e);
    return { valid: false };
  }
}

// Convert RUB to Stars (approximate rate: 1 Star ≈ 1.5-2 RUB, we'll use 1.5 to be safe)
function convertRubToStars(rubAmount: number): number {
  // Telegram Stars have a minimum of 1 star and maximum of 2500 for regular payments
  // Rate: approximately 1 Star = 1.5-2 RUB (varies by region)
  // Using conservative rate of 1.8 RUB per star
  const starsAmount = Math.ceil(rubAmount / 1.8);
  return Math.max(1, Math.min(starsAmount, 2500)); // Clamp between 1 and 2500
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { initData, telegram_id, plan, period, amount } = body;

    console.log('Stars invoice request:', { plan, period, amount, telegram_id });

    // Validate required fields
    if (!plan || !period) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing plan or period' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user from initData or telegram_id
    let userId: number | null = null;
    let profileId: string | null = null;

    if (initData) {
      const verification = await verifyTelegramWebAppData(initData, TELEGRAM_BOT_TOKEN);
      if (verification.valid && verification.user) {
        userId = verification.user.id;
      }
    }

    if (!userId && telegram_id) {
      userId = telegram_id;
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'User not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, referral_code')
      .eq('telegram_id', userId)
      .maybeSingle();

    if (!profile) {
      return new Response(
        JSON.stringify({ success: false, error: 'Profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    profileId = profile.id;

    // Convert RUB to Stars
    const starsAmount = convertRubToStars(amount);

    // Create invoice payload for Telegram Stars
    const title = plan === 'plus' ? 'ManHub Plus' : 'ManHub Premium';
    const description = period === 'monthly' 
      ? `Подписка ${title} на 1 месяц`
      : `Подписка ${title} на 1 год`;

    // Create invoice link using Telegram Bot API
    const invoicePayload = {
      title,
      description,
      payload: JSON.stringify({
        profile_id: profileId,
        plan,
        period,
        amount_rub: amount,
        stars: starsAmount,
      }),
      currency: 'XTR', // Telegram Stars currency code
      prices: [
        {
          label: title,
          amount: starsAmount, // For XTR, amount is just the number of stars (no cents)
        },
      ],
    };

    console.log('Creating Telegram Stars invoice:', invoicePayload);

    // Create invoice link
    const createInvoiceUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/createInvoiceLink`;
    const invoiceResponse = await fetch(createInvoiceUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invoicePayload),
    });

    const invoiceResult = await invoiceResponse.json();
    console.log('Telegram invoice result:', invoiceResult);

    if (!invoiceResult.ok) {
      console.error('Failed to create invoice:', invoiceResult);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: invoiceResult.description || 'Failed to create invoice' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        invoice_url: invoiceResult.result,
        stars_amount: starsAmount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error creating Stars invoice:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
