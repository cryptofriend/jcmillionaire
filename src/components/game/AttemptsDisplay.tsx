import React from 'react';
import { Attempts } from '@/lib/types';
import { Zap, Gift } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AttemptsDisplayProps {
  attempts: Attempts | null;
  compact?: boolean;
}

export const AttemptsDisplay: React.FC<AttemptsDisplayProps> = ({ attempts, compact = false }) => {
  if (!attempts) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-card rounded-xl border border-border">
        <div className="w-16 h-4 bg-secondary rounded animate-pulse" />
      </div>
    );
  }

  const { remaining, cap, earnedFromReferrals } = attempts;
  const hasPlays = remaining > 0;

  if (compact) {
    return (
      <div className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-full',
        hasPlays ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'
      )}>
        <Zap className="w-4 h-4" />
        <span className="text-sm font-bold">{remaining} plays</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 px-4 py-3 bg-card rounded-xl border border-border shadow-soft">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className={cn(
            'w-5 h-5',
            hasPlays ? 'text-primary' : 'text-muted-foreground'
          )} />
          <span className="text-sm font-medium text-muted-foreground">Plays Today</span>
        </div>
        <span className={cn(
          'text-lg font-bold',
          hasPlays ? 'text-foreground' : 'text-muted-foreground'
        )}>
          {remaining} / {cap}
        </span>
      </div>
      
      {earnedFromReferrals > 0 && (
        <div className="flex items-center gap-1 text-xs text-success">
          <Gift className="w-3 h-3" />
          <span>+{earnedFromReferrals} from referrals</span>
        </div>
      )}

      {/* Visual dots for attempts - capped at 10 for display */}
      <div className="flex gap-1 flex-wrap">
        {Array.from({ length: Math.min(cap, 10) }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'w-2.5 h-2.5 rounded-full transition-colors',
              i < remaining ? 'bg-primary' : 'bg-secondary'
            )}
          />
        ))}
      </div>
    </div>
  );
};
