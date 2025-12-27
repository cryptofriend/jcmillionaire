import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { QuestionWithHiddenChoices, AnswerStats } from '@/lib/types';
import { cn } from '@/lib/utils';

interface QuestionCardProps {
  question: QuestionWithHiddenChoices;
  questionNumber: number;
  onAnswer: (choice: 'A' | 'B' | 'C' | 'D') => void;
  disabled?: boolean;
  selectedChoice?: 'A' | 'B' | 'C' | 'D';
  correctChoice?: 'A' | 'B' | 'C' | 'D';
  showResult?: boolean;
  hint?: string;
  showHint?: boolean;
  answerStats?: AnswerStats;
  showStats?: boolean;
}

const choiceLabels = ['A', 'B', 'C', 'D'] as const;

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  questionNumber,
  onAnswer,
  disabled = false,
  selectedChoice,
  correctChoice,
  showResult = false,
  hint,
  showHint = false,
  answerStats,
  showStats = false,
}) => {
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    setAnimateIn(false);
    const timer = setTimeout(() => setAnimateIn(true), 50);
    return () => clearTimeout(timer);
  }, [question.id]);

  const getChoiceVariant = (choice: 'A' | 'B' | 'C' | 'D') => {
    if (!showResult) {
      if (selectedChoice === choice) return 'answer-selected';
      return 'answer';
    }
    if (choice === correctChoice) return 'answer-correct';
    if (choice === selectedChoice && choice !== correctChoice) return 'answer-wrong';
    return 'answer';
  };

  const isChoiceHidden = (choice: 'A' | 'B' | 'C' | 'D') => {
    return question.hiddenChoices?.includes(choice);
  };

  return (
    <div className={cn(
      'flex flex-col gap-4 w-full transition-all duration-500',
      animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
    )}>
      {/* Question Number Badge */}
      <div className="flex justify-center">
        <span className="px-4 py-1 rounded-full bg-primary/10 text-primary text-sm font-bold">
          Question {questionNumber} of 15
        </span>
      </div>

      {/* Question Text */}
      <div className="bg-card rounded-2xl p-5 shadow-card border border-border">
        <p className="text-lg font-semibold text-center leading-relaxed">
          {question.question}
        </p>
      </div>

      {/* Hint */}
      {showHint && hint && (
        <div className="bg-gold-light/20 rounded-xl p-4 border border-gold-light/40 animate-bounce-in">
          <p className="text-sm text-center">
            <span className="font-bold text-primary">💡 Jackie says: </span>
            {hint}
          </p>
        </div>
      )}

      {/* Answer Stats */}
      {showStats && answerStats && (
        <div className="bg-secondary/50 rounded-xl p-4 border border-border animate-bounce-in">
          <p className="text-xs text-center text-muted-foreground mb-2 font-medium">
            🔗 Chain Scan Results ({answerStats.total} players)
          </p>
          <div className="flex justify-around">
            {choiceLabels.map((label) => {
              const percentage = answerStats.percentages[label];
              return (
                <div key={label} className="flex flex-col items-center">
                  <div className="h-16 w-8 bg-border rounded-full overflow-hidden flex flex-col-reverse">
                    <div 
                      className="w-full bg-primary transition-all duration-500"
                      style={{ height: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold mt-1">{label}</span>
                  <span className="text-xs text-muted-foreground">{percentage}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Answer Choices */}
      <div className="grid grid-cols-1 gap-3">
        {choiceLabels.map((label, index) => {
          const choiceText = question.choices[label];
          const isHidden = isChoiceHidden(label);
          
          return (
            <Button
              key={label}
              variant={getChoiceVariant(label)}
              size="answer"
              onClick={() => onAnswer(label)}
              disabled={disabled || isHidden}
              className={cn(
                'animate-slide-up',
                `stagger-${index + 1}`,
                isHidden && 'opacity-30 line-through',
                showResult && correctChoice === label && 'animate-blink-success'
              )}
            >
              <span className="flex items-center gap-3 w-full">
                <span className={cn(
                  'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm',
                  selectedChoice === label && !showResult && 'bg-primary text-primary-foreground',
                  showResult && correctChoice === label && 'bg-success text-success-foreground',
                  showResult && selectedChoice === label && label !== correctChoice && 'bg-destructive text-destructive-foreground',
                  !selectedChoice && !showResult && 'bg-secondary text-secondary-foreground'
                )}>
                  {label}
                </span>
                <span className="flex-1 text-left">{choiceText}</span>
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
};
