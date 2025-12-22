import { supabase } from '@/integrations/supabase/client';

export interface UserStreak {
  current_streak: number;
  longest_streak: number;
  last_play_date: string | null;
  total_days_played: number;
  total_runs: number;
  total_earned: number;
}

/**
 * Get user's streak data
 */
export async function getUserStreak(userId: string): Promise<UserStreak | null> {
  const { data, error } = await supabase
    .from('user_streaks')
    .select('current_streak, longest_streak, last_play_date, total_days_played, total_runs, total_earned')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching streak:', error);
    return null;
  }

  return data;
}

/**
 * Check if user has an active streak (played yesterday or today)
 */
export function isStreakActive(lastPlayDate: string | null): boolean {
  if (!lastPlayDate) return false;
  
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  return lastPlayDate === today || lastPlayDate === yesterday;
}

/**
 * Check if streak is at risk (played yesterday but not today)
 */
export function isStreakAtRisk(lastPlayDate: string | null): boolean {
  if (!lastPlayDate) return false;
  
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  return lastPlayDate === yesterday && lastPlayDate !== today;
}
