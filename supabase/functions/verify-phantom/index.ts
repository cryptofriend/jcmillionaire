import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as ed from 'https://esm.sh/@noble/ed25519@2.0.0';
import { decode as decodeBase58 } from 'https://esm.sh/bs58@5.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerifyPhantomRequest {
  publicKey: string;
  signature: string;
  message: string;
  nonce: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { publicKey, signature, message, nonce } = await req.json() as VerifyPhantomRequest;

    console.log('Verify Phantom request:', { 
      publicKey,
      nonce,
      messageLength: message.length,
    });

    // Validate inputs
    if (!publicKey || !signature || !message || !nonce) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the message contains the nonce
    if (!message.includes(nonce)) {
      console.error('Nonce mismatch in message');
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid nonce' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the message contains the public key
    if (!message.includes(publicKey)) {
      console.error('Public key mismatch in message');
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Decode and verify signature
    try {
      const publicKeyBytes = decodeBase58(publicKey);
      const signatureBytes = decodeBase58(signature);
      const messageBytes = new TextEncoder().encode(message);

      const isValid = await ed.verify(signatureBytes, messageBytes, publicKeyBytes);
      
      if (!isValid) {
        console.error('Signature verification failed');
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid signature' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } catch (verifyError) {
      console.error('Signature verification error:', verifyError);
      return new Response(
        JSON.stringify({ success: false, error: 'Signature verification failed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Signature verified successfully for:', publicKey);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Use Solana address as the unique identifier
    const nullifierHash = `solana_${publicKey}`;

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

    if (existingUser) {
      console.log('Existing Solana user found:', existingUser.id);
      user = existingUser;
    } else {
      // Create new user for Solana wallet
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          nullifier_hash: nullifierHash,
          verification_level: 'device', // Solana wallets are device-level verification
          wallet_type: 'solana',
          solana_address: publicKey,
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

      console.log('New Solana user created:', newUser.id);
      user = newUser;
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: user.id,
          verification_level: user.verification_level,
          wallet_address: publicKey,
          created_at: user.created_at,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Verify Phantom error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
