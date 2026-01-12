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

interface BaseQuestion {
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

interface TranslatedQuestion extends BaseQuestion {
  // Translations for each language (keyed by field_lang)
  question_es?: string;
  choice_a_es?: string;
  choice_b_es?: string;
  choice_c_es?: string;
  choice_d_es?: string;
  hint_es?: string;
  question_th?: string;
  choice_a_th?: string;
  choice_b_th?: string;
  choice_c_th?: string;
  choice_d_th?: string;
  hint_th?: string;
  question_hi?: string;
  choice_a_hi?: string;
  choice_b_hi?: string;
  choice_c_hi?: string;
  choice_d_hi?: string;
  hint_hi?: string;
  question_id?: string;
  choice_a_id?: string;
  choice_b_id?: string;
  choice_c_id?: string;
  choice_d_id?: string;
  hint_id?: string;
}

async function fetchSheetData(sheetName: string): Promise<BaseQuestion[]> {
  const apiKey = Deno.env.get('GOOGLE_SHEETS_API_KEY');
  const sheetId = Deno.env.get('GOOGLE_SHEETS_ID');
  
  if (!apiKey || !sheetId) {
    throw new Error('Missing GOOGLE_SHEETS_API_KEY or GOOGLE_SHEETS_ID');
  }

  // Fetch data from the specific sheet by name
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

  // First row is headers
  const headers = rows[0].map((h: string) => h.toLowerCase().trim().replace(/\s+/g, '_'));
  console.log(`Headers found in ${sheetName}:`, headers);
  
  const questions: BaseQuestion[] = [];
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0 || !row[0]) continue; // Skip empty rows
    
    const rowObj: Record<string, string> = {};
    headers.forEach((header: string, idx: number) => {
      rowObj[header] = row[idx] || '';
    });

    // Validate required fields
    if (!rowObj.question || !rowObj.correct_choice) {
      console.log(`Skipping row ${i + 1} in ${sheetName}: missing required fields`);
      continue;
    }

    // Parse difficulty (default to 1 if not provided or invalid)
    let difficulty = parseInt(rowObj.difficulty) || 1;
    difficulty = Math.max(1, Math.min(5, difficulty));

    // Parse active_dates date (default to today if not provided)
    let activeDates = rowObj.active_dates;
    if (!activeDates || !/^\d{4}-\d{2}-\d{2}$/.test(activeDates)) {
      const dateMatch = activeDates?.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
      if (dateMatch) {
        activeDates = `${dateMatch[3]}-${dateMatch[1].padStart(2, '0')}-${dateMatch[2].padStart(2, '0')}`;
      } else {
        activeDates = new Date().toISOString().split('T')[0];
      }
    }

