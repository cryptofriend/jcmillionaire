import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get today's date (UTC)
    const today = new Date().toISOString().split('T')[0];

    // Check if we already have snapshots for today
    const { data: existingSnapshots } = await supabase
      .from('leaderboard_snapshots')
      .select('id')
      .eq('day_id', today)
      .limit(1);

    if (existingSnapshots && existingSnapshots.length > 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Snapshots already exist for today',
          day_id: today 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all user balances ordered by total_claimed
    const { data: balances, error: balanceError } = await supabase
      .from('user_balances')
      .select('user_id, total_claimed')
      .order('total_claimed', { ascending: false });

    if (balanceError) {
      throw new Error(`Failed to fetch balances: ${balanceError.message}`);
    }

    if (!balances || balances.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No balances to snapshot',
          day_id: today,
          count: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create snapshot entries with ranks
    const snapshots = balances.map((entry, index) => ({
      day_id: today,
      user_id: entry.user_id,
      rank: index + 1,
      total_claimed: entry.total_claimed,
    }));

    // Insert snapshots in batches of 100
    const batchSize = 100;
    let insertedCount = 0;

    for (let i = 0; i < snapshots.length; i += batchSize) {
      const batch = snapshots.slice(i, i + batchSize);
      const { error: insertError } = await supabase
        .from('leaderboard_snapshots')
        .insert(batch);

      if (insertError) {
        console.error(`Batch insert error at ${i}:`, insertError);
        throw new Error(`Failed to insert snapshots: ${insertError.message}`);
      }
      insertedCount += batch.length;
    }

    console.log(`Created ${insertedCount} leaderboard snapshots for ${today}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Leaderboard snapshots created',
        day_id: today,
        count: insertedCount 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Snapshot error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
