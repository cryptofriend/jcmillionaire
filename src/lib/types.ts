export interface User {
  id: string;
  nullifierHash: string;
  verificationLevel: 'device' | 'orb';
  createdAt: string;
  username?: string;
  profilePictureUrl?: string;
  referralCode?: string;
}

export interface DayState {
  dayId: string;
  poolTotal: number;
  poolLocked: number;
  poolRemaining: number;
}

export interface Attempts {
  userId: string;
  dayId: string;
  freeGranted: boolean;
  earnedFromReferrals: number;
  used: number;
  cap: number;
  remaining: number;
}

export interface Question {
  id: string;
  question: string;
  choiceA: string;
  choiceB: string;
  choiceC: string;
  choiceD: string;
  correctChoice?: string; // Only revealed after answer
  difficulty: number;
  hint: string;
  category: string;
}

export interface QuestionWithHiddenChoices {
  id: string;
  question: string;
  choices: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  difficulty: number;
  category: string;
  hint: string; // Hint text for the hint lifeline
  correctChoice?: 'A' | 'B' | 'C' | 'D'; // Only available after answer
  hiddenChoices?: ('A' | 'B' | 'C' | 'D')[]; // For 50:50 lifeline
}

export interface Run {
  id: string;
  userId: string;
  dayId: string;
  status: 'active' | 'completed' | 'abandoned';
  reachedQ: number;
  earnedTier: number;
  earnedAmount: number;
  currentQuestionId?: string;
  questionStartedAt?: string;
  startedAt: string;
  endedAt?: string;
  lifelinesUsed: string[];
}

export interface PrizeLadderItem {
  questionNumber: number;
  prizeAmount: number;
  isSafeHaven: boolean;
}

export interface AnswerStats {
  choiceACount: number;
  choiceBCount: number;
  choiceCCount: number;
  choiceDCount: number;
  total: number;
  percentages: {
    A: number;
    B: number;
    C: number;
    D: number;
  };
}

export interface Referral {
  id: string;
  inviterUserId: string;
  invitedUserId?: string;
  inviteCode: string;
  status: 'clicked' | 'verified' | 'first_run_completed';
  createdAt: string;
}

export interface Claim {
  id: string;
  runId: string;
  userId: string;
  dayId: string;
  amount: number;
  nonce: string;
  expiresAt: string;
  status: 'authorized' | 'submitted' | 'confirmed' | 'expired';
  txHash?: string;
}

export interface GameState {
  user: User | null;
  isVerified: boolean;
  attempts: Attempts | null;
  dayState: DayState | null;
  currentRun: Run | null;
  currentQuestion: QuestionWithHiddenChoices | null;
  prizeLadder: PrizeLadderItem[];
  lifelinesUsed: Set<string>;
  timeRemaining: number;
}

export interface AnswerResult {
  isCorrect: boolean;
  correctChoice: string;
  earnedAmount: number;
  safeHavenAmount: number;
  isGameOver: boolean;
  nextQuestion?: QuestionWithHiddenChoices;
}
