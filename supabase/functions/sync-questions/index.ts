import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SheetRow {
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
  is_active?: boolean;
  // Spanish translations (optional)
  question_es?: string;
  choice_a_es?: string;
  choice_b_es?: string;
  choice_c_es?: string;
  choice_d_es?: string;
  hint_es?: string;
  // Thai translations (optional)
  question_th?: string;
  choice_a_th?: string;
  choice_b_th?: string;
  choice_c_th?: string;
  choice_d_th?: string;
  hint_th?: string;
  // Hindi translations (optional)
  question_hi?: string;
  choice_a_hi?: string;
  choice_b_hi?: string;
  choice_c_hi?: string;
  choice_d_hi?: string;
  hint_hi?: string;
  // Indonesian translations (optional)
  question_id?: string;
  choice_a_id?: string;
  choice_b_id?: string;
  choice_c_id?: string;
  choice_d_id?: string;
  hint_id?: string;
}

async function fetchSheetData(): Promise<SheetRow[]> {
  const apiKey = Deno.env.get('GOOGLE_SHEETS_API_KEY');
  const sheetId = Deno.env.get('GOOGLE_SHEETS_ID');
  
  if (!apiKey || !sheetId) {
    throw new Error('Missing GOOGLE_SHEETS_API_KEY or GOOGLE_SHEETS_ID');
  }

  // Fetch all data from the first sheet (extended range for all translation columns)
  // Columns: A-K (base) + L-Q (Spanish) + R-W (Thai) + X-AC (Hindi) + AD-AI (Indonesian)
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A:AI?key=${apiKey}`;
  
  console.log('Fetching from Google Sheets...');
  const response = await fetch(url);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google Sheets API error:', errorText);
    throw new Error(`Google Sheets API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const rows = data.values || [];
  
  if (rows.length < 2) {
    console.log('No data rows found in sheet');
    return [];
  }

  // First row is headers
  const headers = rows[0].map((h: string) => h.toLowerCase().trim().replace(/\s+/g, '_'));
  console.log('Headers found:', headers);
  
  const questions: SheetRow[] = [];
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0 || !row[0]) continue; // Skip empty rows
    
    const rowObj: Record<string, string> = {};
    headers.forEach((header: string, idx: number) => {
      rowObj[header] = row[idx] || '';
    });

    // Validate required fields
    if (!rowObj.question || !rowObj.correct_choice) {
      console.log(`Skipping row ${i + 1}: missing required fields`);
      continue;
    }

    // Parse difficulty (default to 1 if not provided or invalid)
    let difficulty = parseInt(rowObj.difficulty) || 1;
    // Clamp to 1-5 range
    difficulty = Math.max(1, Math.min(5, difficulty));

    // Parse active_dates date (default to today if not provided)
    let activeDates = rowObj.active_dates;
    if (!activeDates || !/^\d{4}-\d{2}-\d{2}$/.test(activeDates)) {
      // Try to parse other date formats
      const dateMatch = activeDates?.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
      if (dateMatch) {
        activeDates = `${dateMatch[3]}-${dateMatch[1].padStart(2, '0')}-${dateMatch[2].padStart(2, '0')}`;
      } else {
        activeDates = new Date().toISOString().split('T')[0];
      }
    }

    // Parse is_active (default to true)
    const isActive = rowObj.is_active?.toLowerCase() !== 'false';

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
      // Spanish translations (optional)
      question_es: rowObj.question_es?.trim() || undefined,
      choice_a_es: rowObj.choice_a_es?.trim() || undefined,
      choice_b_es: rowObj.choice_b_es?.trim() || undefined,
      choice_c_es: rowObj.choice_c_es?.trim() || undefined,
      choice_d_es: rowObj.choice_d_es?.trim() || undefined,
      hint_es: rowObj.hint_es?.trim() || undefined,
      // Thai translations (optional)
      question_th: rowObj.question_th?.trim() || undefined,
      choice_a_th: rowObj.choice_a_th?.trim() || undefined,
      choice_b_th: rowObj.choice_b_th?.trim() || undefined,
      choice_c_th: rowObj.choice_c_th?.trim() || undefined,
      choice_d_th: rowObj.choice_d_th?.trim() || undefined,
      hint_th: rowObj.hint_th?.trim() || undefined,
      // Hindi translations (optional)
      question_hi: rowObj.question_hi?.trim() || undefined,
      choice_a_hi: rowObj.choice_a_hi?.trim() || undefined,
      choice_b_hi: rowObj.choice_b_hi?.trim() || undefined,
      choice_c_hi: rowObj.choice_c_hi?.trim() || undefined,
      choice_d_hi: rowObj.choice_d_hi?.trim() || undefined,
      hint_hi: rowObj.hint_hi?.trim() || undefined,
      // Indonesian translations (optional)
      question_id: rowObj.question_id?.trim() || undefined,
      choice_a_id: rowObj.choice_a_id?.trim() || undefined,
      choice_b_id: rowObj.choice_b_id?.trim() || undefined,
      choice_c_id: rowObj.choice_c_id?.trim() || undefined,
      choice_d_id: rowObj.choice_d_id?.trim() || undefined,
      hint_id: rowObj.hint_id?.trim() || undefined,
    });
  }

  console.log(`Parsed ${questions.length} questions from sheet`);
  return questions;
}

function generateTextHash(question: string, choices: string[]): string {
  const combined = [question, ...choices].join('|');
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting question sync from Google Sheets...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch questions from Google Sheets
    const sheetQuestions = await fetchSheetData();
    
    if (sheetQuestions.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No questions found in sheet',
        synced: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prepare questions for upsert
    const questionsToUpsert = sheetQuestions.map(q => ({
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
      is_active: q.is_active ?? true,
      text_hash: generateTextHash(q.question, [q.choice_a, q.choice_b, q.choice_c, q.choice_d]),
      // Spanish translations
      question_es: q.question_es || null,
      choice_a_es: q.choice_a_es || null,
      choice_b_es: q.choice_b_es || null,
      choice_c_es: q.choice_c_es || null,
      choice_d_es: q.choice_d_es || null,
      hint_es: q.hint_es || null,
      // Thai translations
      question_th: q.question_th || null,
      choice_a_th: q.choice_a_th || null,
      choice_b_th: q.choice_b_th || null,
      choice_c_th: q.choice_c_th || null,
      choice_d_th: q.choice_d_th || null,
      hint_th: q.hint_th || null,
      // Hindi translations
      question_hi: q.question_hi || null,
      choice_a_hi: q.choice_a_hi || null,
      choice_b_hi: q.choice_b_hi || null,
      choice_c_hi: q.choice_c_hi || null,
      choice_d_hi: q.choice_d_hi || null,
      hint_hi: q.hint_hi || null,
      // Indonesian translations
      question_id: q.question_id || null,
      choice_a_id: q.choice_a_id || null,
      choice_b_id: q.choice_b_id || null,
      choice_c_id: q.choice_c_id || null,
      choice_d_id: q.choice_d_id || null,
      hint_id: q.hint_id || null,
    }));

    // Upsert based on text_hash to avoid duplicates
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
    console.log(`Successfully synced ${syncedCount} questions`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Synced ${syncedCount} questions from Google Sheets`,
      synced: syncedCount 
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
