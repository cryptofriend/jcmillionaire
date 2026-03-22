import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrailerCardProps {
  onDismiss: () => void;
  activeTab: 'story' | 'referral';
  onTabChange: (tab: 'story' | 'referral') => void;
}

const EPISODES = [
  { title: 'Trailer', type: 'youtube' as const, videoId: 'GVCSKeS-GfI' },
  { title: 'Ep 1.1', type: 'tweet' as const, tweetId: '2026298838999593426' },
  { title: 'Ep 1.2', type: 'tweet' as const, tweetId: '2026641489732985104' },
  { title: 'Ep 1.3', type: 'tweet' as const, tweetId: '2029574483707855000' },
];

export const TrailerCard: React.FC<TrailerCardProps> = ({ onDismiss, activeTab, onTabChange }) => {
  const { t } = useTranslation();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentEpisode, setCurrentEpisode] = useState(0);

  const episode = EPISODES[currentEpisode];
  const thumbnailUrl = episode.type === 'youtube'
    ? `https://img.youtube.com/vi/${episode.videoId}/maxresdefault.jpg`
    : '';

  const prev = () => {
    setCurrentEpisode((p) => (p - 1 + EPISODES.length) % EPISODES.length);
    setIsPlaying(false);
  };
  const next = () => {
    setCurrentEpisode((p) => (p + 1) % EPISODES.length);
    setIsPlaying(false);
  };

  return (
    <div className="px-4 py-3 bg-card rounded-xl border border-border shadow-soft space-y-3">
      {/* Header with navigation */}
      <div className="flex items-center justify-between">
        <button onClick={prev} className="p-1.5 rounded-full bg-secondary border border-border hover:bg-muted transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-center">
          <h3 className="font-display font-bold text-sm text-foreground">
            🎬 {episode.title}
          </h3>
          <span className="text-xs text-muted-foreground">{currentEpisode + 1} / {EPISODES.length}</span>
        </div>
        <button onClick={next} className="p-1.5 rounded-full bg-secondary border border-border hover:bg-muted transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Video Container */}
      <div className="relative w-full aspect-[9/16] max-h-[400px] mx-auto rounded-lg overflow-hidden bg-secondary">
        {episode.type === 'youtube' ? (
          isPlaying ? (
            <iframe
              src={`https://www.youtube.com/embed/${episode.videoId}?autoplay=1&rel=0&modestbranding=1`}
              title={episode.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
          ) : (
            <button
              onClick={() => setIsPlaying(true)}
              className="absolute inset-0 w-full h-full group cursor-pointer"
            >
              <img
                src={thumbnailUrl}
                alt="Trailer thumbnail"
                width={360}
                height={640}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = `https://img.youtube.com/vi/${(episode as any).videoId}/hqdefault.jpg`;
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Play className="w-8 h-8 text-primary-foreground ml-1" fill="currentColor" />
                </div>
              </div>
            </button>
          )
        ) : (
          <iframe
            src={`https://platform.x.com/embed/Tweet.html?id=${episode.tweetId}&theme=dark`}
            className="absolute inset-0 w-full h-full border-0"
            allowFullScreen
            loading="lazy"
          />
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
            {t('trailer.story')}
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
            {t('trailer.referral')}
          </button>
        </div>
      </div>
    </div>
  );
};
