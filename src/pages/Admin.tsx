import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useGame } from '@/contexts/GameContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, Trash2, RefreshCw, Shield, ArrowLeft, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuestionInput {
  question: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  correct_choice: 'A' | 'B' | 'C' | 'D';
  difficulty: number;
  category: string;
  hint: string;
  active_from?: string; // Optional: YYYY-MM-DD format
}

interface ExistingQuestion {
  id: string;
  question: string;
  difficulty: number;
  category: string;
  is_active: boolean;
  active_from: string;
}

const SAMPLE_FORMAT = `[
  {
    "question": "What is the primary purpose of World ID?",
    "choice_a": "Social media login",
    "choice_b": "Proof of personhood",
    "choice_c": "Payment processing",
    "choice_d": "Cloud storage",
    "correct_choice": "B",
    "difficulty": 1,
    "category": "World",
    "hint": "Think about what makes you unique as a human online...",
    "active_from": "2025-12-27"
  },
  {
    "question": "What blockchain does Worldcoin use?",
    "choice_a": "Bitcoin",
    "choice_b": "Ethereum",
    "choice_c": "World Chain",
    "choice_d": "Solana",
    "correct_choice": "C",
    "difficulty": 2,
    "category": "Crypto",
    "hint": "It's in the name...",
    "active_from": "2025-12-28"
  }
]

💡 TIP: Add "active_from": "YYYY-MM-DD" to schedule questions for specific days.
   Questions without active_from will default to today.`;

