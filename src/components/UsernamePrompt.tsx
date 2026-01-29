import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, User, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UsernamePromptProps {
  open: boolean;
  userId: string;
  onComplete: (username: string) => void;
  onSkip: () => void;
}

export const UsernamePrompt: React.FC<UsernamePromptProps> = ({
  open,
  userId,
  onComplete,
  onSkip,
}) => {
  const [username, setUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const validateUsername = (value: string): string | null => {
    if (value.length < 3) {
      return 'Username must be at least 3 characters';
    }
    if (value.length > 20) {
      return 'Username must be 20 characters or less';
    }
    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
      return 'Only letters, numbers, and underscores allowed';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedUsername = username.trim();
    const validationError = validateUsername(trimmedUsername);
    
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // Check if username is already taken
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('username', trimmedUsername)
        .neq('id', userId)
        .maybeSingle();

      if (checkError) {
        throw new Error('Failed to check username availability');
      }

      if (existingUser) {
        setError('This username is already taken');
        setIsSubmitting(false);
        return;
      }

      // Update user with username
      const { error: updateError } = await supabase
        .from('users')
        .update({ username: trimmedUsername })
        .eq('id', userId);

      if (updateError) {
        throw new Error('Failed to save username');
      }

      toast.success('Username saved!');
      onComplete(trimmedUsername);
    } catch (err) {
      console.error('Error saving username:', err);
      setError(err instanceof Error ? err.message : 'Failed to save username');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUsername(value);
    if (error) {
      setError('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Choose Your Username
          </DialogTitle>
          <DialogDescription>
            This will be displayed on the leaderboard. You can change it later in your profile.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="username"
                placeholder="Enter username"
                value={username}
                onChange={handleInputChange}
                className="pl-10"
                autoFocus
                maxLength={20}
                disabled={isSubmitting}
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <p className="text-xs text-muted-foreground">
              3-20 characters. Letters, numbers, and underscores only.
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="ghost"
              className="flex-1"
              onClick={onSkip}
              disabled={isSubmitting}
            >
              Skip for now
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isSubmitting || username.trim().length < 3}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                'Save Username'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
