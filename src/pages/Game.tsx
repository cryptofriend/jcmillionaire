import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { QuestionCard } from '@/components/game/QuestionCard';
import { Lifelines } from '@/components/game/Lifelines';
import { Timer } from '@/components/game/Timer';
import { PrizeLadder } from '@/components/game/PrizeLadder';
import { useGame } from '@/contexts/GameContext';
import { LIFELINES, LifelineType, QUESTION_TIME_LIMIT_SECONDS, formatJC } from '@/lib/constants';
import { QuestionWithHiddenChoices, AnswerStats, Run } from '@/lib/types';
import { X, AlertTriangle, Trophy, Rocket, HandCoins, Loader2 } from 'lucide-react';
import { JackieIcon, CoinIcon } from '@/components/icons/JackieIcon';
import { cn } from '@/lib/utils';
import {
  createRun,
  recordAnswer,
  updateLifelinesUsed,
  completeRun,
  getTodayDayId,
} from '@/lib/gameService';
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

// Safe haven checkpoints (guaranteed amounts if you lose later)
const SAFE_HAVEN_QUESTIONS = [5, 10, 15];

// Mock questions for demo (expanded to 15)
const mockQuestions: QuestionWithHiddenChoices[] = [
  { id: '1', question: 'What is the primary purpose of World ID?', choices: { A: 'Social media login', B: 'Proof of personhood', C: 'Payment processing', D: 'Cloud storage' }, difficulty: 1, category: 'World' },
  { id: '2', question: 'Which blockchain does World App primarily operate on?', choices: { A: 'Ethereum', B: 'Solana', C: 'World Chain', D: 'Bitcoin' }, difficulty: 1, category: 'Crypto' },
  { id: '3', question: 'What does the Orb device scan to verify users?', choices: { A: 'Fingerprint', B: 'Voice', C: 'Iris', D: 'Face' }, difficulty: 1, category: 'World' },
  { id: '4', question: 'Who founded Worldcoin?', choices: { A: 'Vitalik Buterin', B: 'Sam Altman', C: 'Elon Musk', D: 'Satoshi Nakamoto' }, difficulty: 1, category: 'World' },
  { id: '5', question: 'What does WLD stand for?', choices: { A: 'World Digital', B: 'Worldcoin', C: 'World Ledger', D: 'World Dollar' }, difficulty: 2, category: 'Crypto' },
  { id: '6', question: 'Which proof system does World ID use?', choices: { A: 'Proof of Work', B: 'Proof of Stake', C: 'Zero-Knowledge Proofs', D: 'Proof of Authority' }, difficulty: 2, category: 'Crypto' },
  { id: '7', question: 'What is the main benefit of World ID verification?', choices: { A: 'Free tokens', B: 'Sybil resistance', C: 'Faster transactions', D: 'Lower fees' }, difficulty: 2, category: 'World' },
  { id: '8', question: 'What year was Worldcoin launched?', choices: { A: '2021', B: '2022', C: '2023', D: '2024' }, difficulty: 2, category: 'World' },
  { id: '9', question: 'Which company created ChatGPT?', choices: { A: 'Google', B: 'Meta', C: 'OpenAI', D: 'Microsoft' }, difficulty: 2, category: 'Tech' },
  { id: '10', question: 'What is a nullifier in World ID?', choices: { A: 'A cancel button', B: 'A unique anonymous identifier', C: 'A hacking tool', D: 'A wallet address' }, difficulty: 3, category: 'World' },
  { id: '11', question: 'What consensus mechanism does World Chain use?', choices: { A: 'Proof of Work', B: 'Proof of Stake', C: 'Delegated PoS', D: 'Proof of Identity' }, difficulty: 3, category: 'Crypto' },
  { id: '12', question: 'What is the total supply of WLD tokens?', choices: { A: '21 million', B: '100 million', C: '1 billion', D: '10 billion' }, difficulty: 3, category: 'Crypto' },
  { id: '13', question: 'Which layer is World Chain?', choices: { A: 'Layer 1', B: 'Layer 2', C: 'Layer 3', D: 'Sidechain' }, difficulty: 4, category: 'Crypto' },
  { id: '14', question: 'What technology does the Orb use for iris scanning?', choices: { A: 'X-ray', B: 'Infrared', C: 'Ultrasound', D: 'Laser' }, difficulty: 4, category: 'World' },
  { id: '15', question: 'What is the name of World ID\'s developer SDK?', choices: { A: 'WorldKit', B: 'IDKit', C: 'OrbSDK', D: 'ProofKit' }, difficulty: 5, category: 'World' },
];

