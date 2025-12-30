import React, { useState } from 'react';
import { Play } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrailerCardProps {
  onDismiss: () => void;
  activeTab: 'story' | 'referral';
  onTabChange: (tab: 'story' | 'referral') => void;
}

const YOUTUBE_VIDEO_ID = 'zn09NIJB92k';

export const TrailerCard: React.FC<TrailerCardProps> = ({ onDismiss, activeTab, onTabChange }) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const thumbnailUrl = `https://img.youtube.com/vi/${YOUTUBE_VIDEO_ID}/maxresdefault.jpg`;

  return (
    <div className="px-4 py-3 bg-card rounded-xl border border-border shadow-soft space-y-3">
      {/* Header */}
      <div className="text-center">
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

      {/* Toggle Switches */}
      <div className="flex justify-center">
        <div className="inline-flex bg-secondary rounded-full p-1">
          <button
            onClick={() => onTabChange('story')}
            className={cn(
              "px-4 py-1.5 text-sm font-medium rounded-full transition-all",
              activeTab === 'story'
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Story
          </button>
          <button
            onClick={() => {
              onTabChange('referral');
              onDismiss();
            }}
            className={cn(
              "px-4 py-1.5 text-sm font-medium rounded-full transition-all",
              activeTab === 'referral'
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Referral
          </button>
        </div>
      </div>
    </div>
  );
};
