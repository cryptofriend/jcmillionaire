import { supabase } from '@/integrations/supabase/client';

export interface ClaimResult {
  success: boolean;
  amount?: number;
  totalBalance?: number;
  error?: string;
}

/**
 * Claim rewards for a completed run - credits directly to user's balance
 */
export async function claimRewards(
  runId: string,
  userId: string
): Promise<ClaimResult> {
  const { data, error } = await supabase.functions.invoke('claim-rewards', {
    body: {
      run_id: runId,
      user_id: userId,
    },
  });

  if (error) {
    console.error('Error claiming rewards:', error);
    return { success: false, error: error.message };
  }

  return data as ClaimResult;
}

/**
 * Get user's total claimed balance
 */
export async function getUserBalance(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('user_balances')
    .select('total_claimed')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching balance:', error);
    return 0;
  }

  return data?.total_claimed || 0;
}

/**
 * Format JC amount for display
 */
export function formatJC(amount: number): string {
  if (amount >= 1000000) {
    return (amount / 1000000).toFixed(1) + 'M';
  }
  if (amount >= 1000) {
    return (amount / 1000).toFixed(1) + 'K';
  }
  return amount.toLocaleString();
}
