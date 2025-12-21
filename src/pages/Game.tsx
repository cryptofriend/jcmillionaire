import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { QuestionCard } from '@/components/game/QuestionCard';
import { Lifelines } from '@/components/game/Lifelines';
import { Timer } from '@/components/game/Timer';
import { PrizeLadder } from '@/components/game/PrizeLadder';
import { useGame } from '@/contexts/GameContext';
import { LIFELINES, LifelineType, QUESTION_TIME_LIMIT_SECONDS, formatJC } from '@/lib/constants';
import { QuestionWithHiddenChoices, AnswerStats } from '@/lib/types';
import { ArrowLeft, X, AlertTriangle, Trophy } from 'lucide-react';
import { CoinIcon } from '@/components/icons/JackieIcon';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

// Mock questions for demo
const mockQuestions: QuestionWithHiddenChoices[] = [
  {
    id: '1',
    question: 'What is the primary purpose of World ID?',
    choices: { A: 'Social media login', B: 'Proof of personhood', C: 'Payment processing', D: 'Cloud storage' },
    difficulty: 1,
    category: 'World',
  },
  {
    id: '2', 
    question: 'Which blockchain does World App primarily operate on?',
    choices: { A: 'Ethereum', B: 'Solana', C: 'World Chain', D: 'Bitcoin' },
    difficulty: 1,
    category: 'Crypto',
  },
  {
    id: '3',
    question: 'What does the Orb device scan to verify users?',
    choices: { A: 'Fingerprint', B: 'Voice', C: 'Iris', D: 'Face' },
    difficulty: 2,
    category: 'World',
  },
];

const mockHints: Record<string, string> = {
  '1': 'Think about what makes you unique as a human online...',
  '2': 'It\'s in the name of the app!',
  '3': 'It\'s something very unique to each person and visible in your eyes.',
};

const mockStats: Record<string, AnswerStats> = {
  '1': { choiceACount: 120, choiceBCount: 780, choiceCCount: 60, choiceDCount: 40, total: 1000, percentages: { A: 12, B: 78, C: 6, D: 4 } },
  '2': { choiceACount: 200, choiceBCount: 150, choiceCCount: 600, choiceDCount: 50, total: 1000, percentages: { A: 20, B: 15, C: 60, D: 5 } },
  '3': { choiceACount: 100, choiceBCount: 50, choiceCCount: 800, choiceDCount: 50, total: 1000, percentages: { A: 10, B: 5, C: 80, D: 5 } },
};

const correctAnswers: Record<string, 'A' | 'B' | 'C' | 'D'> = {
  '1': 'B',
  '2': 'C', 
  '3': 'C',
};

