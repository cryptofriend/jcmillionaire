import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AnswerBannerProps {
  isCorrect: boolean;
  show: boolean;
  onHide?: () => void;
  duration?: number;
}

export const AnswerBanner: React.FC<AnswerBannerProps> = ({
  isCorrect,
  show,
  onHide,
  duration = 1200,
}) => {
  const [visible, setVisible] = useState(show);

  useEffect(() => {
    if (show) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onHide?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration, onHide]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -20 }}
          transition={{ type: 'spring', damping: 15, stiffness: 300 }}
          className={cn(
            'fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50',
            'px-8 py-6 rounded-2xl shadow-2xl',
            'flex flex-col items-center gap-3',
            isCorrect 
              ? 'bg-success text-success-foreground' 
              : 'bg-destructive text-destructive-foreground'
          )}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: 'spring', damping: 10 }}
            className={cn(
              'w-16 h-16 rounded-full flex items-center justify-center',
              isCorrect ? 'bg-success-foreground/20' : 'bg-destructive-foreground/20'
            )}
          >
            {isCorrect ? (
              <Check className="w-10 h-10" strokeWidth={3} />
            ) : (
              <X className="w-10 h-10" strokeWidth={3} />
            )}
          </motion.div>
          <span className="text-2xl font-display font-bold">
            {isCorrect ? 'Correct!' : 'Wrong!'}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
