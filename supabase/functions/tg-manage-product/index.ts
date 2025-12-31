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

async function verifyTelegramInitData(initData: string): Promise<{ user: any | null }> {
  const params = parseInitData(initData);
  const hash = params.get('hash');
  if (!hash) return { user: null };

  const pairs: string[] = [];
  params.forEach((value, key) => {
    if (key === 'hash') return;
    pairs.push(`${key}=${value}`);
  });
  pairs.sort();
  const dataCheckString = pairs.join('\n');

  const secretKey = await hmacSha256Raw('WebAppData', TELEGRAM_BOT_TOKEN);
  const checkHash = await hmacSha256Hex(secretKey, dataCheckString);

  if (checkHash !== hash) return { user: null };

  const userJson = params.get('user');
  if (!userJson) return { user: null };

  try {
    return { user: JSON.parse(userJson) };
  } catch {
    return { user: null };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { initData, action, productId, product } = await req.json();

    if (!initData) {
      return new Response(JSON.stringify({ error: 'initData required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { user: tgUser } = await verifyTelegramInitData(initData);
    if (!tgUser?.id) {
      return new Response(JSON.stringify({ error: 'Invalid initData' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, subscription_tier')
      .eq('telegram_id', tgUser.id)
      .maybeSingle();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user has premium subscription
    if (profile.subscription_tier !== 'premium') {
      return new Response(JSON.stringify({ error: 'Premium subscription required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'create') {
      // Determine media type
      let mediaType = null;
      if (product.media_url) {
        if (product.media_url.includes('youtube.com') || product.media_url.includes('youtu.be')) {
          mediaType = 'youtube';
        } else {
          mediaType = 'image';
        }
      }

      const { data: created, error } = await supabase
        .from('user_products')
        .insert({
          user_profile_id: profile.id,
          title: product.title,
          description: product.description,
          price: product.price,
          currency: product.currency || 'RUB',
          media_url: product.media_url,
          media_type: mediaType,
          link: product.link,
        })
        .select('*')
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ product: created }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'update' && productId) {
      // Verify ownership
      const { data: existing } = await supabase
        .from('user_products')
        .select('user_profile_id')
        .eq('id', productId)
        .maybeSingle();

      if (!existing || existing.user_profile_id !== profile.id) {
        return new Response(JSON.stringify({ error: 'Product not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      let mediaType = null;
      if (product.media_url) {
        if (product.media_url.includes('youtube.com') || product.media_url.includes('youtu.be')) {
          mediaType = 'youtube';
        } else {
          mediaType = 'image';
        }
      }

      const { data: updated, error } = await supabase
        .from('user_products')
        .update({
          title: product.title,
          description: product.description,
          price: product.price,
          currency: product.currency || 'RUB',
          media_url: product.media_url,
          media_type: mediaType,
          link: product.link,
          updated_at: new Date().toISOString(),
        })
        .eq('id', productId)
        .select('*')
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ product: updated }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'delete' && productId) {
      // Verify ownership
      const { data: existing } = await supabase
        .from('user_products')
        .select('user_profile_id')
        .eq('id', productId)
        .maybeSingle();

      if (!existing || existing.user_profile_id !== profile.id) {
        return new Response(JSON.stringify({ error: 'Product not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error } = await supabase
        .from('user_products')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('tg-manage-product error:', e);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});