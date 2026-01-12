import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';
import { hapticTap, hapticSuccess } from '@/lib/haptics';
import { toast } from '@/hooks/use-toast';

interface RatingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const RatingDialog: React.FC<RatingDialogProps> = ({ open, onOpenChange }) => {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const handleRatingClick = (value: number) => {
    hapticTap();
    setRating(value);
  };

  const handleSubmit = () => {
    if (rating === 0) {
      toast({
        title: "Please select a rating",
        description: "Tap the stars to rate your experience",
        variant: "destructive",
      });
      return;
    }

    hapticSuccess();
    setSubmitted(true);
    
    // Reset after showing thank you message
    setTimeout(() => {
      onOpenChange(false);
      setTimeout(() => {
        setSubmitted(false);
        setRating(0);
      }, 300);
    }, 2000);
  };

  const displayRating = hoveredRating || rating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">
            {submitted ? "Thank You! 🎉" : "Rate Your Experience"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {submitted 
              ? "Your feedback helps us improve!"
              : "How are you enjoying Jackie Chain?"}
          </DialogDescription>
        </DialogHeader>
        
        {!submitted ? (
          <div className="flex flex-col items-center gap-6 py-4">
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  onClick={() => handleRatingClick(value)}
                  onMouseEnter={() => setHoveredRating(value)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="p-1 transition-transform hover:scale-110 active:scale-95"
                >
                  <Star
                    size={36}
                    className={`transition-colors ${
                      value <= displayRating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-muted-foreground'
                    }`}
                  />
                </button>
              ))}
            </div>
            
            <p className="text-sm text-muted-foreground h-5">
              {displayRating === 1 && "Poor"}
              {displayRating === 2 && "Fair"}
              {displayRating === 3 && "Good"}
              {displayRating === 4 && "Great"}
              {displayRating === 5 && "Excellent!"}
            </p>
            
            <Button 
              onClick={handleSubmit}
              className="w-full"
              disabled={rating === 0}
            >
              Submit Rating
            </Button>
          </div>
        ) : (
          <div className="flex justify-center py-8">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <Star
                  key={value}
                  size={32}
                  className={`${
                    value <= rating
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-muted-foreground'
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
