import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VideoPlayer } from '@/components/ui/VideoPlayer';
import { cn } from '@/lib/utils';

interface PodcastPlayerPodcast {
  id: string;
  youtube_url: string;
  youtube_id: string;
  title: string;
  description?: string | null;
  thumbnail_url?: string | null;
  video_url?: string | null;
  created_at?: string | null;
}

interface PodcastPlayerModalProps {
  podcast: PodcastPlayerPodcast | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PodcastPlayerModal({ podcast, isOpen, onClose }: PodcastPlayerModalProps) {
  if (!isOpen || !podcast) return null;

  // Use self-hosted video if available, otherwise fallback to YouTube
  const hasVideoFile = !!podcast.video_url;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={cn(
          'relative z-10 w-full max-w-3xl overflow-hidden rounded-lg bg-card shadow-elevated animate-scale-in'
        )}
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <h3 className="font-heading text-lg font-semibold line-clamp-1">
            {podcast.title}
          </h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="aspect-video w-full">
          {hasVideoFile ? (
            <VideoPlayer
              src={podcast.video_url!}
              poster={podcast.thumbnail_url || undefined}
              title={podcast.title}
              autoPlay
              className="h-full w-full"
            />
          ) : (
            <iframe
              src={`https://www.youtube.com/embed/${podcast.youtube_id}?autoplay=1&rel=0`}
              title={podcast.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
            />
          )}
        </div>

        {podcast.description && (
          <div className="p-4">
            <p className="text-sm text-muted-foreground">{podcast.description}</p>
          </div>
        )}

        {hasVideoFile && (
          <div className="px-4 pb-4">
            <span className="inline-flex items-center gap-1.5 text-xs text-primary bg-primary/10 px-2 py-1 rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Работает без VPN
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
