import React, { useState, useEffect, useRef } from 'react';
import { DayState } from '@/lib/types';
import { CoinIcon } from '@/components/icons/JackieIcon';
import { TrendingUp, Clock } from 'lucide-react';

interface PoolStatsProps {
  dayState: DayState | null;
}

function getTimeUntilMidnightUTC(): { hours: number; minutes: number; seconds: number } {
  const now = new Date();
  const midnightUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
  const diff = midnightUTC.getTime() - now.getTime();
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  return { hours, minutes, seconds };
}

// Animated counter hook
function useAnimatedCounter(targetValue: number, duration: number = 800) {
  const [displayValue, setDisplayValue] = useState(targetValue);
  const previousValue = useRef(targetValue);
  const animationRef = useRef<number>();

  useEffect(() => {
    if (previousValue.current === targetValue) return;

    const startValue = previousValue.current;
    const difference = targetValue - startValue;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      
      const currentValue = Math.round(startValue + difference * easeOutQuart);
      setDisplayValue(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        previousValue.current = targetValue;
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [targetValue, duration]);

  return displayValue;
}

export const PoolStats: React.FC<PoolStatsProps> = ({ dayState }) => {
  const [countdown, setCountdown] = useState(getTimeUntilMidnightUTC());
  const [hasChanged, setHasChanged] = useState(false);
  const previousRemaining = useRef(dayState?.poolRemaining ?? 0);
  
  const animatedRemaining = useAnimatedCounter(dayState?.poolRemaining ?? 0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(getTimeUntilMidnightUTC());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Flash effect when value changes
  useEffect(() => {
    if (dayState && previousRemaining.current !== dayState.poolRemaining) {
      setHasChanged(true);
      previousRemaining.current = dayState.poolRemaining;
      const timeout = setTimeout(() => setHasChanged(false), 600);
      return () => clearTimeout(timeout);
    }
  }, [dayState?.poolRemaining]);

  if (!dayState) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-card rounded-xl border border-border">
        <div className="w-20 h-4 bg-secondary rounded animate-pulse" />
      </div>
    );
  }

  const isPoolEmpty = dayState.poolRemaining <= 0;
  const percentage = (dayState.poolRemaining / dayState.poolTotal) * 100;

  // Pool is empty - show countdown timer
  if (isPoolEmpty) {
    return (
      <div className="flex flex-col gap-3 px-4 py-4 bg-card rounded-xl border border-border shadow-soft">
        <div className="flex items-center justify-center gap-2">
          <Clock className="w-5 h-5 text-primary animate-pulse" />
          <span className="text-sm font-semibold text-foreground">Pool Depleted!</span>
        </div>
        
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-2">Next pool opens in:</p>
          <div className="flex items-center justify-center gap-2">
            <div className="flex flex-col items-center px-3 py-2 bg-secondary rounded-lg min-w-[50px]">
              <span className="text-xl font-bold text-primary">
                {String(countdown.hours).padStart(2, '0')}
              </span>
              <span className="text-[10px] text-muted-foreground uppercase">hrs</span>
            </div>
            <span className="text-xl font-bold text-muted-foreground">:</span>
            <div className="flex flex-col items-center px-3 py-2 bg-secondary rounded-lg min-w-[50px]">
              <span className="text-xl font-bold text-primary">
                {String(countdown.minutes).padStart(2, '0')}
              </span>
              <span className="text-[10px] text-muted-foreground uppercase">min</span>
            </div>
            <span className="text-xl font-bold text-muted-foreground">:</span>
            <div className="flex flex-col items-center px-3 py-2 bg-secondary rounded-lg min-w-[50px]">
              <span className="text-xl font-bold text-primary">
                {String(countdown.seconds).padStart(2, '0')}
              </span>
              <span className="text-[10px] text-muted-foreground uppercase">sec</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Come back to fight for the next million <CoinIcon size={12} className="inline" />
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 px-4 py-3 bg-card rounded-xl border border-border shadow-soft">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <span className="text-xs font-medium text-muted-foreground">Daily Pool</span>
        </div>
        <div className="flex items-center gap-1">
          <CoinIcon size={16} />
          <span 
            className={`text-sm font-bold transition-all duration-300 ${
              hasChanged ? 'text-primary scale-110' : 'text-foreground scale-100'
            }`}
          >
            {animatedRemaining.toLocaleString()}
          </span>
          <span className="text-xs text-muted-foreground">
            / {dayState.poolTotal.toLocaleString()}
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
