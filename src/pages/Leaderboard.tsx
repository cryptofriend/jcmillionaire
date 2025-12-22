import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { JackieIcon, CoinIcon } from '@/components/icons/JackieIcon';
import { formatJC } from '@/lib/rewardsService';
import { supabase } from '@/integrations/supabase/client';
import { useGame } from '@/contexts/GameContext';
import { ArrowLeft, Trophy, Crown, Medal, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeaderboardEntry {
  user_id: string;
  total_claimed: number;
  rank: number;
  username?: string;
  profile_picture_url?: string;
}

const Leaderboard: React.FC = () => {
  const navigate = useNavigate();
  const { state } = useGame();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [userBalance, setUserBalance] = useState<number>(0);

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
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, username, profile_picture_url')
        .in('id', userIds);

      if (usersError) {
        console.error('Error fetching user profiles:', usersError);
      }

      // Create a map of user profiles
      const userMap = new Map(users?.map(u => [u.id, u]) || []);

      const rankedEntries = balances.map((entry, index) => {
        const userProfile = userMap.get(entry.user_id);
        return {
          ...entry,
          rank: index + 1,
          username: userProfile?.username || undefined,
          profile_picture_url: userProfile?.profile_picture_url || undefined,
        };
      });

      setEntries(rankedEntries);

      // Find current user's rank if they're verified
      if (state.user?.id) {
        const userEntry = rankedEntries.find(e => e.user_id === state.user?.id);
        if (userEntry) {
          setUserRank(userEntry.rank);
          setUserBalance(userEntry.total_claimed);
        } else {
          // User not in top 50, fetch their data separately
          const { data: userData } = await supabase
            .from('user_balances')
            .select('total_claimed')
            .eq('user_id', state.user.id)
            .maybeSingle();

          if (userData) {
            setUserBalance(userData.total_claimed);
            // Count how many users have more than this user
            const { count } = await supabase
              .from('user_balances')
              .select('*', { count: 'exact', head: true })
              .gt('total_claimed', userData.total_claimed);
            
            setUserRank((count || 0) + 1);
          }
        }
      }

      setLoading(false);
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

      {/* User's Rank Card (if verified) */}
      {state.isVerified && userRank !== null && (
        <div className="px-4 py-4">
          <div className="flex items-center gap-4 p-4 bg-primary/10 rounded-xl border border-primary/30">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/20">
              {getRankIcon(userRank)}
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Your Rank</p>
              <p className="text-2xl font-display font-bold">#{userRank}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Balance</p>
              <p className="text-lg font-bold text-gradient-gold">{formatJC(userBalance)} JC</p>
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
                  <div className="flex items-center justify-center w-10">
                    {getRankIcon(entry.rank)}
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
                    <p className="text-xs text-muted-foreground">
                      {entry.username ? `@${entry.username}` : entry.user_id.slice(0, 8) + '...'}
                    </p>
                  </div>

                  {/* Balance */}
                  <div className="flex items-center gap-2">
                    <CoinIcon size={20} />
                    <span className={cn(
                      'font-display font-bold',
                      entry.rank <= 3 ? 'text-lg' : 'text-base'
                    )}>
                      {formatJC(entry.total_claimed)}
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
              {formatJC(entries.reduce((sum, e) => sum + e.total_claimed, 0))}
            </p>
            <p className="text-xs text-muted-foreground">Total Claimed</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Leaderboard;
