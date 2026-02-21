import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface TelegramLoginData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const telegramData = await req.json() as TelegramLoginData;

    const { id, first_name, last_name, username, photo_url, auth_date, hash } = telegramData;

    if (!id || !auth_date || !hash) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required Telegram fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check auth_date is not older than 1 day
    const now = Math.floor(Date.now() / 1000);
    if (now - auth_date > 86400) {
      return new Response(
        JSON.stringify({ success: false, error: 'Telegram auth data expired' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify hash using HMAC-SHA-256
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      console.error('TELEGRAM_BOT_TOKEN not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build data-check-string: alphabetically sorted key=value pairs (excluding hash)
    const checkData: Record<string, string> = {};
    if (auth_date) checkData['auth_date'] = String(auth_date);
    if (first_name) checkData['first_name'] = first_name;
    if (id) checkData['id'] = String(id);
    if (last_name) checkData['last_name'] = last_name;
    if (photo_url) checkData['photo_url'] = photo_url;
    if (username) checkData['username'] = username;

    const dataCheckString = Object.keys(checkData)
      .sort()
      .map(key => `${key}=${checkData[key]}`)
      .join('\n');

    // secret_key = SHA256(bot_token)
    const encoder = new TextEncoder();
    const secretKeyData = await crypto.subtle.digest('SHA-256', encoder.encode(botToken));
    const secretKey = await crypto.subtle.importKey(
      'raw',
      secretKeyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign('HMAC', secretKey, encoder.encode(dataCheckString));
    const computedHash = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    if (computedHash !== hash) {
      console.error('Telegram hash verification failed');
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid Telegram auth data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Telegram auth verified for user:', id, username);

    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const nullifierHash = `telegram_${id}`;

    // Check if user exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('nullifier_hash', nullifierHash)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching user:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: 'Database error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let user;
    const displayName = username || `${first_name}${last_name ? ' ' + last_name : ''}`;

    if (existingUser) {
      console.log('Existing Telegram user found:', existingUser.id);
      // Update profile picture if changed
      if (photo_url && photo_url !== existingUser.profile_picture_url) {
        await supabase
          .from('users')
          .update({ profile_picture_url: photo_url })
          .eq('id', existingUser.id);
      }
      user = existingUser;
    } else {
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          nullifier_hash: nullifierHash,
          verification_level: 'device',
          wallet_type: 'telegram',
          username: displayName,
          profile_picture_url: photo_url || null,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating user:', insertError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to create user' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('New Telegram user created:', newUser.id);
      user = newUser;
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: user.id,
          verification_level: user.verification_level,
          wallet_address: `telegram_${id}`,
          created_at: user.created_at,
          username: user.username || displayName,
          profile_picture_url: user.profile_picture_url,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Verify Telegram error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
