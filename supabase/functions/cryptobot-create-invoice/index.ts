import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Verify Telegram Web App data using Web Crypto API
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
    
    // Create secret key: HMAC-SHA256("WebAppData", botToken)
    const webAppDataKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode('WebAppData'),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const secretBytes = await crypto.subtle.sign('HMAC', webAppDataKey, encoder.encode(botToken));
    
    // Create check hash: HMAC-SHA256(secret, dataCheckString)
    const secretKey = await crypto.subtle.importKey(
      'raw',
      secretBytes,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const hashBytes = await crypto.subtle.sign('HMAC', secretKey, encoder.encode(dataCheckString));
    
    // Convert to hex
    const hashArray = Array.from(new Uint8Array(hashBytes));
    const calculatedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    if (calculatedHash !== hash) {
      return { valid: false };
    }

    const userStr = params.get('user');
    if (!userStr) return { valid: false };

    return { valid: true, user: JSON.parse(userStr) };
  } catch (e) {
    console.error('Error verifying Telegram data:', e);
    return { valid: false };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const cryptobotToken = Deno.env.get('CRYPTOBOT_API_TOKEN');
    const telegramBotToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    
    if (!cryptobotToken) {
      console.error('CRYPTOBOT_API_TOKEN not configured');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { initData, telegram_id: providedTelegramId, plan, period, amount, currency = 'RUB' } = await req.json();

    let telegramId: number | null = null;

    // First try to verify via initData (most secure)
    if (initData && telegramBotToken) {
      const verification = await verifyTelegramWebAppData(initData, telegramBotToken);
      if (verification.valid && verification.user) {
        telegramId = verification.user.id;
        console.log(`User verified via initData: ${telegramId}`);
      }
    }

    // Fallback to provided telegram_id (for cases when user is in browser but has valid profile)
    if (!telegramId && providedTelegramId) {
      telegramId = providedTelegramId;
      console.log(`Using provided telegram_id: ${telegramId}`);
    }

    if (!telegramId) {
      console.error('No valid user identification');
      return new Response(JSON.stringify({ error: 'User identification required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Creating invoice for user ${telegramId}, plan: ${plan}, period: ${period}, amount: ${amount} ${currency}`);

    // Create invoice via CryptoBot API
    const invoicePayload = {
      currency_type: 'fiat',
      fiat: currency,
      amount: amount.toString(),
      description: `Подписка ${plan === 'plus' ? 'Plus' : 'Premium'} (${period === 'yearly' ? 'год' : 'месяц'})`,
      payload: JSON.stringify({
        telegram_id: telegramId,
        plan,
        period,
      }),
      paid_btn_name: 'callback',
      paid_btn_url: 'https://t.me/schooloff_bot/app',
      allow_comments: false,
      allow_anonymous: false,
    };

    console.log('Creating CryptoBot invoice:', JSON.stringify(invoicePayload, null, 2));

    const response = await fetch('https://pay.crypt.bot/api/createInvoice', {
      method: 'POST',
      headers: {
        'Crypto-Pay-API-Token': cryptobotToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invoicePayload),
    });

    const result = await response.json();
    console.log('CryptoBot response:', JSON.stringify(result, null, 2));

    if (!result.ok) {
      console.error('CryptoBot API error:', result.error);
      return new Response(JSON.stringify({ error: result.error?.name || 'Failed to create invoice' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Return the invoice URL for the user to pay
    return new Response(JSON.stringify({
      success: true,
      invoice_url: result.result.bot_invoice_url,
      invoice_id: result.result.invoice_id,
      mini_app_invoice_url: result.result.mini_app_invoice_url,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error creating invoice:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
