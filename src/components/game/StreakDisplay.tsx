import React, { useEffect, useState } from 'react';
import { Flame, Calendar, Trophy, Coins } from 'lucide-react';
import { getUserStreak, isStreakActive, isStreakAtRisk, UserStreak } from '@/lib/streakService';
import { formatJC } from '@/lib/rewardsService';
import { useGame } from '@/contexts/GameContext';

export const StreakDisplay: React.FC = () => {
  const { state } = useGame();
  const [streak, setStreak] = useState<UserStreak | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStreak() {
      if (!state.user?.id) {
        setIsLoading(false);
        return;
      }
      
      const data = await getUserStreak(state.user.id);
      setStreak(data);
      setIsLoading(false);
    }
    
    fetchStreak();
  }, [state.user?.id]);

  if (isLoading || !state.isVerified) {
    return null;
  }

  // Show a starter card if no streak data yet
  if (!streak) {
    return (
      <div className="bg-card rounded-xl border border-border p-4 shadow-soft">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-muted rounded-lg">
            <Flame className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Start your streak!</p>
            <p className="text-xs text-muted-foreground">Play daily to build your streak</p>
          </div>
        </div>
      </div>
    );
  }

  const active = isStreakActive(streak.last_play_date);
  const atRisk = isStreakAtRisk(streak.last_play_date);

  return (
    <div className="bg-card rounded-xl border border-border p-4 shadow-soft space-y-3">
      {/* Streak Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${active ? 'bg-orange-500/20' : 'bg-muted'}`}>
            <Flame className={`w-5 h-5 ${active ? 'text-orange-500' : 'text-muted-foreground'}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-display font-bold text-foreground">
                {streak.current_streak}
              </p>
              <span className="text-sm text-muted-foreground">day streak</span>
            </div>
            {atRisk && (
              <p className="text-xs text-orange-500 font-medium">Play today to keep it!</p>
            )}
            {!active && streak.current_streak === 0 && (
              <p className="text-xs text-muted-foreground">Start a new streak today!</p>
            )}
          </div>
        </div>
        
        {/* Best Streak Badge */}
        {streak.longest_streak > 0 && (
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Best</p>
            <p className="text-lg font-display font-bold text-primary">{streak.longest_streak}</p>
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-muted-foreground">
            <Calendar className="w-3 h-3" />
          </div>
          <p className="text-lg font-display font-bold text-foreground">{streak.total_days_played}</p>
          <p className="text-xs text-muted-foreground">Days</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-muted-foreground">
            <Trophy className="w-3 h-3" />
          </div>
          <p className="text-lg font-display font-bold text-foreground">{streak.total_runs}</p>
          <p className="text-xs text-muted-foreground">Runs</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-muted-foreground">
            <Coins className="w-3 h-3" />
          </div>
          <p className="text-lg font-display font-bold text-foreground">{formatJC(streak.total_earned)}</p>
          <p className="text-xs text-muted-foreground">Earned</p>
        </div>
      </div>
    </div>
  );
};