const mockHints: Record<string, string> = {
  '1': 'Think about what makes you unique as a human online...',
  '2': 'It\'s in the name of the app!',
  '3': 'It\'s something very unique to each person and visible in your eyes.',
  '4': 'He\'s also known for leading a famous AI company...',
  '5': 'It\'s the abbreviation of the project name.',
  '6': 'These proofs let you verify something without revealing the data.',
  '7': 'It prevents one person from creating multiple fake accounts.',
  '8': 'It launched during the summer with much fanfare.',
  '9': 'Sam Altman is the CEO of this company.',
  '10': 'It helps keep your identity private while proving uniqueness.',
  '11': 'Validators stake tokens to participate.',
  '12': 'It\'s a very large number, in the billions.',
  '13': 'It builds on top of Ethereum for scalability.',
  '14': 'This technology uses light beyond the visible spectrum.',
  '15': 'It sounds like "ID" + a common software toolkit name.',
};

const mockStats: Record<string, AnswerStats> = {
  '1': { choiceACount: 120, choiceBCount: 780, choiceCCount: 60, choiceDCount: 40, total: 1000, percentages: { A: 12, B: 78, C: 6, D: 4 } },
  '2': { choiceACount: 200, choiceBCount: 150, choiceCCount: 600, choiceDCount: 50, total: 1000, percentages: { A: 20, B: 15, C: 60, D: 5 } },
  '3': { choiceACount: 100, choiceBCount: 50, choiceCCount: 800, choiceDCount: 50, total: 1000, percentages: { A: 10, B: 5, C: 80, D: 5 } },
  '4': { choiceACount: 150, choiceBCount: 700, choiceCCount: 100, choiceDCount: 50, total: 1000, percentages: { A: 15, B: 70, C: 10, D: 5 } },
  '5': { choiceACount: 100, choiceBCount: 750, choiceCCount: 100, choiceDCount: 50, total: 1000, percentages: { A: 10, B: 75, C: 10, D: 5 } },
  '6': { choiceACount: 100, choiceBCount: 150, choiceCCount: 700, choiceDCount: 50, total: 1000, percentages: { A: 10, B: 15, C: 70, D: 5 } },
  '7': { choiceACount: 200, choiceBCount: 600, choiceCCount: 100, choiceDCount: 100, total: 1000, percentages: { A: 20, B: 60, C: 10, D: 10 } },
  '8': { choiceACount: 100, choiceBCount: 150, choiceCCount: 650, choiceDCount: 100, total: 1000, percentages: { A: 10, B: 15, C: 65, D: 10 } },
  '9': { choiceACount: 100, choiceBCount: 100, choiceCCount: 700, choiceDCount: 100, total: 1000, percentages: { A: 10, B: 10, C: 70, D: 10 } },
  '10': { choiceACount: 150, choiceBCount: 600, choiceCCount: 150, choiceDCount: 100, total: 1000, percentages: { A: 15, B: 60, C: 15, D: 10 } },
  '11': { choiceACount: 200, choiceBCount: 500, choiceCCount: 200, choiceDCount: 100, total: 1000, percentages: { A: 20, B: 50, C: 20, D: 10 } },
  '12': { choiceACount: 100, choiceBCount: 150, choiceCCount: 200, choiceDCount: 550, total: 1000, percentages: { A: 10, B: 15, C: 20, D: 55 } },
  '13': { choiceACount: 200, choiceBCount: 550, choiceCCount: 150, choiceDCount: 100, total: 1000, percentages: { A: 20, B: 55, C: 15, D: 10 } },
  '14': { choiceACount: 100, choiceBCount: 600, choiceCCount: 150, choiceDCount: 150, total: 1000, percentages: { A: 10, B: 60, C: 15, D: 15 } },
  '15': { choiceACount: 200, choiceBCount: 550, choiceCCount: 150, choiceDCount: 100, total: 1000, percentages: { A: 20, B: 55, C: 15, D: 10 } },
};

const correctAnswers: Record<string, 'A' | 'B' | 'C' | 'D'> = {
  '1': 'B', '2': 'C', '3': 'C', '4': 'B', '5': 'B',
  '6': 'C', '7': 'B', '8': 'C', '9': 'C', '10': 'B',
  '11': 'B', '12': 'D', '13': 'B', '14': 'B', '15': 'B',
};

// Helper to get today's date key
const getTodayKey = () => new Date().toISOString().split('T')[0];

// Calculate time until midnight (next game)
const getTimeUntilMidnight = () => {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime() - now.getTime();
};

const formatCountdown = (ms: number) => {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);
  return { hours, minutes, seconds };
};