const Game: React.FC = () => {
  const navigate = useNavigate();
  const { state, dispatch } = useGame();
  const { prizeLadder, isVerified } = state;

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionWithHiddenChoices>(mockQuestions[0]);
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | 'C' | 'D' | undefined>();
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(QUESTION_TIME_LIMIT_SECONDS);
  const [usedLifelines, setUsedLifelines] = useState<Set<string>>(new Set());
  const [showHint, setShowHint] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showQuitDialog, setShowQuitDialog] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [earnedAmount, setEarnedAmount] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Redirect if not verified
  useEffect(() => {
    if (!isVerified) {
      navigate('/verify');
    }
  }, [isVerified, navigate]);

  // Timer
  useEffect(() => {
    if (showResult || isGameOver || isPaused) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Time's up - wrong answer
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [showResult, isGameOver, isPaused, currentQuestionIndex]);

  const handleTimeUp = useCallback(() => {
    setShowResult(true);
    setIsCorrect(false);
    setIsGameOver(true);
    
    // Find safe haven amount
    const safeHavens = prizeLadder.filter(p => p.isSafeHaven && p.questionNumber < currentQuestionIndex + 1);
    const safeHavenAmount = safeHavens.length > 0 ? safeHavens[safeHavens.length - 1].prizeAmount : 0;
    setEarnedAmount(safeHavenAmount);
  }, [currentQuestionIndex, prizeLadder]);

  const handleAnswer = (choice: 'A' | 'B' | 'C' | 'D') => {
    if (showResult || selectedChoice) return;
    
    setSelectedChoice(choice);
    
    // Simulate server delay then show result
    setTimeout(() => {
      const correct = correctAnswers[currentQuestion.id] === choice;
      setIsCorrect(correct);
      setShowResult(true);
      
      if (!correct) {
        setIsGameOver(true);
        const safeHavens = prizeLadder.filter(p => p.isSafeHaven && p.questionNumber < currentQuestionIndex + 1);
        const safeHavenAmount = safeHavens.length > 0 ? safeHavens[safeHavens.length - 1].prizeAmount : 0;
        setEarnedAmount(safeHavenAmount);
      } else if (currentQuestionIndex >= mockQuestions.length - 1) {
        // Won all questions!
        setIsGameOver(true);
        setEarnedAmount(prizeLadder[currentQuestionIndex]?.prizeAmount || 0);
      }
    }, 1500);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < mockQuestions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      setCurrentQuestion(mockQuestions[nextIndex]);
      setSelectedChoice(undefined);
      setShowResult(false);
      setTimeRemaining(QUESTION_TIME_LIMIT_SECONDS);
      setShowHint(false);
      setShowStats(false);
    }
  };

  const handleUseLifeline = (lifeline: LifelineType) => {
    if (usedLifelines.has(lifeline) || showResult) return;
    
    setUsedLifelines(new Set([...usedLifelines, lifeline]));
    
    switch (lifeline) {
      case LIFELINES.FIFTY_FIFTY:
        // Remove two wrong answers
        const correct = correctAnswers[currentQuestion.id];
        const wrongChoices = (['A', 'B', 'C', 'D'] as const).filter(c => c !== correct);
        const toHide = wrongChoices.slice(0, 2);
        setCurrentQuestion({
          ...currentQuestion,
          hiddenChoices: toHide,
        });
        break;
        
      case LIFELINES.HINT:
        setShowHint(true);
        break;
        
      case LIFELINES.CHAIN_SCAN:
        setShowStats(true);
        break;
    }
  };

  const handleQuit = () => {
    // Take current safe haven amount
    const safeHavens = prizeLadder.filter(p => p.isSafeHaven && p.questionNumber <= currentQuestionIndex);
    const safeHavenAmount = safeHavens.length > 0 ? safeHavens[safeHavens.length - 1].prizeAmount : 0;
    setEarnedAmount(safeHavenAmount);
    setIsGameOver(true);
    setShowQuitDialog(false);
  };

  const handleViewResult = () => {
    navigate('/result', { 
      state: { 
        earnedAmount, 
        reachedQuestion: currentQuestionIndex + 1,
        isWinner: isCorrect && currentQuestionIndex >= mockQuestions.length - 1
      } 
    });
  };

  if (isGameOver) {
    return (
      <div className="min-h-screen gradient-hero flex flex-col items-center justify-center px-4 gap-6">
        <div className={cn(
          'w-24 h-24 rounded-full flex items-center justify-center shadow-glow animate-bounce-in',
          isCorrect && currentQuestionIndex >= mockQuestions.length - 1
            ? 'gradient-gold'
            : earnedAmount > 0
            ? 'gradient-success'
            : 'bg-secondary'
        )}>
          <Trophy className={cn(
            'w-12 h-12',
            isCorrect ? 'text-primary-foreground' : 'text-muted-foreground'
          )} />
        </div>

        <div className="text-center space-y-2">
          <h2 className="text-2xl font-display font-bold">
            {isCorrect && currentQuestionIndex >= mockQuestions.length - 1 
              ? '🎉 JACKPOT!' 
              : earnedAmount > 0 
              ? 'Good Run!' 
              : 'Game Over'}
          </h2>
          <p className="text-muted-foreground">
            You reached question {currentQuestionIndex + 1} of 15
          </p>
        </div>

        <div className="flex items-center gap-2 px-6 py-4 bg-card rounded-2xl border border-border shadow-card">
          <CoinIcon size={32} />
          <span className="text-3xl font-display font-bold text-gradient-gold">
            {formatJC(earnedAmount)} JC
          </span>
        </div>

        <Button variant="gold" size="lg" onClick={handleViewResult}>
          {earnedAmount > 0 ? 'Claim Reward' : 'View Results'}
        </Button>

        <Button variant="ghost" onClick={() => navigate('/')}>
          Back to Home
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-hero flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/50 backdrop-blur">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowQuitDialog(true)}
        >
          <X className="w-5 h-5" />
        </Button>

        <Timer seconds={timeRemaining} />

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="text-xs">
              <div className="flex items-center gap-1">
                <CoinIcon size={16} />
                <span className="font-bold">
                  {formatJC(prizeLadder[currentQuestionIndex]?.prizeAmount || 0)}
                </span>
              </div>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80">
            <SheetHeader>
              <SheetTitle>Prize Ladder</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <PrizeLadder
                ladder={prizeLadder}
                currentQuestion={currentQuestionIndex + 1}
                reachedQuestion={currentQuestionIndex}
              />
            </div>
          </SheetContent>
        </Sheet>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col px-4 py-6 gap-6 overflow-y-auto hide-scrollbar">
        {/* Lifelines */}
        <Lifelines
          usedLifelines={usedLifelines}
          onUseLifeline={handleUseLifeline}
          disabled={showResult}
        />

        {/* Question Card */}
        <QuestionCard
          question={currentQuestion}
          questionNumber={currentQuestionIndex + 1}
          onAnswer={handleAnswer}
          disabled={showResult}
          selectedChoice={selectedChoice}
          correctChoice={showResult ? correctAnswers[currentQuestion.id] : undefined}
          showResult={showResult}
          hint={mockHints[currentQuestion.id]}
          showHint={showHint}
          answerStats={mockStats[currentQuestion.id]}
          showStats={showStats}
        />

        {/* Next Question Button */}
        {showResult && isCorrect && !isGameOver && (
          <Button
            variant="success"
            size="lg"
            className="w-full animate-bounce-in"
            onClick={handleNextQuestion}
          >
            Next Question →
          </Button>
        )}
      </main>

      {/* Quit Dialog */}
      <AlertDialog open={showQuitDialog} onOpenChange={setShowQuitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-accent" />
              Quit Game?
            </AlertDialogTitle>
            <AlertDialogDescription>
              If you quit now, you'll keep your safe haven amount:
              <span className="block text-lg font-bold text-foreground mt-2">
                {formatJC(prizeLadder.filter(p => p.isSafeHaven && p.questionNumber <= currentQuestionIndex)[0]?.prizeAmount || 0)} JC
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Playing</AlertDialogCancel>
            <AlertDialogAction onClick={handleQuit}>Quit & Take Winnings</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Game;
