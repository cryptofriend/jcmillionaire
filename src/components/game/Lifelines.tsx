import React from 'react';
import { Button } from '@/components/ui/button';
import { LIFELINES, LifelineType } from '@/lib/constants';
import { Scissors, Lightbulb, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LifelinesProps {
  usedLifelines: Set<string>;
  onUseLifeline: (lifeline: LifelineType) => void;
  disabled?: boolean;
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

export const Lifelines: React.FC<LifelinesProps> = ({
  usedLifelines,
  onUseLifeline,
  disabled = false,
}) => {
  return (
    <div className="flex justify-center gap-3">
      {Object.entries(lifelineConfig).map(([key, config]) => {
        const isUsed = usedLifelines.has(key);
        const Icon = config.icon;
        
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
    </div>
  );
};
