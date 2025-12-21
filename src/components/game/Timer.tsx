import React from 'react';
import { cn } from '@/lib/utils';
import { Clock } from 'lucide-react';

interface TimerProps {
  seconds: number;
  maxSeconds?: number;
}

export const Timer: React.FC<TimerProps> = ({ seconds, maxSeconds = 30 }) => {
  const percentage = (seconds / maxSeconds) * 100;
  const isLow = seconds <= 10;
  const isCritical = seconds <= 5;

  return (
    <div className="flex items-center gap-2">
      <Clock className={cn(
        'w-5 h-5 transition-colors',
        isCritical && 'text-destructive animate-wiggle',
        isLow && !isCritical && 'text-accent',
        !isLow && 'text-muted-foreground'
      )} />
      
      <div className="relative w-24 h-3 bg-secondary rounded-full overflow-hidden">
        <div
          className={cn(
            'absolute inset-y-0 left-0 rounded-full transition-all duration-1000',
            isCritical && 'bg-destructive',
            isLow && !isCritical && 'bg-accent',
            !isLow && 'bg-primary'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      <span className={cn(
        'text-sm font-bold min-w-[2ch] text-right',
        isCritical && 'text-destructive animate-pulse-soft',
        isLow && !isCritical && 'text-accent',
        !isLow && 'text-foreground'
      )}>
        {seconds}
      </span>
    </div>
  );
};
