import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, crypto-pay-api-signature',
};

// Verify CryptoBot webhook signature using Web Crypto API
async function verifySignature(body: string, signature: string, token: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    
    // Create secret key: HMAC-SHA256("WebAppData", token)
    const webAppDataKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode('WebAppData'),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const secretBytes = await crypto.subtle.sign('HMAC', webAppDataKey, encoder.encode(token));
    
    // Create check hash: HMAC-SHA256(secret, body)
    const secretKey = await crypto.subtle.importKey(
      'raw',
      secretBytes,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const hashBytes = await crypto.subtle.sign('HMAC', secretKey, encoder.encode(body));
    
    // Convert to hex
    const hashArray = Array.from(new Uint8Array(hashBytes));
    const checkHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return checkHash === signature;
  } catch (e) {
    console.error('Signature verification error:', e);
    return false;
  }
}

// Generate one-time invite link for closed community
async function generateCommunityInviteLink(): Promise<string | null> {
  const botToken = Deno.env.get('COMMUNITY_BOT_TOKEN');
  const chatId = Deno.env.get('COMMUNITY_CHAT_ID');
  
  if (!botToken || !chatId) {
    console.error('Community bot token or chat ID not configured');
    return null;
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/createChatInviteLink`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          member_limit: 1, // One-time use link
        }),
      }
    );

    const data = await response.json();
    console.log('Create invite link response:', JSON.stringify(data));

    if (data.ok && data.result?.invite_link) {
      return data.result.invite_link;
    } else {
      console.error('Failed to create invite link:', data);
      return null;
    }
  } catch (error) {
    console.error('Error creating invite link:', error);
    return null;
  }
}

// Send message to user via main bot
async function sendTelegramMessage(telegramId: number, text: string): Promise<void> {
  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
  if (!botToken) {
    console.error('TELEGRAM_BOT_TOKEN not configured');
    return;
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegramId,
          text: text,
          parse_mode: 'HTML',
        }),
      }
    );

    const data = await response.json();
    if (!data.ok) {
      console.error('Failed to send Telegram message:', data);
    }
  } catch (error) {
    console.error('Error sending Telegram message:', error);
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const cryptobotToken = Deno.env.get('CRYPTOBOT_API_TOKEN');
    if (!cryptobotToken) {
      console.error('CRYPTOBOT_API_TOKEN not configured');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const bodyText = await req.text();
    const signature = req.headers.get('crypto-pay-api-signature') || '';

    // Verify webhook signature
    const isValid = await verifySignature(bodyText, signature, cryptobotToken);
    if (!isValid) {
      console.error('Invalid webhook signature');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = JSON.parse(bodyText);
    console.log('Received CryptoBot webhook:', JSON.stringify(body, null, 2));

    // CryptoBot sends update_type for webhook events
    if (body.update_type !== 'invoice_paid') {
      console.log('Ignoring non-payment update:', body.update_type);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const invoice = body.payload;
    if (!invoice || !invoice.payload) {
      console.error('No payload in invoice');
      return new Response(JSON.stringify({ error: 'Invalid payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse our custom payload
    let payloadData;
    try {
      payloadData = JSON.parse(invoice.payload);
    } catch (e) {
      console.error('Failed to parse invoice payload:', e);
      return new Response(JSON.stringify({ error: 'Invalid invoice payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { telegram_id, plan, period, amount_rub } = payloadData;
    console.log(`Processing payment for user ${telegram_id}, plan: ${plan}, period: ${period}, amount_rub: ${amount_rub}`);

    // Connect to Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate premium expiration
    const now = new Date();
    const expiresAt = period === 'yearly' 
      ? new Date(now.setFullYear(now.getFullYear() + 1))
      : new Date(now.setMonth(now.getMonth() + 1));

    // Find user profile by telegram_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, referred_by')
      .eq('telegram_id', telegram_id)
      .single();

    if (profileError || !profile) {
      console.error('User profile not found:', profileError);
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update user subscription
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        subscription_tier: plan,
        is_premium: true,
        premium_expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id);

    if (updateError) {
      console.error('Failed to update subscription:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to update subscription' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle referral earnings if user was referred
    if (profile.referred_by && amount_rub) {
      // Use amount_rub from payload (the price in rubles set by admin)
      const purchaseAmount = Number(amount_rub);
      
      // Check if referrer has partner role (50%), otherwise 30%
      const { data: partnerRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', profile.referred_by)
        .eq('role', 'partner')
        .maybeSingle();
      
      const referralPercent = partnerRole ? 0.5 : 0.3;
      const earningAmount = purchaseAmount * referralPercent;

      await supabase.from('referral_earnings').insert({
        referrer_id: profile.referred_by,
        referred_id: profile.id,
        purchase_type: `cryptobot_${plan}_${period}`,
        purchase_amount: purchaseAmount,
        earning_amount: earningAmount,
      });

      // Update referrer's total earnings and notify
      const { data: referrer } = await supabase
        .from('profiles')
        .select('referral_earnings, telegram_id')
        .eq('id', profile.referred_by)
        .single();

      if (referrer) {
        await supabase
          .from('profiles')
          .update({ referral_earnings: (referrer.referral_earnings || 0) + earningAmount })
          .eq('id', profile.referred_by);
        
        // Notify referrer
        if (referrer.telegram_id) {
          const percentText = partnerRole ? '50%' : '30%';
          await sendTelegramMessage(
            referrer.telegram_id,
            `💰 <b>Реферальный доход!</b>\n\nВаш реферал оформил подписку ${plan.toUpperCase()}.\n\n<b>Ваш доход (${percentText}):</b> ${earningAmount.toFixed(0)}₽`
          );
        }
      }
    }

    // Create notification for user
    await supabase.from('notifications').insert({
      user_profile_id: profile.id,
      type: 'subscription',
      message: `🎉 Подписка ${plan === 'plus' ? 'Plus' : 'Premium'} успешно активирована!`,
      is_read: false,
    });

    // For Plus subscribers, generate community invite link and send via Telegram
    if (plan === 'plus') {
      const inviteLink = await generateCommunityInviteLink();
      
      if (inviteLink) {
        const message = `🎉 <b>Добро пожаловать в Plus!</b>

Ваша подписка успешно активирована.

🔐 <b>Закрытое сообщество</b>
Для вступления в закрытое сообщество Plus-подписчиков перейдите по ссылке:

${inviteLink}

⚠️ Ссылка одноразовая и действует только для вас.
🚫 Не делитесь ссылкой, если не хотите потерять доступ к сообществу.

Спасибо, что вы с нами! 💪`;

        await sendTelegramMessage(telegram_id, message);
        console.log(`Sent community invite link to user ${telegram_id}`);
      } else {
        console.error('Failed to generate invite link for user', telegram_id);
      }
    }

    console.log(`Successfully activated ${plan} subscription for user ${telegram_id}`);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
