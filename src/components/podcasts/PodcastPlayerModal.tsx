import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PodcastPlayerPodcast {
  id: string;
  youtube_url: string;
  youtube_id: string;
  title: string;
  description?: string | null;
  thumbnail_url?: string | null;
  created_at?: string | null;
}

interface PodcastPlayerModalProps {
  podcast: PodcastPlayerPodcast | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PodcastPlayerModal({ podcast, isOpen, onClose }: PodcastPlayerModalProps) {
  if (!isOpen || !podcast) return null;

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
          <iframe
            src={`https://www.youtube.com/embed/${podcast.youtube_id}?autoplay=1&rel=0`}
            title={podcast.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        </div>

        {podcast.description && (
          <div className="p-4">
            <p className="text-sm text-muted-foreground">{podcast.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}