const Game: React.FC = () => {
  const navigate = useNavigate();
  const { state } = useGame();
  const { prizeLadder, isVerified, user } = state;

  // Database run tracking
  const [currentRun, setCurrentRun] = useState<Run | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const questionStartTimeRef = useRef<number>(Date.now());

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
  const [showCheckpointDialog, setShowCheckpointDialog] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [earnedAmount, setEarnedAmount] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [claimedEarly, setClaimedEarly] = useState(false);
  const [hasPlayedToday, setHasPlayedToday] = useState(false);
  const [countdown, setCountdown] = useState(getTimeUntilMidnight());

  // Initialize game run in database
  useEffect(() => {
    const initRun = async () => {
      if (!user) {
        setIsInitializing(false);
        return;
      }

      try {
        const { run, error } = await createRun({
          userId: user.id,
          dayId: getTodayDayId(),
        });

        if (error) {
          console.error('Failed to create run:', error);
        } else if (run) {
          console.log('Created run:', run.id);
          setCurrentRun(run);
        }
      } catch (err) {
        console.error('Error initializing run:', err);
      } finally {
        setIsInitializing(false);
        questionStartTimeRef.current = Date.now();
      }
    };

    initRun();
  }, [user]);

  // Countdown timer for "come back tomorrow" screen
  useEffect(() => {
    if (!hasPlayedToday) return;
    
    const interval = setInterval(() => {
      setCountdown(getTimeUntilMidnight());
    }, 1000);

    return () => clearInterval(interval);
  }, [hasPlayedToday]);

  // Check if user already played today - DISABLED FOR TESTING
  // useEffect(() => {
  //   const lastPlayDate = localStorage.getItem('jc_last_play_date');
  //   const today = getTodayKey();
  //   if (lastPlayDate === today) {
  //     setHasPlayedToday(true);
  //   }
  // }, []);

  // Mark game as played when it ends
  useEffect(() => {
    if (isGameOver) {
      localStorage.setItem('jc_last_play_date', getTodayKey());
    }
  }, [isGameOver]);

  // Redirect if not verified
  useEffect(() => {
    if (!isVerified) {
      navigate('/verify');
    }
  }, [isVerified, navigate]);

  // Timer
  useEffect(() => {
    if (showResult || isGameOver || isPaused || showCheckpointDialog) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [showResult, isGameOver, isPaused, showCheckpointDialog, currentQuestionIndex]);

  const handleTimeUp = useCallback(async () => {
    setShowResult(true);
    setIsCorrect(false);
    setIsGameOver(true);
    
    const safeHavens = prizeLadder.filter(p => p.isSafeHaven && p.questionNumber < currentQuestionIndex + 1);
    const safeHavenAmount = safeHavens.length > 0 ? safeHavens[safeHavens.length - 1].prizeAmount : 0;
    setEarnedAmount(safeHavenAmount);

    // Complete run in database
    if (currentRun) {
      await completeRun({
        runId: currentRun.id,
        reachedQ: currentQuestionIndex + 1,
        earnedTier: safeHavens.length,
        earnedAmount: safeHavenAmount,
        status: 'completed',
      });
    }
  }, [currentQuestionIndex, prizeLadder, currentRun]);

  const handleAnswer = async (choice: 'A' | 'B' | 'C' | 'D') => {
    if (showResult || selectedChoice) return;
    
    const timeTaken = Date.now() - questionStartTimeRef.current;
    setSelectedChoice(choice);
    
    const correct = correctAnswers[currentQuestion.id] === choice;
    
    // Record answer in database
    if (currentRun) {
      await recordAnswer({
        runId: currentRun.id,
        questionId: currentQuestion.id,
        questionNumber: currentQuestionIndex + 1,
        selected: choice,
        isCorrect: correct,
        timeTakenMs: timeTaken,
      });
    }
    
    setTimeout(async () => {
      setIsCorrect(correct);
      setShowResult(true);
      
      if (!correct) {
        setIsGameOver(true);
        const safeHavens = prizeLadder.filter(p => p.isSafeHaven && p.questionNumber < currentQuestionIndex + 1);
        const safeHavenAmount = safeHavens.length > 0 ? safeHavens[safeHavens.length - 1].prizeAmount : 0;
        setEarnedAmount(safeHavenAmount);

        // Complete run in database
        if (currentRun) {
          await completeRun({
            runId: currentRun.id,
            reachedQ: currentQuestionIndex + 1,
            earnedTier: safeHavens.length,
            earnedAmount: safeHavenAmount,
            status: 'completed',
          });
        }
      } else {
        // Show claim dialog after EVERY correct answer
        const currentPrize = prizeLadder[currentQuestionIndex]?.prizeAmount || 0;
        setEarnedAmount(currentPrize);
        
        // Check if won all questions (last question)
        if (currentQuestionIndex >= mockQuestions.length - 1) {
          setIsGameOver(true);
          const finalAmount = prizeLadder[currentQuestionIndex]?.prizeAmount || 0;
          setEarnedAmount(finalAmount);

          // Complete run in database
          if (currentRun) {
            await completeRun({
              runId: currentRun.id,
              reachedQ: currentQuestionIndex + 1,
              earnedTier: currentQuestionIndex + 1,
              earnedAmount: finalAmount,
              status: 'completed',
            });
          }
        } else {
          // Show claim or continue dialog for all other questions
          setShowCheckpointDialog(true);
        }
      }
    }, 1500);
  };

  const handleClaimNow = async () => {
    // User chooses to claim current prize and end game
    setClaimedEarly(true);
    setIsGameOver(true);
    setShowCheckpointDialog(false);

    // Complete run in database
    if (currentRun) {
      await completeRun({
        runId: currentRun.id,
        reachedQ: currentQuestionIndex + 1,
        earnedTier: currentQuestionIndex + 1,
        earnedAmount: earnedAmount,
        status: 'completed',
      });
    }
  };

  const handleKeepGoing = () => {
    // User chooses to continue - risk losing it all!
    setShowCheckpointDialog(false);
    // Move to next question
    if (currentQuestionIndex < mockQuestions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      setCurrentQuestion(mockQuestions[nextIndex]);
      setSelectedChoice(undefined);
      setShowResult(false);
      setTimeRemaining(QUESTION_TIME_LIMIT_SECONDS);
      setShowHint(false);
      setShowStats(false);
      questionStartTimeRef.current = Date.now();
    }
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
      questionStartTimeRef.current = Date.now();
    }
  };

  const handleUseLifeline = async (lifeline: LifelineType) => {
    if (usedLifelines.has(lifeline) || showResult) return;
    
    const newLifelines = new Set([...usedLifelines, lifeline]);
    setUsedLifelines(newLifelines);

    // Update lifelines in database
    if (currentRun) {
      await updateLifelinesUsed(currentRun.id, Array.from(newLifelines));
    }
    
    switch (lifeline) {
      case LIFELINES.FIFTY_FIFTY:
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

  const handleQuit = async () => {
    const safeHavens = prizeLadder.filter(p => p.isSafeHaven && p.questionNumber <= currentQuestionIndex);
    const safeHavenAmount = safeHavens.length > 0 ? safeHavens[safeHavens.length - 1].prizeAmount : 0;
    setEarnedAmount(safeHavenAmount);
    setIsGameOver(true);
    setShowQuitDialog(false);

    // Complete run as abandoned
    if (currentRun) {
      await completeRun({
        runId: currentRun.id,
        reachedQ: currentQuestionIndex,
        earnedTier: safeHavens.length,
        earnedAmount: safeHavenAmount,
        status: 'abandoned',
      });
    }
  };

  const handleViewResult = () => {
    navigate('/result', { 
      state: { 
        earnedAmount, 
        reachedQuestion: currentQuestionIndex + 1,
        isWinner: (isCorrect && currentQuestionIndex >= mockQuestions.length - 1) || claimedEarly,
        runId: currentRun?.id, // Pass the run ID for claiming
      } 
    });
  };

  // Check if current question is a safe haven (for UI highlighting)
  const isSafeHavenQuestion = SAFE_HAVEN_QUESTIONS.includes(currentQuestionIndex + 1);

  // Show loading while initializing run
  if (isInitializing) {
    return (
      <div className="min-h-screen gradient-hero flex flex-col items-center justify-center px-4 gap-6">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Starting game...</p>
      </div>
    );
  }

  if (isGameOver) {
    return (
      <div className="min-h-screen gradient-hero flex flex-col items-center justify-center px-4 gap-6">
        <div className={cn(
          'animate-bounce-in',
          (isCorrect && currentQuestionIndex >= mockQuestions.length - 1) || claimedEarly
            ? ''
            : earnedAmount > 0
            ? ''
            : ''
        )}>
          <JackieIcon size={100} className="drop-shadow-lg" />
        </div>

        <div className="text-center space-y-2">
          <h2 className="text-2xl font-display font-bold">
            {isCorrect && currentQuestionIndex >= mockQuestions.length - 1 
              ? '🎉 JACKPOT!' 
              : claimedEarly
              ? '🎉 Smart Move!'
              : earnedAmount > 0 
              ? 'Good Run!' 
              : 'Game Over'}
          </h2>
          <p className="text-muted-foreground">
            You reached question {currentQuestionIndex + 1} of 15
          </p>
        </div>

        <div className="flex items-center gap-3 px-8 py-5 bg-card rounded-2xl border border-border shadow-card">
          <CoinIcon size={40} />
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

  // Show "already played" screen
  if (hasPlayedToday) {
    const { hours, minutes, seconds } = formatCountdown(countdown);
    
    return (
      <div className="min-h-screen gradient-hero flex flex-col items-center justify-center px-4 gap-6">
        <JackieIcon size={100} className="drop-shadow-lg opacity-60" />
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-display font-bold">Come Back Tomorrow!</h2>
          <p className="text-muted-foreground">You've already played today. One play per day!</p>
        </div>
        
        {/* Countdown Timer */}
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">Next game available in:</p>
          <div className="flex items-center justify-center gap-3">
            <div className="flex flex-col items-center px-4 py-2 bg-card rounded-lg border border-border">
              <span className="text-2xl font-display font-bold text-primary">{String(hours).padStart(2, '0')}</span>
              <span className="text-xs text-muted-foreground">hours</span>
            </div>
            <span className="text-xl font-bold text-muted-foreground">:</span>
            <div className="flex flex-col items-center px-4 py-2 bg-card rounded-lg border border-border">
              <span className="text-2xl font-display font-bold text-primary">{String(minutes).padStart(2, '0')}</span>
              <span className="text-xs text-muted-foreground">mins</span>
            </div>
            <span className="text-xl font-bold text-muted-foreground">:</span>
            <div className="flex flex-col items-center px-4 py-2 bg-card rounded-lg border border-border">
              <span className="text-2xl font-display font-bold text-primary">{String(seconds).padStart(2, '0')}</span>
              <span className="text-xs text-muted-foreground">secs</span>
            </div>
          </div>
        </div>
        
        <Button variant="gold" size="lg" onClick={() => navigate('/')}>
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

        {/* Mobile: Sheet trigger for prize ladder */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="text-xs lg:hidden">
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

        {/* Desktop: Just show current prize */}
        <div className="hidden lg:flex items-center gap-1 text-sm">
          <CoinIcon size={16} />
          <span className="font-bold">
            {formatJC(prizeLadder[currentQuestionIndex]?.prizeAmount || 0)}
          </span>
        </div>
      </header>

      {/* Main Content with Side Panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main Content */}
        <main className="flex-1 flex flex-col px-4 py-6 gap-6 overflow-y-auto hide-scrollbar">
        {/* Lifelines - 1 by default, more via invites */}
          <Lifelines
            usedLifelines={usedLifelines}
            onUseLifeline={handleUseLifeline}
            disabled={showResult}
            availableLifelines={1}
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

          {/* Next Question Button removed - now handled by claim dialog */}
        </main>

        {/* Right Side Panel - Prize Ladder (Desktop Only) */}
        <aside className="hidden lg:flex w-72 border-l border-border bg-card/30 backdrop-blur p-4 overflow-y-auto">
          <PrizeLadder
            ladder={prizeLadder}
            currentQuestion={currentQuestionIndex + 1}
            reachedQuestion={currentQuestionIndex}
          />
        </aside>
      </div>

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

      {/* Claim or Continue Dialog - shown after every correct answer */}
      <AlertDialog open={showCheckpointDialog} onOpenChange={setShowCheckpointDialog}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <div className="flex justify-center mb-4">
              <JackieIcon size={80} className="animate-float" />
            </div>
            <AlertDialogTitle className="text-center text-2xl font-display">
              {isSafeHavenQuestion ? '🏆 Safe Haven!' : '✅ Correct!'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center space-y-4">
              <p>Question {currentQuestionIndex + 1} complete!</p>
              <div className="flex items-center justify-center gap-2 py-4 px-6 bg-card rounded-2xl border border-border shadow-card mx-auto">
                <CoinIcon size={32} />
                <span className="text-2xl font-display font-bold text-gradient-gold">
                  {formatJC(earnedAmount)} JC
                </span>
              </div>
              {isSafeHavenQuestion ? (
                <p className="text-sm text-primary font-medium">
                  This is a safe haven! If you lose later, you'll keep this amount.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Claim now to secure your prize, or keep going for more!
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              variant="gold"
              size="lg"
              className="w-full"
              onClick={handleClaimNow}
            >
              <HandCoins className="w-5 h-5" />
              Claim {formatJC(earnedAmount)} JC
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={handleKeepGoing}
            >
              <Rocket className="w-5 h-5" />
              Keep Going
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Game;
