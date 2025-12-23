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
      className="flex flex-col gap-1 w-full max-w-xs mx-auto max-h-[60vh] overflow-y-auto hide-scrollbar"
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
              'flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-300',
              isCurrent && 'gradient-gold shadow-glow animate-pulse-soft scale-105',
              isReached && !isCurrent && 'bg-success/20 border border-success/40',
              isFailed && 'bg-destructive/20 border border-destructive/40',
              !isCurrent && !isReached && !isFailed && 'bg-card/50 border border-border/50',
              item.isSafeHaven && !isCurrent && !isReached && 'border-safe-haven/60 bg-safe-haven/10'
            )}
          >
            <div className="flex items-center gap-2">
              <span className={cn(
                'text-xs font-bold w-6 text-center',
                isCurrent && 'text-primary-foreground',
                isReached && !isCurrent && 'text-success',
                !isCurrent && !isReached && 'text-muted-foreground'
              )}>
                Q{item.questionNumber}
              </span>
              
              {item.isSafeHaven && (
                <Shield className={cn(
                  'w-4 h-4',
                  isCurrent && 'text-primary-foreground',
                  isReached && 'text-success',
                  !isCurrent && !isReached && 'text-safe-haven'
                )} />
              )}
            </div>
            
            <div className="flex items-center gap-1">
              <CoinIcon size={14} />
              <span className={cn(
                'text-sm font-bold',
                isCurrent && 'text-primary-foreground',
                isReached && !isCurrent && 'text-success',
                !isCurrent && !isReached && 'text-foreground'
              )}>
                {formatJC(item.prizeAmount)}
              </span>
              
              {isReached && !isCurrent && (
                <Check className="w-4 h-4 text-success ml-1" />
              )}
              {isFailed && (
                <X className="w-4 h-4 text-destructive ml-1" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
