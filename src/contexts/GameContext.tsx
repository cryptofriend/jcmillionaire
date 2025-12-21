import React, { createContext, useContext, useReducer, useCallback, useEffect, useState } from 'react';
import { GameState, User, Attempts, DayState, Run, QuestionWithHiddenChoices, PrizeLadderItem } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_PRIZE_LADDER } from '@/lib/constants';

type GameAction =
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_VERIFIED'; payload: boolean }
  | { type: 'SET_ATTEMPTS'; payload: Attempts | null }
  | { type: 'SET_DAY_STATE'; payload: DayState | null }
  | { type: 'SET_CURRENT_RUN'; payload: Run | null }
  | { type: 'SET_CURRENT_QUESTION'; payload: QuestionWithHiddenChoices | null }
  | { type: 'SET_PRIZE_LADDER'; payload: PrizeLadderItem[] }
  | { type: 'USE_LIFELINE'; payload: string }
  | { type: 'SET_TIME_REMAINING'; payload: number }
  | { type: 'RESET_GAME' };

const initialState: GameState = {
  user: null,
  isVerified: false,
  attempts: null,
  dayState: null,
  currentRun: null,
  currentQuestion: null,
  prizeLadder: DEFAULT_PRIZE_LADDER,
  lifelinesUsed: new Set(),
  timeRemaining: 30,
};

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload, isVerified: !!action.payload };
    case 'SET_VERIFIED':
      return { ...state, isVerified: action.payload };
    case 'SET_ATTEMPTS':
      return { ...state, attempts: action.payload };
    case 'SET_DAY_STATE':
      return { ...state, dayState: action.payload };
    case 'SET_CURRENT_RUN':
      return { 
        ...state, 
        currentRun: action.payload,
        lifelinesUsed: new Set(action.payload?.lifelinesUsed || [])
      };
    case 'SET_CURRENT_QUESTION':
      return { ...state, currentQuestion: action.payload, timeRemaining: 30 };
    case 'SET_PRIZE_LADDER':
      return { ...state, prizeLadder: action.payload };
    case 'USE_LIFELINE':
      return { ...state, lifelinesUsed: new Set([...state.lifelinesUsed, action.payload]) };
    case 'SET_TIME_REMAINING':
      return { ...state, timeRemaining: action.payload };
    case 'RESET_GAME':
      return { ...initialState, user: state.user, isVerified: state.isVerified };
    default:
      return state;
  }
}

interface GameContextType {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  fetchDayState: () => Promise<void>;
  fetchAttempts: () => Promise<void>;
  fetchPrizeLadder: () => Promise<void>;
  isLoading: boolean;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDayState = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('day_state')
        .select('*')
        .eq('day_id', today)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        dispatch({
          type: 'SET_DAY_STATE',
          payload: {
            dayId: data.day_id,
            poolTotal: data.pool_total,
            poolLocked: data.pool_locked,
            poolRemaining: data.pool_remaining,
          },
        });
      } else {
        // Default state if not created yet
        dispatch({
          type: 'SET_DAY_STATE',
          payload: {
            dayId: today,
            poolTotal: 1000000,
            poolLocked: 0,
            poolRemaining: 1000000,
          },
        });
      }
    } catch (error) {
      console.error('Error fetching day state:', error);
    }
  }, []);

  const fetchAttempts = useCallback(async () => {
    if (!state.user) return;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('attempts')
        .select('*')
        .eq('user_id', state.user.id)
        .eq('day_id', today)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        const remaining = Math.max(0, (data.free_granted ? 1 : 0) + data.earned_from_referrals - data.used);
        dispatch({
          type: 'SET_ATTEMPTS',
          payload: {
            userId: data.user_id,
            dayId: data.day_id,
            freeGranted: data.free_granted,
            earnedFromReferrals: data.earned_from_referrals,
            used: data.used,
            cap: data.cap,
            remaining: Math.min(remaining, data.cap - data.used),
          },
        });
      } else {
        // Default state for new user today
        dispatch({
          type: 'SET_ATTEMPTS',
          payload: {
            userId: state.user.id,
            dayId: today,
            freeGranted: true,
            earnedFromReferrals: 0,
            used: 0,
            cap: 10,
            remaining: 1,
          },
        });
      }
    } catch (error) {
      console.error('Error fetching attempts:', error);
    }
  }, [state.user]);

  const fetchPrizeLadder = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('prize_ladder')
        .select('*')
        .order('question_number', { ascending: true });

      if (error) throw error;
      
      if (data && data.length > 0) {
        dispatch({
          type: 'SET_PRIZE_LADDER',
          payload: data.map(item => ({
            questionNumber: item.question_number,
            prizeAmount: item.prize_amount,
            isSafeHaven: item.is_safe_haven,
          })),
        });
      }
    } catch (error) {
      console.error('Error fetching prize ladder:', error);
    }
  }, []);

  // Initialize app data
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await Promise.all([fetchDayState(), fetchPrizeLadder()]);
      setIsLoading(false);
    };
    init();
  }, [fetchDayState, fetchPrizeLadder]);

  // Fetch attempts when user changes
  useEffect(() => {
    if (state.user) {
      fetchAttempts();
    }
  }, [state.user, fetchAttempts]);

  return (
    <GameContext.Provider value={{ state, dispatch, fetchDayState, fetchAttempts, fetchPrizeLadder, isLoading }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
