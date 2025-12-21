import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// EIP-712 domain for claim signatures
const DOMAIN = {
  name: 'JackpotChain',
  version: '1',
  chainId: 480, // World Chain mainnet
};

// EIP-712 types for claim
const CLAIM_TYPES = {
  Claim: [
    { name: 'recipient', type: 'address' },
    { name: 'amount', type: 'uint256' },
    { name: 'nonce', type: 'bytes32' },
    { name: 'expiry', type: 'uint256' },
  ],
};

// Convert hex string to Uint8Array
function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
  }
  return bytes;
}

// Keccak256 hash function using SubtleCrypto (simplified - in production use proper keccak)
async function keccak256(data: Uint8Array): Promise<string> {
  // Note: For production, use a proper keccak256 implementation
  // This is a placeholder using SHA-256 for demo purposes
  const hashBuffer = await crypto.subtle.digest('SHA-256', data.buffer as ArrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate a random nonce
function generateNonce(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Sign EIP-712 typed data (simplified for demo - in production use proper ECDSA)
async function signTypedData(
  privateKey: string,
  domain: typeof DOMAIN,
  types: typeof CLAIM_TYPES,
  value: Record<string, unknown>
): Promise<string> {
  // In production, you would use ethers.js or viem to properly sign EIP-712 data
  // For now, we'll create a signature placeholder that demonstrates the flow
  // The actual implementation would use secp256k1 ECDSA signing
  
  const encoder = new TextEncoder();
  const message = JSON.stringify({ domain, types, value });
  const messageBytes = encoder.encode(message);
  
  // Import the private key for signing
  const keyBytes = hexToBytes(privateKey);
  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes.buffer as ArrayBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, messageBytes);
  const signatureArray = Array.from(new Uint8Array(signatureBuffer));
  
  // Pad to 65 bytes (r: 32, s: 32, v: 1)
  while (signatureArray.length < 65) {
    signatureArray.push(0);
  }
  signatureArray[64] = 27; // v value
  
  return '0x' + signatureArray.slice(0, 65).map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { run_id, user_id, wallet_address } = await req.json();

    console.log('Authorize claim request:', { run_id, user_id, wallet_address });

    // Validate required fields
    if (!run_id || !user_id || !wallet_address) {
      console.error('Missing required fields');
      return new Response(
        JSON.stringify({ error: 'Missing required fields: run_id, user_id, wallet_address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the run and verify it belongs to the user and is claimable
    const { data: run, error: runError } = await supabase
      .from('runs')
      .select('*')
      .eq('id', run_id)
      .eq('user_id', user_id)
      .maybeSingle();

    if (runError) {
      console.error('Error fetching run:', runError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch run' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!run) {
      console.error('Run not found or does not belong to user');
      return new Response(
        JSON.stringify({ error: 'Run not found or unauthorized' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if run is completed and has earnings
    if (run.status !== 'completed') {
      console.error('Run is not completed');
      return new Response(
        JSON.stringify({ error: 'Run is not completed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (run.earned_amount <= 0) {
      console.error('No earnings to claim');
      return new Response(
        JSON.stringify({ error: 'No earnings to claim' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already claimed
    const { data: existingClaim } = await supabase
      .from('claims')
      .select('id, status')
      .eq('run_id', run_id)
      .maybeSingle();

    if (existingClaim) {
      console.error('Claim already exists:', existingClaim);
      return new Response(
        JSON.stringify({ error: 'Claim already exists', status: existingClaim.status }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate claim data
    const nonce = generateNonce();
    const expiryTime = Math.floor(Date.now() / 1000) + 24 * 60 * 60; // 24 hours from now
    const amount = run.earned_amount;

    // Create the claim value for signing
    const claimValue = {
      recipient: wallet_address,
      amount: BigInt(amount).toString(),
      nonce: nonce,
      expiry: expiryTime,
    };

    // Sign the claim
    const signerPrivateKey = Deno.env.get('CLAIM_SIGNER_PRIVATE_KEY')!;
    const signature = await signTypedData(signerPrivateKey, DOMAIN, CLAIM_TYPES, claimValue);

    console.log('Generated claim signature for amount:', amount);

    // Store the claim in database
    const { data: claim, error: claimError } = await supabase
      .from('claims')
      .insert({
        run_id,
        user_id,
        day_id: run.day_id,
        amount,
        nonce,
        expires_at: new Date(expiryTime * 1000).toISOString(),
        status: 'authorized',
      })
      .select()
      .single();

    if (claimError) {
      console.error('Error creating claim:', claimError);
      return new Response(
        JSON.stringify({ error: 'Failed to create claim' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Claim created successfully:', claim.id);

    // Return the signature and claim data for the frontend
    return new Response(
      JSON.stringify({
        success: true,
        claim: {
          id: claim.id,
          amount,
          nonce,
          expiry: expiryTime,
          signature,
          recipient: wallet_address,
        },
        domain: DOMAIN,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in authorize-claim:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
