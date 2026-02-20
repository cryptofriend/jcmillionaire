import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate a cryptographically secure nonce
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const nonce = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');

    // Store nonce in database
    const { error } = await supabase
      .from('auth_nonces')
      .insert({ nonce });

    if (error) {
      console.error('Error storing nonce:', error);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to generate nonce' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean up old nonces (older than 24 hours)
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    await supabase
      .from('auth_nonces')
      .delete()
      .lt('created_at', cutoff);

    return new Response(
      JSON.stringify({ success: true, nonce }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Generate nonce error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