    // Parse is_active (default to true, handle checkmark ✔)
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

// Create a unique key for matching questions across sheets
// Uses active_dates + difficulty + row position as a composite key
function createQuestionKey(q: BaseQuestion, index: number): string {
  return `${q.active_dates}|${q.difficulty}|${index}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting question sync from Google Sheets (multi-language)...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch questions from all language sheets
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
    
    // Use English sheet as the base
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

    const baseQuestions = enData.questions;
    console.log(`Using ${baseQuestions.length} English questions as base`);

    // Create maps for other language sheets indexed by position
    const translationMaps: Record<LanguageCode, Map<number, BaseQuestion>> = {
      en: new Map(),
      es: new Map(),
      th: new Map(),
      hi: new Map(),
      id: new Map(),
    };

    allSheetData.forEach(({ sheetName, questions }) => {
      const langCode = SHEET_TO_LANG[sheetName];
      if (langCode && langCode !== 'en') {
        questions.forEach((q, idx) => {
          translationMaps[langCode].set(idx, q);
        });
      }
    });

    // Merge base questions with translations
    const mergedQuestions: TranslatedQuestion[] = baseQuestions.map((baseQ, idx) => {
      const merged: TranslatedQuestion = { ...baseQ };
      
      // Add Spanish translations
      const esQ = translationMaps.es.get(idx);
      if (esQ) {
        merged.question_es = esQ.question;
        merged.choice_a_es = esQ.choice_a;
        merged.choice_b_es = esQ.choice_b;
        merged.choice_c_es = esQ.choice_c;
        merged.choice_d_es = esQ.choice_d;
        merged.hint_es = esQ.hint;
      }
      
      // Add Thai translations
      const thQ = translationMaps.th.get(idx);
      if (thQ) {
        merged.question_th = thQ.question;
        merged.choice_a_th = thQ.choice_a;
        merged.choice_b_th = thQ.choice_b;
        merged.choice_c_th = thQ.choice_c;
        merged.choice_d_th = thQ.choice_d;
        merged.hint_th = thQ.hint;
      }
      
      // Add Hindi translations
      const hiQ = translationMaps.hi.get(idx);
      if (hiQ) {
        merged.question_hi = hiQ.question;
        merged.choice_a_hi = hiQ.choice_a;
        merged.choice_b_hi = hiQ.choice_b;
        merged.choice_c_hi = hiQ.choice_c;
        merged.choice_d_hi = hiQ.choice_d;
        merged.hint_hi = hiQ.hint;
      }
      
      // Add Indonesian translations
      const idQ = translationMaps.id.get(idx);
      if (idQ) {
        merged.question_id = idQ.question;
        merged.choice_a_id = idQ.choice_a;
        merged.choice_b_id = idQ.choice_b;
        merged.choice_c_id = idQ.choice_c;
        merged.choice_d_id = idQ.choice_d;
        merged.hint_id = idQ.hint;
      }
      
      return merged;
    });

    console.log(`Merged ${mergedQuestions.length} questions with translations`);

    // Prepare for upsert
    const questionsToUpsert = mergedQuestions.map(q => ({
      question: q.question,
      choice_a: q.choice_a,
      choice_b: q.choice_b,
      choice_c: q.choice_c,
      choice_d: q.choice_d,
      correct_choice: q.correct_choice,
      hint: q.hint,
      category: q.category,
      difficulty: q.difficulty,
      active_dates: q.active_dates,
      is_active: q.is_active,
      text_hash: generateTextHash(q.question, [q.choice_a, q.choice_b, q.choice_c, q.choice_d]),
      // Spanish
      question_es: q.question_es || null,
      choice_a_es: q.choice_a_es || null,
      choice_b_es: q.choice_b_es || null,
      choice_c_es: q.choice_c_es || null,
      choice_d_es: q.choice_d_es || null,
      hint_es: q.hint_es || null,
      // Thai
      question_th: q.question_th || null,
      choice_a_th: q.choice_a_th || null,
      choice_b_th: q.choice_b_th || null,
      choice_c_th: q.choice_c_th || null,
      choice_d_th: q.choice_d_th || null,
      hint_th: q.hint_th || null,
      // Hindi
      question_hi: q.question_hi || null,
      choice_a_hi: q.choice_a_hi || null,
      choice_b_hi: q.choice_b_hi || null,
      choice_c_hi: q.choice_c_hi || null,
      choice_d_hi: q.choice_d_hi || null,
      hint_hi: q.hint_hi || null,
      // Indonesian
      question_id: q.question_id || null,
      choice_a_id: q.choice_a_id || null,
      choice_b_id: q.choice_b_id || null,
      choice_c_id: q.choice_c_id || null,
      choice_d_id: q.choice_d_id || null,
      hint_id: q.hint_id || null,
    }));

    // Upsert based on text_hash
    const { data, error } = await supabase
      .from('questions')
      .upsert(questionsToUpsert, { 
        onConflict: 'text_hash',
        ignoreDuplicates: false 
      })
      .select();

    if (error) {
      console.error('Error upserting questions:', error);
      throw error;
    }

    const syncedCount = data?.length || questionsToUpsert.length;
    
    // Summary of translations found
    const translationSummary = {
      en: baseQuestions.length,
      es: translationMaps.es.size,
      th: translationMaps.th.size,
      hi: translationMaps.hi.size,
      id: translationMaps.id.size,
    };
    
    console.log(`Successfully synced ${syncedCount} questions with translations:`, translationSummary);

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Synced ${syncedCount} questions from Google Sheets`,
      synced: syncedCount,
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
