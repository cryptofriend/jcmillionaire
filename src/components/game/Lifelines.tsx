import React from 'react';
import { Button } from '@/components/ui/button';
import { LIFELINES, LifelineType } from '@/lib/constants';
import { Scissors, Lightbulb, Users, Lock, Gift, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface LifelinesProps {
  usedLifelines: Set<string>;
  onUseLifeline: (lifeline: LifelineType) => void;
  disabled?: boolean;
  availableLifelines?: number; // 1 by default, can earn more via invites
}

const lifelineConfig = {
  [LIFELINES.FIFTY_FIFTY]: {
    icon: Scissors,
    label: '50:50',
    description: 'Remove 2 wrong',
  },
  [LIFELINES.HINT]: {
    icon: Lightbulb,
    label: 'Hint',
    description: "Jackie's tip",
  },
  [LIFELINES.CHAIN_SCAN]: {
    icon: Users,
    label: 'Scan',
    description: 'Crowd stats',
  },
};

const lifelineOrder = [LIFELINES.FIFTY_FIFTY, LIFELINES.HINT, LIFELINES.CHAIN_SCAN];

export const Lifelines: React.FC<LifelinesProps> = ({
  usedLifelines,
  onUseLifeline,
  disabled = false,
  availableLifelines = 1,
}) => {
  const usedCount = usedLifelines.size;
  const remainingAvailable = availableLifelines - usedCount;

  return (
    <div className="space-y-2">
      {/* Lifeline buttons */}
      <div className="flex justify-center gap-3">
        <TooltipProvider>
          {lifelineOrder.map((key, index) => {
            const config = lifelineConfig[key];
            const isUsed = usedLifelines.has(key);
            const isLocked = index >= availableLifelines;
            const Icon = config.icon;
            
            if (isLocked) {
              return (
                <Tooltip key={key}>
                  <TooltipTrigger asChild>
                    <div className="relative">
                      <Button
                        variant="lifeline-used"
                        size="lifeline"
                        disabled
                        className="opacity-40 cursor-not-allowed"
                      >
                        <Lock className="w-5 h-5" />
                        <span className="font-bold text-xs">{config.label}</span>
                      </Button>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-48 text-center">
                    <p className="font-semibold mb-1">Unlock More Lifelines!</p>
                    <p className="text-xs text-muted-foreground">
                      Invite friends or come back tomorrow
                    </p>
                  </TooltipContent>
                </Tooltip>
              );
            }
            
            return (
              <Button
                key={key}
                variant={isUsed ? 'lifeline-used' : 'lifeline'}
                size="lifeline"
                onClick={() => onUseLifeline(key as LifelineType)}
                disabled={disabled || isUsed}
                className={cn(
                  'relative transition-all duration-300',
                  !isUsed && !disabled && 'hover:scale-110'
                )}
              >
                <Icon className={cn(
                  'w-6 h-6',
                  isUsed && 'opacity-40'
                )} />
                <span className="font-bold">{config.label}</span>
                {isUsed && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-full h-0.5 bg-muted-foreground rotate-45" />
                  </div>
                )}
              </Button>
            );
          })}
        </TooltipProvider>
      </div>

      {/* Unlock message */}
      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5 px-2 py-1 bg-card/50 rounded-full border border-border/50">
          <Gift className="w-3.5 h-3.5 text-primary" />
          <span>Invite friends = more lifelines</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 bg-card/50 rounded-full border border-border/50">
          <Calendar className="w-3.5 h-3.5 text-primary" />
          <span>+1 lifeline daily</span>
        </div>
      </div>
    </div>
  );
};
