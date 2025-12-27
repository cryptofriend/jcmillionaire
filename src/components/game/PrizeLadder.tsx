import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { formatJC } from '@/lib/constants';
import { PrizeLadderItem } from '@/lib/types';
import { CoinIcon } from '@/components/icons/JackieIcon';
import { Shield, Check, X } from 'lucide-react';

interface PrizeLadderProps {
  ladder: PrizeLadderItem[];
  currentQuestion: number;
  reachedQuestion: number;
  isGameOver?: boolean;
  lastCorrect?: boolean;
  autoScroll?: boolean;
}

export const PrizeLadder: React.FC<PrizeLadderProps> = ({
  ladder,
  currentQuestion,
  reachedQuestion,
  isGameOver = false,
  lastCorrect = true,
  autoScroll = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const currentItemRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to current question
  useEffect(() => {
    if (autoScroll && currentItemRef.current && containerRef.current) {
      const container = containerRef.current;
      const item = currentItemRef.current;
      
      // Calculate scroll position to center the current item
      const containerHeight = container.clientHeight;
      const itemTop = item.offsetTop;
      const itemHeight = item.clientHeight;
      const scrollTarget = itemTop - (containerHeight / 2) + (itemHeight / 2);
      
      container.scrollTo({
        top: scrollTarget,
        behavior: 'smooth',
      });
    }
  }, [currentQuestion, autoScroll]);

  // Show ladder in reverse (highest first)
  const reversedLadder = [...ladder].reverse();
  
  return (
    <div 
      ref={containerRef}
      className="flex flex-col gap-0.5 w-full max-w-xs mx-auto"
    >
      {reversedLadder.map((item) => {
        const isCurrent = item.questionNumber === currentQuestion && !isGameOver;
        const isReached = item.questionNumber <= reachedQuestion;
        const isFailed = isGameOver && !lastCorrect && item.questionNumber === currentQuestion;
        
        return (
          <div
            key={item.questionNumber}
            ref={isCurrent ? currentItemRef : null}
            className={cn(
              'flex items-center justify-between px-2 py-1 rounded-md transition-all duration-300',
              isCurrent && 'gradient-gold shadow-glow animate-pulse-soft scale-[1.02]',
              isReached && !isCurrent && 'bg-success/20 border border-success/40',
              isFailed && 'bg-destructive/20 border border-destructive/40',
              !isCurrent && !isReached && !isFailed && 'bg-card/50 border border-border/50',
              item.isSafeHaven && !isCurrent && !isReached && 'border-safe-haven/60 bg-safe-haven/10'
            )}
          >
            <div className="flex items-center gap-1.5">
              <span className={cn(
                'text-[10px] font-bold w-5 text-center',
                isCurrent && 'text-primary-foreground',
                isReached && !isCurrent && 'text-success',
                !isCurrent && !isReached && 'text-muted-foreground'
              )}>
                {item.questionNumber}
              </span>
              
              <div className={cn(
                'w-2 h-2 rounded-full',
                isCurrent && 'bg-primary-foreground',
                isReached && !isCurrent && 'bg-success',
                !isCurrent && !isReached && 'bg-muted-foreground/40'
              )} />
            </div>
            
            <div className="flex items-center gap-1">
              <span className={cn(
                'text-xs font-bold',
                isCurrent && 'text-primary-foreground',
                isReached && !isCurrent && 'text-success',
                !isCurrent && !isReached && 'text-foreground'
              )}>
                {formatJC(item.prizeAmount)}
              </span>
              
              {item.isSafeHaven && (
                <span className={cn(
                  'text-[8px] font-bold px-1 py-0.5 rounded uppercase',
                  isCurrent && 'bg-primary-foreground/20 text-primary-foreground',
                  isReached && !isCurrent && 'bg-success/20 text-success',
                  !isCurrent && !isReached && 'bg-safe-haven/20 text-safe-haven'
                )}>
                  Safe
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