const Admin: React.FC = () => {
  const navigate = useNavigate();
  const { state, isAdmin } = useGame();
  const { user } = state;
  
  const [jsonInput, setJsonInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [existingQuestions, setExistingQuestions] = useState<ExistingQuestion[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; errors: string[] } | null>(null);

  // Redirect non-admins
  useEffect(() => {
    if (user && isAdmin === false) {
      toast.error('Access denied. Admin only.');
      navigate('/');
    }
  }, [user, isAdmin, navigate]);

  // Fetch existing questions
  useEffect(() => {
    const fetchQuestions = async () => {
      setIsLoadingQuestions(true);
      const { data, error } = await supabase
        .from('questions')
        .select('id, question, difficulty, category, is_active, active_from')
        .order('difficulty', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching questions:', error);
        toast.error('Failed to load questions');
      } else {
        setExistingQuestions(data || []);
      }
      setIsLoadingQuestions(false);
    };

    if (isAdmin) {
      fetchQuestions();
    }
  }, [isAdmin]);

  const validateQuestions = (questions: unknown[]): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (!Array.isArray(questions)) {
      return { valid: false, errors: ['Input must be a JSON array'] };
    }

    questions.forEach((q, index) => {
      const question = q as Record<string, unknown>;
      if (!question.question || typeof question.question !== 'string') {
        errors.push(`Question ${index + 1}: Missing or invalid 'question' field`);
      }
      if (!question.choice_a || typeof question.choice_a !== 'string') {
        errors.push(`Question ${index + 1}: Missing or invalid 'choice_a' field`);
      }
      if (!question.choice_b || typeof question.choice_b !== 'string') {
        errors.push(`Question ${index + 1}: Missing or invalid 'choice_b' field`);
      }
      if (!question.choice_c || typeof question.choice_c !== 'string') {
        errors.push(`Question ${index + 1}: Missing or invalid 'choice_c' field`);
      }
      if (!question.choice_d || typeof question.choice_d !== 'string') {
        errors.push(`Question ${index + 1}: Missing or invalid 'choice_d' field`);
      }
      if (!['A', 'B', 'C', 'D'].includes(String(question.correct_choice).toUpperCase())) {
        errors.push(`Question ${index + 1}: 'correct_choice' must be A, B, C, or D`);
      }
      if (typeof question.difficulty !== 'number' || question.difficulty < 1 || question.difficulty > 5) {
        errors.push(`Question ${index + 1}: 'difficulty' must be a number between 1-5`);
      }
      if (!question.category || typeof question.category !== 'string') {
        errors.push(`Question ${index + 1}: Missing or invalid 'category' field`);
      }
      if (!question.hint || typeof question.hint !== 'string') {
        errors.push(`Question ${index + 1}: Missing or invalid 'hint' field`);
      }
    });

    return { valid: errors.length === 0, errors };
  };

  const handleValidate = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      const result = validateQuestions(parsed);
      setValidationResult(result);
      
      if (result.valid) {
        toast.success(`Valid! ${parsed.length} questions ready to upload.`);
      } else {
        toast.error(`Found ${result.errors.length} validation errors`);
      }
    } catch (err) {
      setValidationResult({ valid: false, errors: ['Invalid JSON format. Check your syntax.'] });
      toast.error('Invalid JSON format');
    }
  };

  const handleUpload = async () => {
    if (!validationResult?.valid) {
      toast.error('Please validate the questions first');
      return;
    }

    setIsLoading(true);
    try {
      const parsed: QuestionInput[] = JSON.parse(jsonInput);
      const today = new Date().toISOString().split('T')[0];
      
      // Generate text_hash for each question (simple hash for deduplication)
      const questionsToInsert = parsed.map(q => ({
        question: q.question,
        choice_a: q.choice_a,
        choice_b: q.choice_b,
        choice_c: q.choice_c,
        choice_d: q.choice_d,
        correct_choice: q.correct_choice.toUpperCase(),
        difficulty: q.difficulty,
        category: q.category,
        hint: q.hint,
        text_hash: btoa(q.question.slice(0, 50)).replace(/[^a-zA-Z0-9]/g, '').slice(0, 32),
        is_active: true,
        active_from: q.active_from || today, // Use provided date or default to today
      }));

      const { data, error } = await supabase
        .from('questions')
        .insert(questionsToInsert)
        .select();

      if (error) {
        console.error('Upload error:', error);
        toast.error(`Upload failed: ${error.message}`);
      } else {
        toast.success(`Successfully uploaded ${data?.length || 0} questions!`);
        setJsonInput('');
        setValidationResult(null);
        
        // Refresh the list
        const { data: refreshed } = await supabase
          .from('questions')
          .select('id, question, difficulty, category, is_active, active_from')
          .order('difficulty', { ascending: true })
          .order('created_at', { ascending: false });
        setExistingQuestions(refreshed || []);
      }
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Upload failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeactivateAll = async () => {
    if (!confirm('Are you sure you want to deactivate ALL questions?')) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('questions')
        .update({ is_active: false })
        .eq('is_active', true);

      if (error) throw error;
      
      toast.success('All questions deactivated');
      setExistingQuestions(prev => prev.map(q => ({ ...q, is_active: false })));
    } catch (err) {
      console.error('Deactivate error:', err);
      toast.error('Failed to deactivate questions');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleQuestionActive = async (id: string, currentlyActive: boolean) => {
    try {
      const { error } = await supabase
        .from('questions')
        .update({ is_active: !currentlyActive })
        .eq('id', id);

      if (error) throw error;
      
      setExistingQuestions(prev => 
        prev.map(q => q.id === id ? { ...q, is_active: !currentlyActive } : q)
      );
      toast.success(currentlyActive ? 'Question deactivated' : 'Question activated');
    } catch (err) {
      console.error('Toggle error:', err);
      toast.error('Failed to update question');
    }
  };

  // Show loading while checking admin status
  if (isAdmin === undefined) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not authorized
  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen gradient-hero pb-8">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-4 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Shield className="w-6 h-6 text-primary" />
        <h1 className="text-xl font-display font-bold">Admin: Questions</h1>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Upload Section */}
        <section className="bg-card rounded-xl border border-border p-5 space-y-4">
          <h2 className="text-lg font-display font-bold flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            Upload New Questions
          </h2>
          
          <div className="text-sm text-muted-foreground bg-secondary/50 rounded-lg p-3">
            <p className="font-medium mb-2">Expected JSON format:</p>
            <pre className="text-xs overflow-x-auto whitespace-pre-wrap">{SAMPLE_FORMAT}</pre>
          </div>

          <Textarea
            value={jsonInput}
            onChange={(e) => {
              setJsonInput(e.target.value);
              setValidationResult(null);
            }}
            placeholder="Paste your questions JSON here..."
            className="min-h-[200px] font-mono text-sm"
          />

          {/* Validation Result */}
          {validationResult && (
            <div className={cn(
              'p-3 rounded-lg border',
              validationResult.valid 
                ? 'bg-success/10 border-success/30 text-success' 
                : 'bg-destructive/10 border-destructive/30 text-destructive'
            )}>
              {validationResult.valid ? (
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  <span className="font-medium">Valid JSON - ready to upload!</span>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    <span className="font-medium">Validation Errors:</span>
                  </div>
                  <ul className="text-xs space-y-1 ml-6 list-disc">
                    {validationResult.errors.slice(0, 5).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                    {validationResult.errors.length > 5 && (
                      <li>...and {validationResult.errors.length - 5} more errors</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={handleValidate}
              disabled={!jsonInput.trim()}
            >
              <Check className="w-4 h-4" />
              Validate
            </Button>
            <Button 
              variant="gold" 
              onClick={handleUpload}
              disabled={!validationResult?.valid || isLoading}
            >
              {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Upload Questions
            </Button>
          </div>
        </section>

        {/* Existing Questions */}
        <section className="bg-card rounded-xl border border-border p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-display font-bold">
              Existing Questions ({existingQuestions.length})
            </h2>
            <Button 
              variant="destructive" 
              size="sm"
              onClick={handleDeactivateAll}
              disabled={isLoading}
            >
              <Trash2 className="w-4 h-4" />
              Deactivate All
            </Button>
          </div>

          {isLoadingQuestions ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : existingQuestions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No questions found. Upload some above!
            </p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {existingQuestions.map((q) => (
                <div 
                  key={q.id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border transition-colors',
                    q.is_active 
                      ? 'bg-success/5 border-success/20' 
                      : 'bg-secondary/30 border-border opacity-60'
                  )}
                >
                  <button
                    onClick={() => toggleQuestionActive(q.id, q.is_active)}
                    className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors',
                      q.is_active 
                        ? 'bg-success text-success-foreground' 
                        : 'bg-secondary text-muted-foreground'
                    )}
                  >
                    {q.is_active && <Check className="w-3 h-3" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{q.question}</p>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      <span>Difficulty: {q.difficulty}</span>
                      <span>•</span>
                      <span>{q.category}</span>
                      <span>•</span>
                      <span className="text-primary">{q.active_from}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Admin;
