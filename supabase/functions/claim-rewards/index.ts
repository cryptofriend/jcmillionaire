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
    const { run_id, user_id } = await req.json();

    console.log('Claim rewards request:', { run_id, user_id });

    // Validate required fields
    if (!run_id || !user_id) {
      console.error('Missing required fields');
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: run_id, user_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user exists and was properly verified via World ID
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, nullifier_hash, verification_level')
      .eq('id', user_id)
      .maybeSingle();

    if (userError || !user) {
      console.error('User not found:', userError);
      return new Response(
        JSON.stringify({ success: false, error: 'User not found or not verified' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user was authenticated via World App wallet (not demo mode)
    if (!user.nullifier_hash || !user.nullifier_hash.startsWith('wallet_')) {
      console.error('User not properly authenticated via World ID wallet');
      return new Response(
        JSON.stringify({ success: false, error: 'World ID wallet verification required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
        JSON.stringify({ success: false, error: 'Failed to fetch run' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!run) {
      console.error('Run not found or does not belong to user');
      return new Response(
        JSON.stringify({ success: false, error: 'Run not found or unauthorized' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if run is completed and has earnings
    if (run.status !== 'completed') {
      console.error('Run is not completed');
      return new Response(
        JSON.stringify({ success: false, error: 'Run is not completed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (run.earned_amount <= 0) {
      console.error('No earnings to claim');
      return new Response(
        JSON.stringify({ success: false, error: 'No earnings to claim' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already claimed
    const { data: existingClaim } = await supabase
      .from('claims')
      .select('id, status')
      .eq('run_id', run_id)
      .maybeSingle();

    if (existingClaim && existingClaim.status === 'confirmed') {
      console.error('Already claimed:', existingClaim);
      return new Response(
        JSON.stringify({ success: false, error: 'Rewards already claimed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const amount = run.earned_amount;

    // Check if pool has enough remaining
    const today = new Date().toISOString().split('T')[0];
    const { data: dayState, error: dayStateError } = await supabase
      .from('day_state')
      .select('*')
      .eq('day_id', today)
      .maybeSingle();

    if (dayStateError) {
      console.error('Error fetching day state:', dayStateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch pool state' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If no day state exists, create one
    if (!dayState) {
      const { error: createDayStateError } = await supabase
        .from('day_state')
        .insert({
          day_id: today,
          pool_total: 1000000,
          pool_locked: 0,
          pool_remaining: 1000000,
        });
      
      if (createDayStateError) {
        console.error('Error creating day state:', createDayStateError);
      }
    }

    const poolRemaining = dayState?.pool_remaining ?? 1000000;
    
    // Check if pool has enough funds
    if (poolRemaining <= 0) {
      console.error('Pool is empty');
      return new Response(
        JSON.stringify({ success: false, error: 'Daily pool is empty. Come back tomorrow!' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Cap the claim amount to available pool
    const claimableAmount = Math.min(amount, poolRemaining);
    console.log('Claimable amount:', claimableAmount, 'Pool remaining:', poolRemaining);

    // Create or update the claim record as confirmed
    if (existingClaim) {
      // Update existing claim to confirmed
      const { error: updateError } = await supabase
        .from('claims')
        .update({ status: 'confirmed' })
        .eq('id', existingClaim.id);

      if (updateError) {
        console.error('Error updating claim:', updateError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to update claim' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Create new claim as confirmed directly
      const { error: claimError } = await supabase
        .from('claims')
        .insert({
          run_id,
          user_id,
          day_id: run.day_id,
          amount: claimableAmount,
          nonce: 'db-claim-' + Date.now(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          status: 'confirmed',
        });

      if (claimError) {
        console.error('Error creating claim:', claimError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to create claim' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Deduct from pool_remaining
    const newPoolRemaining = Math.max(0, poolRemaining - claimableAmount);
    const { error: updatePoolError } = await supabase
      .from('day_state')
      .update({ pool_remaining: newPoolRemaining })
      .eq('day_id', today);

    if (updatePoolError) {
      console.error('Error updating pool:', updatePoolError);
      // Continue anyway, don't fail the claim
    } else {
      console.log('Pool updated. New remaining:', newPoolRemaining);
    }

    // Update user balance - upsert to handle first-time claims
    const { data: existingBalance } = await supabase
      .from('user_balances')
      .select('total_claimed')
      .eq('user_id', user_id)
      .maybeSingle();

    if (existingBalance) {
      // Update existing balance
      const { error: balanceError } = await supabase
        .from('user_balances')
        .update({ total_claimed: existingBalance.total_claimed + claimableAmount })
        .eq('user_id', user_id);

      if (balanceError) {
        console.error('Error updating balance:', balanceError);
        // Don't fail the claim, just log the error
      }
    } else {
      // Insert new balance record
      const { error: balanceError } = await supabase
        .from('user_balances')
        .insert({
          user_id,
          total_claimed: claimableAmount,
        });

      if (balanceError) {
        console.error('Error inserting balance:', balanceError);
        // Don't fail the claim, just log the error
      }
    }

    // Get updated balance
    const { data: updatedBalance } = await supabase
      .from('user_balances')
      .select('total_claimed')
      .eq('user_id', user_id)
      .maybeSingle();

    // Update streak data
    const todayStr = new Date().toISOString().split('T')[0];
    const { data: existingStreak } = await supabase
      .from('user_streaks')
      .select('*')
      .eq('user_id', user_id)
      .maybeSingle();

    if (existingStreak) {
      const lastPlayDate = existingStreak.last_play_date;
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      let newStreak = existingStreak.current_streak;
      let totalDays = existingStreak.total_days_played;
      
      // Check if this is a new day
      if (lastPlayDate !== todayStr) {
        totalDays += 1;
        
        if (lastPlayDate === yesterday) {
          // Consecutive day - increment streak
          newStreak += 1;
        } else if (!lastPlayDate) {
          // First time playing
          newStreak = 1;
        } else {
          // Streak broken - reset to 1
          newStreak = 1;
        }
      }
      
      const newLongest = Math.max(existingStreak.longest_streak, newStreak);
      
      await supabase
        .from('user_streaks')
        .update({
          current_streak: newStreak,
          longest_streak: newLongest,
          last_play_date: todayStr,
          total_days_played: totalDays,
          total_runs: existingStreak.total_runs + 1,
          total_earned: existingStreak.total_earned + claimableAmount,
        })
        .eq('user_id', user_id);
    } else {
      // Create new streak record
      await supabase
        .from('user_streaks')
        .insert({
          user_id,
          current_streak: 1,
          longest_streak: 1,
          last_play_date: todayStr,
          total_days_played: 1,
          total_runs: 1,
          total_earned: claimableAmount,
        });
    }

    console.log('Claim successful. Amount:', claimableAmount, 'New total:', updatedBalance?.total_claimed);

    return new Response(
      JSON.stringify({
        success: true,
        amount: claimableAmount,
        totalBalance: updatedBalance?.total_claimed || claimableAmount,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in claim-rewards:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
