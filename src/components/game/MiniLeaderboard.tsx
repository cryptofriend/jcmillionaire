import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useGame } from '@/contexts/GameContext';
import { formatJC } from '@/lib/rewardsService';
import { CoinIcon } from '@/components/icons/JackieIcon';
import { Trophy, Crown, Medal, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeaderboardEntry {
  user_id: string;
  total_claimed: number;
  rank: number;
  username?: string;
  profile_picture_url?: string;
}

export const MiniLeaderboard: React.FC = () => {
  const navigate = useNavigate();
  const { state } = useGame();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      
      const { data: balances, error: balanceError } = await supabase
        .from('user_balances')
        .select('user_id, total_claimed')
        .order('total_claimed', { ascending: false })
        .limit(5);

      if (balanceError || !balances) {
        setLoading(false);
        return;
      }

      const userIds = balances.map(b => b.user_id);
      const { data: users } = await supabase
        .from('users')
        .select('id, username, profile_picture_url')
        .in('id', userIds);

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
      setLoading(false);
    };

    fetchLeaderboard();
  }, []);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-4 h-4 text-yellow-400" />;
      case 2:
        return <Medal className="w-4 h-4 text-gray-300" />;
      case 3:
        return <Medal className="w-4 h-4 text-amber-600" />;
      default:
        return <span className="w-4 text-center text-xs font-bold text-muted-foreground">{rank}</span>;
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border p-4 shadow-soft">
      {/* Header */}
      <div 
        className="flex items-center justify-between mb-3 cursor-pointer"
        onClick={() => navigate('/leaderboard')}
      >
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          <h3 className="font-display font-bold text-foreground">Top Players</h3>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </div>

      {/* Entries */}
      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No players yet</p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => {
            const isCurrentUser = state.user?.id === entry.user_id;
            
            return (
              <div
                key={entry.user_id}
                className={cn(
                  'flex items-center gap-2 p-2 rounded-lg',
                  isCurrentUser ? 'bg-primary/10' : 'bg-muted/30'
                )}
              >
                {/* Rank */}
                <div className="w-5 flex justify-center">
                  {getRankIcon(entry.rank)}
                </div>

                {/* Avatar */}
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center overflow-hidden">
                  {entry.profile_picture_url ? (
                    <img 
                      src={entry.profile_picture_url} 
                      alt={entry.username || 'User'} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs font-bold text-primary">
                      {entry.username ? entry.username.charAt(0).toUpperCase() : `#${entry.rank}`}
                    </span>
                  )}
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-sm font-medium truncate',
                    isCurrentUser && 'text-primary'
                  )}>
                    {isCurrentUser ? 'You' : (entry.username || `Player ${entry.rank}`)}
                  </p>
                </div>

                {/* Balance */}
                <div className="flex items-center gap-1">
                  <CoinIcon size={14} />
                  <span className="text-sm font-display font-bold">
                    {formatJC(entry.total_claimed)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* View All */}
      <button
        onClick={() => navigate('/leaderboard')}
        className="w-full mt-3 py-2 text-sm text-primary font-medium hover:underline"
      >
        View Full Leaderboard
      </button>
    </div>
  );
};
