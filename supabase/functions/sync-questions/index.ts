import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Sheet names for each language
const LANGUAGE_SHEETS = ['En', 'Es', 'Th', 'Hi', 'In'] as const;
type LanguageCode = 'en' | 'es' | 'th' | 'hi' | 'id';

const SHEET_TO_LANG: Record<string, LanguageCode> = {
  'En': 'en',
  'Es': 'es',
  'Th': 'th',
  'Hi': 'hi',
  'In': 'id',
};

interface SheetQuestion {
  question: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  correct_choice: string;
  hint: string;
  category: string;
  difficulty: number;
  active_dates: string;
  is_active: boolean;
}

async function fetchSheetData(sheetName: string): Promise<SheetQuestion[]> {
  const apiKey = Deno.env.get('GOOGLE_SHEETS_API_KEY');
  const sheetId = Deno.env.get('GOOGLE_SHEETS_ID');
  
  if (!apiKey || !sheetId) {
    throw new Error('Missing GOOGLE_SHEETS_API_KEY or GOOGLE_SHEETS_ID');
  }

  const encodedSheetName = encodeURIComponent(sheetName);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodedSheetName}!A:K?key=${apiKey}`;
  
  console.log(`Fetching from Google Sheets - Sheet: ${sheetName}...`);
  const response = await fetch(url);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Google Sheets API error for sheet ${sheetName}:`, errorText);
    throw new Error(`Google Sheets API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const rows = data.values || [];
  
  if (rows.length < 2) {
    console.log(`No data rows found in sheet ${sheetName}`);
    return [];
  }

  const headers = rows[0].map((h: string) => h.toLowerCase().trim().replace(/\s+/g, '_'));
  console.log(`Headers found in ${sheetName}:`, headers);
  
  const questions: SheetQuestion[] = [];
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0 || !row[0]) continue;
    
    const rowObj: Record<string, string> = {};
    headers.forEach((header: string, idx: number) => {
      rowObj[header] = row[idx] || '';
    });

    if (!rowObj.question || !rowObj.correct_choice) {
      console.log(`Skipping row ${i + 1} in ${sheetName}: missing required fields`);
      continue;
    }

    let difficulty = parseInt(rowObj.difficulty) || 1;
    difficulty = Math.max(1, Math.min(15, difficulty));

    let activeDates = rowObj.active_dates;
    if (!activeDates || !/^\d{4}-\d{2}-\d{2}$/.test(activeDates)) {
      const dateMatch = activeDates?.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
      if (dateMatch) {
        activeDates = `${dateMatch[3]}-${dateMatch[1].padStart(2, '0')}-${dateMatch[2].padStart(2, '0')}`;
      } else {
        activeDates = new Date().toISOString().split('T')[0];
      }
    }

    const isActiveRaw = rowObj.is_active?.toLowerCase().trim();
    const isActive = isActiveRaw !== 'false' && isActiveRaw !== '0' && isActiveRaw !== 'no';

    questions.push({
      question: rowObj.question.trim(),
      choice_a: rowObj.choice_a?.trim() || '',
      choice_b: rowObj.choice_b?.trim() || '',
      choice_c: rowObj.choice_c?.trim() || '',
      choice_d: rowObj.choice_d?.trim() || '',
      correct_choice: rowObj.correct_choice?.trim().toUpperCase() || 'A',
      hint: rowObj.hint?.trim() || 'Think carefully!',
      category: rowObj.category?.trim() || 'General',
      difficulty,
      active_dates: activeDates,
      is_active: isActive,
    });
  }

  console.log(`Parsed ${questions.length} questions from sheet ${sheetName}`);
  return questions;
}

function generateTextHash(question: string, choices: string[]): string {
  const combined = [question, ...choices].join('|');
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting question sync from Google Sheets (multi-language with matching)...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch questions from all language sheets in parallel
    const sheetDataPromises = LANGUAGE_SHEETS.map(async (sheetName) => {
      try {
        const questions = await fetchSheetData(sheetName);
        return { sheetName, questions };
      } catch (error) {
        console.error(`Error fetching sheet ${sheetName}:`, error);
        return { sheetName, questions: [] };
      }
    });

    const allSheetData = await Promise.all(sheetDataPromises);
    
    // Get English sheet as base
    const enData = allSheetData.find(s => s.sheetName === 'En');
    if (!enData || enData.questions.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'No questions found in English (En) sheet',
        synced: 0 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build translation maps indexed by (active_dates, difficulty, row_index)
    const translationsByKey: Record<string, Record<LanguageCode, SheetQuestion>> = {};
    
    allSheetData.forEach(({ sheetName, questions }) => {
      const langCode = SHEET_TO_LANG[sheetName];
      questions.forEach((q, idx) => {
        // Key by date + difficulty + index within that date/difficulty group
        const key = `${q.active_dates}|${q.difficulty}|${idx}`;
        if (!translationsByKey[key]) {
          translationsByKey[key] = {} as Record<LanguageCode, SheetQuestion>;
        }
        translationsByKey[key][langCode] = q;
      });
    });

    // Fetch existing questions from database
    const { data: existingQuestions, error: fetchError } = await supabase
      .from('questions')
      .select('id, active_dates, difficulty, question, text_hash')
      .order('active_dates', { ascending: true })
      .order('difficulty', { ascending: true });

    if (fetchError) {
      console.error('Error fetching existing questions:', fetchError);
      throw fetchError;
    }

    // Group existing questions by date + difficulty
    const existingByDateDifficulty: Record<string, Array<{ id: string; question: string; text_hash: string }>> = {};
    (existingQuestions || []).forEach(q => {
      const key = `${q.active_dates}|${q.difficulty}`;
      if (!existingByDateDifficulty[key]) {
        existingByDateDifficulty[key] = [];
      }
      existingByDateDifficulty[key].push({ id: q.id, question: q.question, text_hash: q.text_hash });
    });

    let updatedCount = 0;
    let insertedCount = 0;
    const translationSummary = { en: 0, es: 0, th: 0, hi: 0, id: 0 };

    // Process English questions and match with existing DB questions
    for (let idx = 0; idx < enData.questions.length; idx++) {
      const enQ = enData.questions[idx];
      const dateKey = `${enQ.active_dates}|${enQ.difficulty}`;
      const fullKey = `${enQ.active_dates}|${enQ.difficulty}|${idx}`;
      
      // Get translations for this question
      const translations = translationsByKey[fullKey] || {};
      const esQ = translations.es;
      const thQ = translations.th;
      const hiQ = translations.hi;
      const idQ = translations.id;

      // Count translations
      translationSummary.en++;
      if (esQ) translationSummary.es++;
      if (thQ) translationSummary.th++;
      if (hiQ) translationSummary.hi++;
      if (idQ) translationSummary.id++;

      // Find matching existing question by date + difficulty + position
      const existingForDate = existingByDateDifficulty[dateKey] || [];
      
      // Match by position within the same date/difficulty group
      // Or by similar question text if positions don't align
      let matchedQuestion: { id: string; question: string; text_hash: string } | null = null;
      
      // First try: exact position match within date/difficulty
      if (existingForDate[idx]) {
        matchedQuestion = existingForDate[idx];
      } else {
        // Second try: find by similar question text (fuzzy match)
        const normalizedEnQ = enQ.question.toLowerCase().replace(/[^a-z0-9]/g, '');
        for (const existing of existingForDate) {
          const normalizedExisting = existing.question.toLowerCase().replace(/[^a-z0-9]/g, '');
          // Check for significant overlap (at least 60% similarity)
          const shorter = Math.min(normalizedEnQ.length, normalizedExisting.length);
          const longer = Math.max(normalizedEnQ.length, normalizedExisting.length);
          if (shorter > 0 && shorter / longer > 0.6) {
            // Check if one contains significant portion of the other
            if (normalizedEnQ.includes(normalizedExisting.slice(0, 20)) || 
                normalizedExisting.includes(normalizedEnQ.slice(0, 20))) {
              matchedQuestion = existing;
              break;
            }
          }
        }
      }

      if (matchedQuestion) {
        // Update existing question with translations
        const updateData: Record<string, unknown> = {};
        
        // Update base English content if different
        updateData.question = enQ.question;
        updateData.choice_a = enQ.choice_a;
        updateData.choice_b = enQ.choice_b;
        updateData.choice_c = enQ.choice_c;
        updateData.choice_d = enQ.choice_d;
        updateData.hint = enQ.hint;
        updateData.correct_choice = enQ.correct_choice;
        updateData.category = enQ.category;
        updateData.is_active = enQ.is_active;
        
        // Add Spanish translations
        if (esQ) {
          updateData.question_es = esQ.question;
          updateData.choice_a_es = esQ.choice_a;
          updateData.choice_b_es = esQ.choice_b;
          updateData.choice_c_es = esQ.choice_c;
          updateData.choice_d_es = esQ.choice_d;
          updateData.hint_es = esQ.hint;
        }
        
        // Add Thai translations
        if (thQ) {
          updateData.question_th = thQ.question;
          updateData.choice_a_th = thQ.choice_a;
          updateData.choice_b_th = thQ.choice_b;
          updateData.choice_c_th = thQ.choice_c;
          updateData.choice_d_th = thQ.choice_d;
          updateData.hint_th = thQ.hint;
        }
        
        // Add Hindi translations
        if (hiQ) {
          updateData.question_hi = hiQ.question;
          updateData.choice_a_hi = hiQ.choice_a;
          updateData.choice_b_hi = hiQ.choice_b;
          updateData.choice_c_hi = hiQ.choice_c;
          updateData.choice_d_hi = hiQ.choice_d;
          updateData.hint_hi = hiQ.hint;
        }
        
        // Add Indonesian translations
        if (idQ) {
          updateData.question_id = idQ.question;
          updateData.choice_a_id = idQ.choice_a;
          updateData.choice_b_id = idQ.choice_b;
          updateData.choice_c_id = idQ.choice_c;
          updateData.choice_d_id = idQ.choice_d;
          updateData.hint_id = idQ.hint;
        }

        const { error: updateError } = await supabase
          .from('questions')
          .update(updateData)
          .eq('id', matchedQuestion.id);

        if (updateError) {
          console.error(`Error updating question ${matchedQuestion.id}:`, updateError);
        } else {
          updatedCount++;
        }
      } else {
        // Insert new question with all translations
        const insertData = {
          question: enQ.question,
          choice_a: enQ.choice_a,
          choice_b: enQ.choice_b,
          choice_c: enQ.choice_c,
          choice_d: enQ.choice_d,
          correct_choice: enQ.correct_choice,
          hint: enQ.hint,
          category: enQ.category,
          difficulty: enQ.difficulty,
          active_dates: enQ.active_dates,
          is_active: enQ.is_active,
          text_hash: generateTextHash(enQ.question, [enQ.choice_a, enQ.choice_b, enQ.choice_c, enQ.choice_d]),
          // Spanish
          question_es: esQ?.question || null,
          choice_a_es: esQ?.choice_a || null,
          choice_b_es: esQ?.choice_b || null,
          choice_c_es: esQ?.choice_c || null,
          choice_d_es: esQ?.choice_d || null,
          hint_es: esQ?.hint || null,
          // Thai
          question_th: thQ?.question || null,
          choice_a_th: thQ?.choice_a || null,
          choice_b_th: thQ?.choice_b || null,
          choice_c_th: thQ?.choice_c || null,
          choice_d_th: thQ?.choice_d || null,
          hint_th: thQ?.hint || null,
          // Hindi
          question_hi: hiQ?.question || null,
          choice_a_hi: hiQ?.choice_a || null,
          choice_b_hi: hiQ?.choice_b || null,
          choice_c_hi: hiQ?.choice_c || null,
          choice_d_hi: hiQ?.choice_d || null,
          hint_hi: hiQ?.hint || null,
          // Indonesian
          question_id: idQ?.question || null,
          choice_a_id: idQ?.choice_a || null,
          choice_b_id: idQ?.choice_b || null,
          choice_c_id: idQ?.choice_c || null,
          choice_d_id: idQ?.choice_d || null,
          hint_id: idQ?.hint || null,
        };

        const { error: insertError } = await supabase
          .from('questions')
          .insert(insertData);

        if (insertError) {
          console.error(`Error inserting question:`, insertError);
        } else {
          insertedCount++;
        }
      }
    }
    
    console.log(`Sync complete: ${updatedCount} updated, ${insertedCount} inserted`);
    console.log('Translation summary:', translationSummary);

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Synced questions: ${updatedCount} updated, ${insertedCount} inserted`,
      updated: updatedCount,
      inserted: insertedCount,
      translations: translationSummary
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in sync-questions function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
