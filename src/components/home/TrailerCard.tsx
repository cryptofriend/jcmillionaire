import React, { useState } from 'react';
import { X, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TrailerCardProps {
  onDismiss: () => void;
}

const YOUTUBE_VIDEO_ID = 'zn09NIJB92k';

export const TrailerCard: React.FC<TrailerCardProps> = ({ onDismiss }) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const thumbnailUrl = `https://img.youtube.com/vi/${YOUTUBE_VIDEO_ID}/maxresdefault.jpg`;

  return (
    <div className="px-4 py-3 bg-card rounded-xl border border-border shadow-soft space-y-3 relative">
      {/* Close button */}
      <button
        onClick={onDismiss}
        className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-background/80 hover:bg-background transition-colors"
        aria-label="Close trailer"
      >
        <X className="w-4 h-4 text-muted-foreground" />
      </button>

      {/* Header */}
      <div className="text-center pr-6">
        <h3 className="font-display font-bold text-lg text-foreground">
          🎬 Watch the Trailer!
        </h3>
        <p className="text-xs text-muted-foreground">
          See how Jackie Chain works
        </p>
      </div>

      {/* Video Container - 9:16 aspect ratio for Shorts */}
      <div className="relative w-full aspect-[9/16] max-h-[400px] mx-auto rounded-lg overflow-hidden bg-secondary">
        {isPlaying ? (
          <iframe
            src={`https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}?autoplay=1&rel=0&modestbranding=1`}
            title="Jackie Chain Trailer"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        ) : (
          <button
            onClick={() => setIsPlaying(true)}
            className="absolute inset-0 w-full h-full group cursor-pointer"
          >
            {/* Thumbnail */}
            <img
              src={thumbnailUrl}
              alt="Trailer thumbnail"
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to hqdefault if maxres not available
                e.currentTarget.src = `https://img.youtube.com/vi/${YOUTUBE_VIDEO_ID}/hqdefault.jpg`;
              }}
            />
            
            {/* Play button overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
              <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Play className="w-8 h-8 text-primary-foreground ml-1" fill="currentColor" />
              </div>
            </div>
          </button>
        )}
      </div>

      {/* Skip button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onDismiss}
        className="w-full text-muted-foreground"
      >
        Skip & show referral link
      </Button>
    </div>
  );
};
