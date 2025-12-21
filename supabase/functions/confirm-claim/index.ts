import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { claim_id, tx_hash } = await req.json();

    console.log('Confirm claim request:', { claim_id, tx_hash });

    // Validate required fields
    if (!claim_id || !tx_hash) {
      console.error('Missing required fields');
      return new Response(
        JSON.stringify({ error: 'Missing required fields: claim_id, tx_hash' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate tx_hash format
    if (!tx_hash.match(/^0x[a-fA-F0-9]{64}$/)) {
      console.error('Invalid tx_hash format');
      return new Response(
        JSON.stringify({ error: 'Invalid transaction hash format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the claim
    const { data: claim, error: claimError } = await supabase
      .from('claims')
      .select('*')
      .eq('id', claim_id)
      .maybeSingle();

    if (claimError) {
      console.error('Error fetching claim:', claimError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch claim' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!claim) {
      console.error('Claim not found');
      return new Response(
        JSON.stringify({ error: 'Claim not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check claim status
    if (claim.status === 'confirmed') {
      console.log('Claim already confirmed');
      return new Response(
        JSON.stringify({ success: true, message: 'Claim already confirmed' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (claim.status !== 'authorized' && claim.status !== 'submitted') {
      console.error('Invalid claim status:', claim.status);
      return new Response(
        JSON.stringify({ error: `Cannot confirm claim with status: ${claim.status}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if claim is expired
    if (new Date(claim.expires_at) < new Date()) {
      console.error('Claim has expired');
      
      // Update status to expired
      await supabase
        .from('claims')
        .update({ status: 'expired' })
        .eq('id', claim_id);
      
      return new Response(
        JSON.stringify({ error: 'Claim has expired' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update claim to confirmed
    const { error: updateError } = await supabase
      .from('claims')
      .update({
        status: 'confirmed',
        tx_hash,
      })
      .eq('id', claim_id);

    if (updateError) {
      console.error('Error updating claim:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update claim' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Claim confirmed successfully:', claim_id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Claim confirmed',
        tx_hash,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in confirm-claim:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
