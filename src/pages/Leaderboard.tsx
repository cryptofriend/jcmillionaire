import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { JackieIcon, CoinIcon } from '@/components/icons/JackieIcon';
import { formatJC } from '@/lib/rewardsService';
import { supabase } from '@/integrations/supabase/client';
import { useGame } from '@/contexts/GameContext';
import { ArrowLeft, Trophy, Crown, Medal, Loader2, Rocket, Users, Gamepad2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MiniKit } from '@worldcoin/minikit-js';

// Airdrop date - April 3, 2026 at 9pm Vietnam time (UTC+7) = 14:00 UTC
const AIRDROP_DATE = new Date('2026-03-31T14:00:00Z');

function getTimeUntilAirdrop(): { days: number; hours: number; minutes: number; seconds: number } {
  const now = new Date();
  const diff = Math.max(0, AIRDROP_DATE.getTime() - now.getTime());
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  return { days, hours, minutes, seconds };
}

interface LeaderboardEntry {
  user_id: string;
  total_claimed: number;
  rank: number;
  username?: string;
  profile_picture_url?: string;
  invited_count: number;
  games_played: number;
  rank_change: number | null; // positive = moved up, negative = moved down, null = new
}

const Leaderboard: React.FC = () => {
  const navigate = useNavigate();
  const { state } = useGame();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [userBalance, setUserBalance] = useState<number>(0);
  const [userStats, setUserStats] = useState<{ invited: number; games: number }>({ invited: 0, games: 0 });
  const [userRankChange, setUserRankChange] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(getTimeUntilAirdrop());

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(getTimeUntilAirdrop());
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      
      // Fetch top 50 users by total_claimed with user profile info
      const { data: balances, error: balanceError } = await supabase
        .from('user_balances')
        .select('user_id, total_claimed')
        .order('total_claimed', { ascending: false })
        .limit(50);

      if (balanceError) {
        console.error('Error fetching leaderboard:', balanceError);
        setLoading(false);
        return;
      }

      if (!balances || balances.length === 0) {
        setEntries([]);
        setLoading(false);
        return;
      }

      // Fetch user profiles for these users
      const userIds = balances.map(b => b.user_id);
      
      // Get yesterday's date
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      const [usersResult, referralsResult, runsResult, snapshotsResult] = await Promise.all([
        supabase
          .from('users')
          .select('id, username, profile_picture_url')
          .in('id', userIds),
        supabase
          .from('referrals')
          .select('inviter_user_id')
          .in('inviter_user_id', userIds)
          .eq('status', 'first_run_completed'),
        supabase
          .from('runs')
          .select('user_id')
          .in('user_id', userIds),
        supabase
          .from('leaderboard_snapshots')
          .select('user_id, rank')
          .eq('day_id', yesterdayStr)
          .in('user_id', userIds)
      ]);

      if (usersResult.error) {
        console.error('Error fetching user profiles:', usersResult.error);
      }

      // Create maps for quick lookup
      const userMap = new Map(usersResult.data?.map(u => [u.id, u]) || []);
      
      // Count referrals per user
      const referralCounts = new Map<string, number>();
      referralsResult.data?.forEach(r => {
        referralCounts.set(r.inviter_user_id, (referralCounts.get(r.inviter_user_id) || 0) + 1);
      });
      
      // Count runs per user
      const runCounts = new Map<string, number>();
      runsResult.data?.forEach(r => {
        runCounts.set(r.user_id, (runCounts.get(r.user_id) || 0) + 1);
      });

      // Map yesterday's ranks
      const yesterdayRanks = new Map<string, number>();
      snapshotsResult.data?.forEach(s => {
        yesterdayRanks.set(s.user_id, s.rank);
      });

      const rankedEntries = balances.map((entry, index) => {
        const userProfile = userMap.get(entry.user_id);
        const currentRank = index + 1;
        const yesterdayRank = yesterdayRanks.get(entry.user_id);
        // Rank change: positive means moved up (lower rank number is better)
        const rankChange = yesterdayRank !== undefined ? yesterdayRank - currentRank : null;
        
        return {
          ...entry,
          rank: currentRank,
          username: userProfile?.username || undefined,
          profile_picture_url: userProfile?.profile_picture_url || undefined,
          invited_count: referralCounts.get(entry.user_id) || 0,
          games_played: runCounts.get(entry.user_id) || 0,
          rank_change: rankChange,
        };
      });

      setEntries(rankedEntries);

      // Try to fetch missing usernames via MiniKit for users without usernames
      if (MiniKit.isInstalled()) {
        fetchMissingUsernames(rankedEntries, userMap);
      }

      // Find current user's rank if they're verified
      if (state.user?.id) {
        const userEntry = rankedEntries.find(e => e.user_id === state.user?.id);
        if (userEntry) {
          setUserRank(userEntry.rank);
          setUserBalance(userEntry.total_claimed);
          setUserStats({ invited: userEntry.invited_count, games: userEntry.games_played });
          setUserRankChange(userEntry.rank_change);
        } else {
          // User not in top 50, fetch their data separately
          const [userBalanceResult, userReferralsResult, userRunsResult, userSnapshotResult] = await Promise.all([
            supabase
              .from('user_balances')
              .select('total_claimed')
              .eq('user_id', state.user.id)
              .maybeSingle(),
            supabase
              .from('referrals')
              .select('id')
              .eq('inviter_user_id', state.user.id)
              .eq('status', 'first_run_completed'),
            supabase
              .from('runs')
              .select('id')
              .eq('user_id', state.user.id),
            supabase
              .from('leaderboard_snapshots')
              .select('rank')
              .eq('day_id', yesterdayStr)
              .eq('user_id', state.user.id)
              .maybeSingle()
          ]);

          if (userBalanceResult.data) {
            setUserBalance(userBalanceResult.data.total_claimed);
            // Count how many users have more than this user
            const { count } = await supabase
              .from('user_balances')
              .select('*', { count: 'exact', head: true })
              .gt('total_claimed', userBalanceResult.data.total_claimed);
            
            const currentRank = (count || 0) + 1;
            setUserRank(currentRank);
            
            if (userSnapshotResult.data) {
              setUserRankChange(userSnapshotResult.data.rank - currentRank);
            }
          }
          
          setUserStats({
            invited: userReferralsResult.data?.length || 0,
            games: userRunsResult.data?.length || 0
          });
        }
      }

      setLoading(false);
    };

    // Fetch usernames via MiniKit for users that don't have them stored
    const fetchMissingUsernames = async (
      rankedEntries: LeaderboardEntry[],
      userMap: Map<string, { id: string; username?: string | null; profile_picture_url?: string | null }>
    ) => {
      // Get entries without usernames (limit to first 10 to avoid too many API calls)
      const entriesWithoutUsername = rankedEntries
        .filter(e => !e.username)
        .slice(0, 10);

      if (entriesWithoutUsername.length === 0) return;

      // We need wallet addresses to look up usernames
      // First get wallet addresses from users table (if stored) or we can't look them up
      // For now, let's just display what we have from the database

      // The MiniKit.getUserByAddress requires a wallet address, not user ID
      // Since we don't store wallet addresses publicly, we'll need to rely on
      // the usernames stored during verification
    };

    fetchLeaderboard();
  }, [state.user?.id]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-400" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-300" />;
      case 3:
        return <Medal className="w-6 h-6 text-amber-600" />;
      default:
        return <span className="w-6 h-6 flex items-center justify-center text-sm font-bold text-muted-foreground">{rank}</span>;
    }
  };

  const getRankChangeIndicator = (rankChange: number | null) => {
    if (rankChange === null) {
      return <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-muted">NEW</span>;
    }
    if (rankChange > 0) {
      return (
        <span className="flex items-center gap-0.5 text-xs text-success">
          <TrendingUp className="w-3 h-3" />
          {rankChange}
        </span>
      );
    }
    if (rankChange < 0) {
      return (
        <span className="flex items-center gap-0.5 text-xs text-destructive">
          <TrendingDown className="w-3 h-3" />
          {Math.abs(rankChange)}
        </span>
      );
    }
    return (
      <span className="flex items-center text-xs text-muted-foreground">
        <Minus className="w-3 h-3" />
      </span>
    );
  };

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-yellow-500/40';
      case 2:
        return 'bg-gradient-to-r from-gray-400/20 to-gray-300/20 border-gray-400/40';
      case 3:
        return 'bg-gradient-to-r from-amber-600/20 to-orange-500/20 border-amber-600/40';
      default:
        return 'bg-card border-border';
    }
  };

  return (
    <div className="min-h-screen gradient-hero flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2">
          <Trophy className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-display font-bold">Leaderboard</h1>
        </div>
      </header>

      {/* Airdrop Countdown Hero */}
      <div className="px-4 py-5">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/30 p-5">
          {/* Decorative elements */}
          <div className="absolute top-2 right-2 opacity-20">
            <Rocket className="w-12 h-12 text-primary animate-float" />
          </div>
          
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-2">
              <CoinIcon size={24} />
              <h2 className="text-lg font-display font-bold text-foreground">$JC Airdrop in</h2>
            </div>
            
            {/* Countdown Timer */}
            <div className="flex items-center justify-center gap-2">
              <div className="flex flex-col items-center px-3 py-2 bg-background/50 rounded-lg min-w-[60px] backdrop-blur-sm">
                <span className="text-2xl font-display font-bold text-primary">
                  {String(countdown.days).padStart(2, '0')}
                </span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">days</span>
              </div>
              <span className="text-2xl font-bold text-muted-foreground">:</span>
              <div className="flex flex-col items-center px-3 py-2 bg-background/50 rounded-lg min-w-[50px] backdrop-blur-sm">
                <span className="text-2xl font-display font-bold text-primary">
                  {String(countdown.hours).padStart(2, '0')}
                </span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">hrs</span>
              </div>
              <span className="text-2xl font-bold text-muted-foreground">:</span>
              <div className="flex flex-col items-center px-3 py-2 bg-background/50 rounded-lg min-w-[50px] backdrop-blur-sm">
                <span className="text-2xl font-display font-bold text-primary">
                  {String(countdown.minutes).padStart(2, '0')}
                </span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">min</span>
              </div>
              <span className="text-2xl font-bold text-muted-foreground">:</span>
              <div className="flex flex-col items-center px-3 py-2 bg-background/50 rounded-lg min-w-[50px] backdrop-blur-sm">
                <span className="text-2xl font-display font-bold text-primary">
                  {String(countdown.seconds).padStart(2, '0')}
                </span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">sec</span>
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              airdrop distribution will be based on your leaderboard position
            </p>
          </div>
        </div>
      </div>

      {/* User's Rank Card (if verified) */}
      {state.isVerified && userRank !== null && (
        <div className="px-4 py-4">
          <div className="p-4 bg-primary/10 rounded-xl border border-primary/30 space-y-3">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/20">
                {getRankIcon(userRank)}
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Your Rank</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-display font-bold">#{userRank}</p>
                  {getRankChangeIndicator(userRankChange)}
                </div>
              </div>
            </div>
            {/* Additional Stats */}
            <div className="flex justify-around pt-2 border-t border-primary/20">
              <div className="flex items-center gap-1.5 text-sm">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{userStats.invited}</span>
                <span className="text-muted-foreground">invited</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <Gamepad2 className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{userStats.games}</span>
                <span className="text-muted-foreground">games</span>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Balance</p>
              <p className="text-lg font-bold text-gradient-gold">{userBalance.toLocaleString()} JC</p>
            </div>
              <div className="flex items-center gap-1.5 text-sm">
                <CoinIcon size={16} />
                <span className="font-medium">{userBalance.toLocaleString()}</span>
                <span className="text-muted-foreground">JC</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard List */}
      <main className="flex-1 px-4 pb-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <JackieIcon size={80} className="opacity-50 mb-4" />
            <p className="text-muted-foreground">No claims yet!</p>
            <p className="text-sm text-muted-foreground">Be the first to claim rewards.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => {
              const isCurrentUser = state.user?.id === entry.user_id;
              
              return (
                <div
                  key={entry.user_id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl border transition-all',
                    getRankStyle(entry.rank),
                    isCurrentUser && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                  )}
                >
                  {/* Rank */}
                  <div className="flex flex-col items-center justify-center w-10">
                    {getRankIcon(entry.rank)}
                    {getRankChangeIndicator(entry.rank_change)}
                  </div>

                  {/* User Avatar */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center overflow-hidden">
                    {entry.profile_picture_url ? (
                      <img 
                        src={entry.profile_picture_url} 
                        alt={entry.username || 'User'} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback if image fails to load
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <span className={cn(
                      "text-sm font-bold text-primary",
                      entry.profile_picture_url && "hidden"
                    )}>
                      {entry.username ? entry.username.charAt(0).toUpperCase() : (isCurrentUser ? 'Y' : `#${entry.rank}`)}
                    </span>
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'font-medium truncate',
                      isCurrentUser && 'text-primary'
                    )}>
                      {isCurrentUser ? 'You' : (entry.username || `Player ${entry.rank}`)}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {entry.invited_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <Gamepad2 className="w-3 h-3" />
                        {entry.games_played}
                      </span>
                    </div>
                  </div>

                  {/* Balance */}
                  <div className="flex items-center gap-2">
                    <CoinIcon size={20} />
                    <span className={cn(
                      'font-display font-bold',
                      entry.rank <= 3 ? 'text-lg' : 'text-base'
                    )}>
                      {entry.total_claimed.toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer Stats */}
      <footer className="px-4 py-4 border-t border-border/50">
        <div className="flex justify-center gap-6 text-center">
          <div>
            <p className="text-2xl font-display font-bold text-primary">{entries.length}</p>
            <p className="text-xs text-muted-foreground">Players</p>
          </div>
          <div className="w-px bg-border" />
          <div>
            <p className="text-2xl font-display font-bold text-gradient-gold">
              {entries.reduce((sum, e) => sum + e.total_claimed, 0).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">Total Claimed</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Leaderboard;
