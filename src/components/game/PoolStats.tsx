import React from 'react';
import { DayState } from '@/lib/types';
import { formatJC } from '@/lib/constants';
import { CoinIcon } from '@/components/icons/JackieIcon';
import { TrendingUp } from 'lucide-react';

interface PoolStatsProps {
  dayState: DayState | null;
}

export const PoolStats: React.FC<PoolStatsProps> = ({ dayState }) => {
  if (!dayState) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-card rounded-xl border border-border">
        <div className="w-20 h-4 bg-secondary rounded animate-pulse" />
      </div>
    );
  }

  const percentage = (dayState.poolRemaining / dayState.poolTotal) * 100;

  return (
    <div className="flex flex-col gap-2 px-4 py-3 bg-card rounded-xl border border-border shadow-soft">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <span className="text-xs font-medium text-muted-foreground">Daily Pool</span>
        </div>
        <div className="flex items-center gap-1">
          <CoinIcon size={16} />
          <span className="text-sm font-bold text-foreground">
            {formatJC(dayState.poolRemaining)}
          </span>
          <span className="text-xs text-muted-foreground">
            / {formatJC(dayState.poolTotal)}
          </span>
        </div>
      </div>
      
      <div className="relative w-full h-2 bg-secondary rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full gradient-gold transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
