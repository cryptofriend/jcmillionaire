import { supabase } from '@/integrations/supabase/client';
import { Run } from '@/lib/types';

export interface CreateRunParams {
  userId: string;
  dayId: string;
}

export interface RecordAnswerParams {
  runId: string;
  questionId: string;
  questionNumber: number;
  selected: string;
  isCorrect: boolean;
  timeTakenMs: number;
}

export interface CompleteRunParams {
  runId: string;
  reachedQ: number;
  earnedTier: number;
  earnedAmount: number;
  status: 'completed' | 'abandoned';
}

/**
 * Create a new game run in the database
 */
export async function createRun(params: CreateRunParams): Promise<{ run: Run | null; error: string | null }> {
  const { userId, dayId } = params;

  const { data, error } = await supabase
    .from('runs')
    .insert({
      user_id: userId,
      day_id: dayId,
      status: 'active',
      reached_q: 0,
      earned_tier: 0,
      earned_amount: 0,
      lifelines_used: [],
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating run:', error);
    return { run: null, error: error.message };
  }

  return {
    run: {
      id: data.id,
      userId: data.user_id,
      dayId: data.day_id,
      status: data.status,
      reachedQ: data.reached_q,
      earnedTier: data.earned_tier,
      earnedAmount: data.earned_amount,
      currentQuestionId: data.current_question_id,
      questionStartedAt: data.question_started_at,
      startedAt: data.started_at,
      endedAt: data.ended_at,
      lifelinesUsed: data.lifelines_used,
    },
    error: null,
  };
}

/**
 * Update the current question for a run
 */
export async function updateCurrentQuestion(
  runId: string,
  questionId: string
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase
    .from('runs')
    .update({
      current_question_id: questionId,
      question_started_at: new Date().toISOString(),
    })
    .eq('id', runId);

  if (error) {
    console.error('Error updating current question:', error);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

/**
 * Record an answer in the database
 */
export async function recordAnswer(params: RecordAnswerParams): Promise<{ success: boolean; error: string | null }> {
  const { runId, questionId, questionNumber, selected, isCorrect, timeTakenMs } = params;

  const { error } = await supabase
    .from('answers')
    .insert({
      run_id: runId,
      question_id: questionId,
      question_number: questionNumber,
      selected,
      is_correct: isCorrect,
      time_taken_ms: timeTakenMs,
    });

  if (error) {
    console.error('Error recording answer:', error);
    return { success: false, error: error.message };
  }

  // Also update the run's reached_q
  const { error: updateError } = await supabase
    .from('runs')
    .update({ reached_q: questionNumber })
    .eq('id', runId);

  if (updateError) {
    console.error('Error updating run reached_q:', updateError);
  }

  return { success: true, error: null };
}

/**
 * Update lifelines used for a run
 */
export async function updateLifelinesUsed(
  runId: string,
  lifelines: string[]
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase
    .from('runs')
    .update({
      lifelines_used: lifelines as ('fifty_fifty' | 'hint' | 'chain_scan')[],
    })
    .eq('id', runId);

  if (error) {
    console.error('Error updating lifelines:', error);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

/**
 * Complete a run and set final earnings
 */
export async function completeRun(params: CompleteRunParams): Promise<{ success: boolean; error: string | null }> {
  const { runId, reachedQ, earnedTier, earnedAmount, status } = params;

  const { error } = await supabase
    .from('runs')
    .update({
      status,
      reached_q: reachedQ,
      earned_tier: earnedTier,
      earned_amount: earnedAmount,
      ended_at: new Date().toISOString(),
      current_question_id: null,
      question_started_at: null,
    })
    .eq('id', runId);

  if (error) {
    console.error('Error completing run:', error);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

/**
 * Get a run by ID
 */
export async function getRun(runId: string): Promise<{ run: Run | null; error: string | null }> {
  const { data, error } = await supabase
    .from('runs')
    .select('*')
    .eq('id', runId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching run:', error);
    return { run: null, error: error.message };
  }

  if (!data) {
    return { run: null, error: 'Run not found' };
  }

  return {
    run: {
      id: data.id,
      userId: data.user_id,
      dayId: data.day_id,
      status: data.status,
      reachedQ: data.reached_q,
      earnedTier: data.earned_tier,
      earnedAmount: data.earned_amount,
      currentQuestionId: data.current_question_id,
      questionStartedAt: data.question_started_at,
      startedAt: data.started_at,
      endedAt: data.ended_at,
      lifelinesUsed: data.lifelines_used,
    },
    error: null,
  };
}

/**
 * Get today's date string in YYYY-MM-DD format
 */
export function getTodayDayId(): string {
  return new Date().toISOString().split('T')[0];
}
