import { supabase } from '@/integrations/supabase/client';
import { Run, QuestionWithHiddenChoices, AnswerStats } from '@/lib/types';
import type { Language } from '@/lib/i18n';

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

  const { data: runData, error } = await supabase
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
    .eq('id', runId)
    .select('user_id')
    .single();

  if (error) {
    console.error('Error completing run:', error);
    return { success: false, error: error.message };
  }

  // If this is a completed run (not abandoned), check if this user was referred
  // and update the referral status to trigger the bonus attempt for the inviter
  if (status === 'completed' && runData?.user_id) {
    await updateReferralOnFirstRun(runData.user_id);
  }

  return { success: true, error: null };
}

/**
 * Update referral status to 'first_run_completed' if this is the user's first completed run
 */
async function updateReferralOnFirstRun(userId: string): Promise<void> {
  try {
    // Check if user has a referral that's not yet marked as first_run_completed
    const { data: referral, error: refError } = await supabase
      .from('referrals')
      .select('id, status')
      .eq('invited_user_id', userId)
      .neq('status', 'first_run_completed')
      .maybeSingle();

    if (refError || !referral) {
      // No pending referral found, nothing to do
      return;
    }

    // Check if user has any other completed runs (this should be their first)
    const { count, error: countError } = await supabase
      .from('runs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'completed');

    if (countError) {
      console.error('Error checking run count:', countError);
      return;
    }

    // If this is their first completed run (count should be 1 after current completion)
    if (count && count <= 1) {
      const { error: updateError } = await supabase
        .from('referrals')
        .update({ status: 'first_run_completed' })
        .eq('id', referral.id);

      if (updateError) {
        console.error('Error updating referral status:', updateError);
      } else {
        console.log('Referral marked as first_run_completed, inviter will receive bonus attempt');
      }
    }
  } catch (err) {
    console.error('Error in updateReferralOnFirstRun:', err);
  }
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

/**
 * Increment the 'used' count for a user's attempts today
 * Returns the updated attempts data or error
 */
export async function incrementAttemptsUsed(
  userId: string
): Promise<{ success: boolean; error: string | null }> {
  const today = getTodayDayId();

  // First, try to get existing attempts for today
  const { data: existing, error: fetchError } = await supabase
    .from('attempts')
    .select('*')
    .eq('user_id', userId)
    .eq('day_id', today)
    .maybeSingle();

  if (fetchError) {
    console.error('Error fetching attempts:', fetchError);
    return { success: false, error: fetchError.message };
  }

  if (existing) {
    // Update existing record
    const { error: updateError } = await supabase
      .from('attempts')
      .update({ used: existing.used + 1 })
      .eq('id', existing.id);

    if (updateError) {
      console.error('Error updating attempts:', updateError);
      return { success: false, error: updateError.message };
    }
  } else {
    // Create new record with used = 1
    const { error: insertError } = await supabase
      .from('attempts')
      .insert({
        user_id: userId,
        day_id: today,
        free_granted: true,
        earned_from_referrals: 0,
        used: 1,
        cap: 1,
      });

    if (insertError) {
      console.error('Error inserting attempts:', insertError);
      return { success: false, error: insertError.message };
    }
  }

  return { success: true, error: null };
}

/**
 * Fetch today's questions from the database
 * Returns 15 questions ordered by difficulty for today's game
 */
export async function fetchTodayQuestions(language: Language = 'en'): Promise<{
  questions: QuestionWithHiddenChoices[];
  correctAnswers: Record<string, 'A' | 'B' | 'C' | 'D'>;
  error: string | null;
}> {
  const today = getTodayDayId();

  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('active_dates', today)
    .eq('is_active', true)
    .order('difficulty', { ascending: true });

  if (error) {
    console.error('Error fetching questions:', error);
    return { questions: [], correctAnswers: {}, error: error.message };
  }

  if (!data || data.length === 0) {
    console.warn('No questions found for today:', today);
    return { questions: [], correctAnswers: {}, error: 'No questions available for today' };
  }

  // Helper to get translated field with English fallback
  const getTranslated = (row: Record<string, unknown>, field: string, lang: Language): string => {
    if (lang === 'en') return row[field] as string;
    const translatedField = `${field}_${lang}`;
    return (row[translatedField] as string | null) || (row[field] as string);
  };

  // Transform database questions to game format with language support
  const questions: QuestionWithHiddenChoices[] = data.map((q) => {
    return {
      id: q.id,
      question: getTranslated(q, 'question', language),
      choices: {
        A: getTranslated(q, 'choice_a', language),
        B: getTranslated(q, 'choice_b', language),
        C: getTranslated(q, 'choice_c', language),
        D: getTranslated(q, 'choice_d', language),
      },
      difficulty: q.difficulty,
      category: q.category,
      hint: getTranslated(q, 'hint', language),
    };
  });

  // Build correct answers map (not exposed to client during game)
  const correctAnswers: Record<string, 'A' | 'B' | 'C' | 'D'> = {};
  data.forEach((q) => {
    correctAnswers[q.id] = q.correct_choice as 'A' | 'B' | 'C' | 'D';
  });

  console.log(`Loaded ${questions.length} questions for ${today} in ${language}`);
  return { questions, correctAnswers, error: null };
}

/**
 * Fetch answer statistics for a question
 */
export async function fetchAnswerStats(questionId: string): Promise<AnswerStats | null> {
  const { data, error } = await supabase
    .from('answer_stats')
    .select('*')
    .eq('question_id', questionId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const total = data.choice_a_count + data.choice_b_count + data.choice_c_count + data.choice_d_count;
  if (total === 0) {
    return {
      choiceACount: 0,
      choiceBCount: 0,
      choiceCCount: 0,
      choiceDCount: 0,
      total: 0,
      percentages: { A: 25, B: 25, C: 25, D: 25 },
    };
  }

  return {
    choiceACount: data.choice_a_count,
    choiceBCount: data.choice_b_count,
    choiceCCount: data.choice_c_count,
    choiceDCount: data.choice_d_count,
    total,
    percentages: {
      A: Math.round((data.choice_a_count / total) * 100),
      B: Math.round((data.choice_b_count / total) * 100),
      C: Math.round((data.choice_c_count / total) * 100),
      D: Math.round((data.choice_d_count / total) * 100),
    },
  };
}
