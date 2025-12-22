import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DayState } from '@/lib/types';
import { CoinIcon } from '@/components/icons/JackieIcon';
import { TrendingUp, Clock } from 'lucide-react';

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
}

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
  const [particles, setParticles] = useState<Particle[]>([]);
  const previousRemaining = useRef(dayState?.poolRemaining ?? 0);
  const particleIdRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const animatedRemaining = useAnimatedCounter(dayState?.poolRemaining ?? 0);

  // Spawn particles when value decreases
  const spawnParticles = useCallback((count: number) => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      newParticles.push({
        id: particleIdRef.current++,
        x: 50 + Math.random() * 40, // spawn near the value display
        y: 50,
        vx: (Math.random() - 0.5) * 3,
        vy: -2 - Math.random() * 2,
        life: 1,
        size: 3 + Math.random() * 3,
      });
    }
    setParticles(prev => [...prev, ...newParticles]);
  }, []);

  // Animate particles
  useEffect(() => {
    if (particles.length === 0) return;

    const interval = setInterval(() => {
      setParticles(prev => 
        prev
          .map(p => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.1, // gravity
            life: p.life - 0.03,
          }))
          .filter(p => p.life > 0)
      );
    }, 16);

    return () => clearInterval(interval);
  }, [particles.length]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(getTimeUntilMidnightUTC());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Flash effect and spawn particles when value decreases
  useEffect(() => {
    if (dayState && previousRemaining.current !== dayState.poolRemaining) {
      const decreased = dayState.poolRemaining < previousRemaining.current;
      setHasChanged(true);
      
      if (decreased) {
        const diff = previousRemaining.current - dayState.poolRemaining;
        const particleCount = Math.min(Math.max(Math.floor(diff / 50), 3), 12);
        spawnParticles(particleCount);
      }
      
      previousRemaining.current = dayState.poolRemaining;
      const timeout = setTimeout(() => setHasChanged(false), 600);
      return () => clearTimeout(timeout);
    }
  }, [dayState?.poolRemaining, spawnParticles]);

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
    <div ref={containerRef} className="relative flex flex-col gap-2 px-4 py-3 bg-card rounded-xl border border-border shadow-soft overflow-hidden">
      {/* Particles */}
      {particles.map(particle => (
        <div
          key={particle.id}
          className="absolute rounded-full bg-primary pointer-events-none"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
            opacity: particle.life,
            transform: 'translate(-50%, -50%)',
            boxShadow: `0 0 ${particle.size * 2}px hsl(var(--primary) / ${particle.life * 0.5})`,
          }}
        />
      ))}
      
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
