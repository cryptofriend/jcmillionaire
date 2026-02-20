import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Sheet names for each language
const LANGUAGE_SHEETS = ['En', 'Es', 'Th', 'Hi', 'In'] as const;
// Solana-specific sheet (English only)
const SOLANA_SHEET = 'Solana';
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

    // Map difficulty: support text labels (easy/medium/hard) or numeric
    let difficulty = 1;
    const diffRaw = (rowObj.difficulty || '').toString().toLowerCase().trim();
    if (diffRaw === 'easy') difficulty = 1;
    else if (diffRaw === 'medium') difficulty = 2;
    else if (diffRaw === 'hard') difficulty = 3;
    else {
      const parsed = parseInt(diffRaw);
      difficulty = isNaN(parsed) ? 1 : Math.max(1, Math.min(3, parsed));
    }

    const isActiveRaw = rowObj.is_active?.toLowerCase().trim();
    const isActive = isActiveRaw !== 'false' && isActiveRaw !== '0' && isActiveRaw !== 'no';

    const category = rowObj.category?.trim() || 'General';

    questions.push({
      question: rowObj.question.trim(),
      choice_a: rowObj.choice_a?.trim() || '',
      choice_b: rowObj.choice_b?.trim() || '',
      choice_c: rowObj.choice_c?.trim() || '',
      choice_d: rowObj.choice_d?.trim() || '',
      correct_choice: rowObj.correct_choice?.trim().toUpperCase() || 'A',
      hint: rowObj.hint?.trim() || 'Think carefully!',
      category,
      difficulty,
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

/**
 * Generate an AI image for a question using Lovable AI gateway
 */
async function generateQuestionImage(
  question: string,
  category: string,
  questionId: string,
  supabase: ReturnType<typeof createClient>
): Promise<string | null> {
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!lovableApiKey) {
    console.warn('LOVABLE_API_KEY not set, skipping image generation');
    return null;
  }

  try {
    const prompt = `Generate a vibrant, colorful illustration for a trivia quiz question. Category: ${category}. Question theme: "${question.substring(0, 100)}". Style: modern flat illustration, game-show aesthetic, bold colors, no text or letters in the image. Square format.`;

    console.log(`Generating image for question ${questionId}...`);
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image',
        messages: [{ role: 'user', content: prompt }],
        modalities: ['image', 'text'],
      }),
    });

    if (!response.ok) {
      console.error(`AI gateway error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageData || !imageData.startsWith('data:image')) {
      console.error('No valid image in AI response');
      return null;
    }

    // Extract base64 data and upload to storage
    const base64Match = imageData.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!base64Match) {
      console.error('Could not parse base64 image data');
      return null;
    }

    const ext = base64Match[1] === 'jpeg' ? 'jpg' : base64Match[1];
    const base64Data = base64Match[2];
    const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    const filePath = `${questionId}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('question-images')
      .upload(filePath, binaryData, {
        contentType: `image/${base64Match[1]}`,
        upsert: true,
      });

    if (uploadError) {
      console.error(`Storage upload error for ${questionId}:`, uploadError);
      return null;
    }

    const { data: publicUrl } = supabase.storage
      .from('question-images')
      .getPublicUrl(filePath);

    console.log(`Image generated and uploaded for question ${questionId}`);
    return publicUrl.publicUrl;
  } catch (err) {
    console.error(`Image generation failed for ${questionId}:`, err);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate admin authorization
    let body: Record<string, unknown> = {};
    try { body = await req.json(); } catch { /* no body is fine */ }
    const adminUserId = body?.admin_user_id as string | undefined;
    if (!adminUserId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Admin user ID required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const { data: isAdmin } = await supabase.rpc('is_admin', { _user_id: adminUserId });
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized: admin role required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting question sync from Google Sheets (multi-language with matching)...');

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

    // Build translation maps indexed by (difficulty, row_index)
    const translationsByKey: Record<string, Record<LanguageCode, SheetQuestion>> = {};
    
    allSheetData.forEach(({ sheetName, questions }) => {
      const langCode = SHEET_TO_LANG[sheetName];
      questions.forEach((q, idx) => {
        const key = `${q.difficulty}|${idx}`;
        if (!translationsByKey[key]) {
          translationsByKey[key] = {} as Record<LanguageCode, SheetQuestion>;
        }
        translationsByKey[key][langCode] = q;
      });
    });

    // Fetch existing questions from database indexed by text_hash
    const { data: existingQuestions, error: fetchError } = await supabase
      .from('questions')
      .select('id, difficulty, question, text_hash, image_url')
      .order('difficulty', { ascending: true });

    if (fetchError) {
      console.error('Error fetching existing questions:', fetchError);
      throw fetchError;
    }

    // Index existing questions by text_hash for quick lookup
    const existingByTextHash: Record<string, { id: string; question: string; text_hash: string; difficulty: number; image_url: string | null }> = {};
    (existingQuestions || []).forEach(q => {
      existingByTextHash[q.text_hash] = { id: q.id, question: q.question, text_hash: q.text_hash, difficulty: q.difficulty, image_url: q.image_url };
    });

    let updatedCount = 0;
    let insertedCount = 0;
    let imagesGenerated = 0;
    const translationSummary = { en: 0, es: 0, th: 0, hi: 0, id: 0 };

    // Process English questions and match by text_hash
    for (let idx = 0; idx < enData.questions.length; idx++) {
      const enQ = enData.questions[idx];
      const fullKey = `${enQ.difficulty}|${idx}`;
      
      const textHash = generateTextHash(enQ.question, [enQ.choice_a, enQ.choice_b, enQ.choice_c, enQ.choice_d]);
      
      const translations = translationsByKey[fullKey] || {};
      const esQ = translations.es;
      const thQ = translations.th;
      const hiQ = translations.hi;
      const idQ = translations.id;

      translationSummary.en++;
      if (esQ) translationSummary.es++;
      if (thQ) translationSummary.th++;
      if (hiQ) translationSummary.hi++;
      if (idQ) translationSummary.id++;

      const matchedQuestion = existingByTextHash[textHash];

      // Generate image if question doesn't already have one
      let imageUrl: string | null = matchedQuestion?.image_url || null;
      if (!imageUrl) {
        const questionId = matchedQuestion?.id || crypto.randomUUID();
        imageUrl = await generateQuestionImage(enQ.question, enQ.category, questionId, supabase);
        if (imageUrl) imagesGenerated++;
      }

      const questionData: Record<string, unknown> = {
        question: enQ.question,
        choice_a: enQ.choice_a,
        choice_b: enQ.choice_b,
        choice_c: enQ.choice_c,
        choice_d: enQ.choice_d,
        correct_choice: enQ.correct_choice,
        hint: enQ.hint,
        category: enQ.category,
        difficulty: enQ.difficulty,
        active_dates: new Date().toISOString().split('T')[0],
        is_active: enQ.is_active,
        text_hash: textHash,
        image_url: imageUrl,
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

      if (matchedQuestion) {
        const { error: updateError } = await supabase
          .from('questions')
          .update(questionData)
          .eq('id', matchedQuestion.id);

        if (updateError) {
          console.error(`Error updating question ${matchedQuestion.id}:`, updateError);
        } else {
          updatedCount++;
        }
      } else {
        const { error: insertError } = await supabase
          .from('questions')
          .insert(questionData);

        if (insertError) {
          console.error(`Error inserting question:`, insertError);
        } else {
          insertedCount++;
        }
      }
    }

    // ===== Process Solana sheet (English only, tagged with 'Solana:' category prefix) =====
    let solanaInserted = 0;
    let solanaUpdated = 0;
    try {
      const solanaQuestions = await fetchSheetData(SOLANA_SHEET);
      console.log(`Found ${solanaQuestions.length} questions in Solana sheet`);

      for (const solQ of solanaQuestions) {
        // Prefix category with "Solana:" to distinguish from regular questions
        const category = solQ.category ? `Solana:${solQ.category}` : 'Solana:General';
        const textHash = generateTextHash(solQ.question, [solQ.choice_a, solQ.choice_b, solQ.choice_c, solQ.choice_d]);
        
        const matchedQuestion = existingByTextHash[textHash];
        
        let imageUrl: string | null = matchedQuestion?.image_url || null;
        if (!imageUrl) {
          const questionId = matchedQuestion?.id || crypto.randomUUID();
          imageUrl = await generateQuestionImage(solQ.question, category, questionId, supabase);
          if (imageUrl) imagesGenerated++;
        }

        const questionData: Record<string, unknown> = {
          question: solQ.question,
          choice_a: solQ.choice_a,
          choice_b: solQ.choice_b,
          choice_c: solQ.choice_c,
          choice_d: solQ.choice_d,
          correct_choice: solQ.correct_choice,
          hint: solQ.hint,
          category,
          difficulty: solQ.difficulty,
          active_dates: new Date().toISOString().split('T')[0],
          is_active: solQ.is_active,
          text_hash: textHash,
          image_url: imageUrl,
        };

        if (matchedQuestion) {
          const { error: updateError } = await supabase
            .from('questions')
            .update(questionData)
            .eq('id', matchedQuestion.id);
          if (!updateError) solanaUpdated++;
        } else {
          const { error: insertError } = await supabase
            .from('questions')
            .insert(questionData);
          if (!insertError) solanaInserted++;
        }
      }
      console.log(`Solana sheet: ${solanaUpdated} updated, ${solanaInserted} inserted`);
    } catch (solanaError) {
      console.warn('Solana sheet sync skipped or failed:', solanaError);
    }
    
    console.log(`Sync complete: ${updatedCount + solanaUpdated} updated, ${insertedCount + solanaInserted} inserted, ${imagesGenerated} images generated`);
    console.log('Translation summary:', translationSummary);

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Synced questions: ${updatedCount + solanaUpdated} updated, ${insertedCount + solanaInserted} inserted, ${imagesGenerated} images generated`,
      updated: updatedCount + solanaUpdated,
      inserted: insertedCount + solanaInserted,
      imagesGenerated,
      translations: translationSummary,
      solana: { updated: solanaUpdated, inserted: solanaInserted },
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
