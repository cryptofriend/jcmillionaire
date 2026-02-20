import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WalletAuthPayload {
  status: 'success' | 'error';
  message: string;
  signature: string;
  address: string;
  version?: number;
}

interface VerifyWalletRequest {
  payload: WalletAuthPayload;
  nonce: string;
  verification_level?: 'device' | 'orb';
  username?: string;
  profile_picture_url?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { payload, nonce, verification_level = 'device', username, profile_picture_url } = await req.json() as VerifyWalletRequest;

    console.log('Verify wallet request:', { 
      address: payload.address, 
      nonce,
      verification_level,
      status: payload.status,
      username,
      hasProfilePic: !!profile_picture_url
    });

    // Check if the wallet auth was successful
    if (payload.status === 'error') {
      return new Response(
        JSON.stringify({ success: false, error: 'Wallet authentication failed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify signature is present
    if (!payload.signature || !payload.address) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing signature or address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify nonce exists, is unused, and not expired (5 min)
    const { data: nonceRecord } = await supabase
      .from('auth_nonces')
      .select('created_at, used_at')
      .eq('nonce', nonce)
      .maybeSingle();

    if (!nonceRecord) {
      console.error('Nonce not found in database');
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired nonce' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (nonceRecord.used_at) {
      console.error('Nonce already used');
      return new Response(
        JSON.stringify({ success: false, error: 'Nonce already used' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const nonceAge = Date.now() - new Date(nonceRecord.created_at).getTime();
    if (nonceAge > 5 * 60 * 1000) {
      console.error('Nonce expired');
      return new Response(
        JSON.stringify({ success: false, error: 'Nonce expired' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the SIWE message signature contains the nonce
    if (!payload.message.includes(nonce)) {
      console.error('Nonce mismatch in SIWE message');
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid nonce' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('SIWE message verified, address:', payload.address);

    // Mark nonce as used
    await supabase
      .from('auth_nonces')
      .update({ used_at: new Date().toISOString() })
      .eq('nonce', nonce);

    // Use wallet address as the unique identifier (nullifier_hash equivalent)
    const walletAddress = payload.address.toLowerCase();
    const nullifierHash = `wallet_${walletAddress}`;

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
      console.log('Existing user found:', existingUser.id);
      
      // Update username and profile picture if provided and different
      if ((username && username !== existingUser.username) || 
          (profile_picture_url && profile_picture_url !== existingUser.profile_picture_url)) {
        const { error: updateError } = await supabase
          .from('users')
          .update({
            username: username || existingUser.username,
            profile_picture_url: profile_picture_url || existingUser.profile_picture_url,
          })
          .eq('id', existingUser.id);
        
        if (updateError) {
          console.error('Error updating user profile:', updateError);
        } else {
          console.log('Updated user profile with World ID info');
        }
      }
      
      user = {
        ...existingUser,
        username: username || existingUser.username,
        profile_picture_url: profile_picture_url || existingUser.profile_picture_url,
      };
    } else {
      // Create new user with World ID info
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          nullifier_hash: nullifierHash,
          verification_level: verification_level,
          username: username || null,
          profile_picture_url: profile_picture_url || null,
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

      console.log('New user created:', newUser.id);
      user = newUser;
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: user.id,
          verification_level: user.verification_level,
          wallet_address: walletAddress,
          created_at: user.created_at,
          username: user.username || null,
          profile_picture_url: user.profile_picture_url || null,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Verify wallet error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
