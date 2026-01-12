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

export interface LeaderboardPosition {
  rank: number;
  totalPlayers: number;
  balance: number;
  nextRank: {
    rank: number;
    balance: number;
    jcNeeded: number;
  } | null;
  isTopTen: boolean;
  isLeader: boolean;
  progressPercent: number;
}

/**
 * Get user's leaderboard position and progress to next rank
 */
export async function getUserLeaderboardPosition(userId: string): Promise<LeaderboardPosition | null> {
  // Get all balances ordered by total_claimed
  const { data: balances, error } = await supabase
    .from('user_balances')
    .select('user_id, total_claimed')
    .order('total_claimed', { ascending: false });

  if (error || !balances) {
    console.error('Error fetching leaderboard position:', error);
    return null;
  }

  const userIndex = balances.findIndex(b => b.user_id === userId);
  
  if (userIndex === -1) {
    // User not on leaderboard yet
    return {
      rank: balances.length + 1,
      totalPlayers: balances.length + 1,
      balance: 0,
      nextRank: balances.length > 0 ? {
        rank: balances.length,
        balance: balances[balances.length - 1].total_claimed,
        jcNeeded: balances[balances.length - 1].total_claimed + 1,
      } : null,
      isTopTen: false,
      isLeader: false,
      progressPercent: 0,
    };
  }

  const rank = userIndex + 1;
  const userBalance = balances[userIndex].total_claimed;
  const isLeader = rank === 1;
  const isTopTen = rank <= 10;

  let nextRank: LeaderboardPosition['nextRank'] = null;
  let progressPercent = 100;

  if (!isLeader && userIndex > 0) {
    const nextUserBalance = balances[userIndex - 1].total_claimed;
    const jcNeeded = nextUserBalance - userBalance + 1;
    
    // Calculate progress: how close to next rank
    // Find the balance of the person below (or 0 if last)
    const prevBalance = userIndex < balances.length - 1 
      ? balances[userIndex + 1].total_claimed 
      : 0;
    
    const totalGap = nextUserBalance - prevBalance;
    const currentProgress = userBalance - prevBalance;
    progressPercent = totalGap > 0 ? Math.min(99, Math.floor((currentProgress / totalGap) * 100)) : 50;

    nextRank = {
      rank: rank - 1,
      balance: nextUserBalance,
      jcNeeded,
    };
  }

  return {
    rank,
    totalPlayers: balances.length,
    balance: userBalance,
    nextRank,
    isTopTen,
    isLeader,
    progressPercent,
  };
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
