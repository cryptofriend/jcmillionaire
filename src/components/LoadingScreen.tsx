import { JackieIcon } from '@/components/icons/JackieIcon';
import { Loader2 } from 'lucide-react';

const LoadingScreen = () => {
  return (
    <div className="min-h-screen gradient-hero flex flex-col items-center justify-center gap-6">
      <JackieIcon size={80} className="animate-float" />
      <div className="flex items-center gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <span className="text-muted-foreground font-medium">Loading...</span>
      </div>
    </div>
  );
};

export default LoadingScreen;
