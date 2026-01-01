import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PodcastCardPodcast {
  id: string;
  youtube_url: string;
  youtube_id: string;
  title: string;
  description?: string | null;
  thumbnail_url?: string | null;
  duration?: string;
  channel_name?: string;
  created_at?: string;
}

interface PodcastCardProps {
  podcast: PodcastCardPodcast;
  onPlay: (podcast: PodcastCardPodcast) => void;
  className?: string;
  style?: React.CSSProperties;
}

export function PodcastCard({ podcast, onPlay, className, style }: PodcastCardProps) {
  return (
    <div
      className={cn(
        'group relative flex w-[280px] flex-shrink-0 flex-col overflow-hidden rounded-xl bg-secondary/50 transition-smooth hover:bg-secondary',
        className
      )}
      style={style}
    >
      {/* 16:9 aspect ratio for full YouTube thumbnail */}
      <div className="relative aspect-video overflow-hidden rounded-t-xl">
        <img
          src={podcast.thumbnail_url || `https://img.youtube.com/vi/${podcast.youtube_id}/maxresdefault.jpg`}
          alt={podcast.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            e.currentTarget.src = `https://img.youtube.com/vi/${podcast.youtube_id}/hqdefault.jpg`;
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center bg-background/40 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            size="icon"
            className="h-12 w-12 rounded-full shadow-elevated"
            onClick={() => onPlay(podcast)}
          >
            <Play className="h-5 w-5 fill-current" />
          </Button>
        </div>
      </div>

      <div className="p-3">
        <h3 className="mb-1 line-clamp-2 text-sm font-medium leading-tight">
          {podcast.title}
        </h3>
        {podcast.description && (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {podcast.description}
          </p>
        )}
      </div>
    </div>
  );
}
