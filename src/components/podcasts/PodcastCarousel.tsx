import { useState, useRef } from 'react';
import { Headphones } from 'lucide-react';
import { PodcastCard } from './PodcastCard';
import { PodcastPlayerModal } from './PodcastPlayerModal';
import { cn } from '@/lib/utils';
import { usePodcasts, Podcast } from '@/hooks/use-podcasts';
import { Skeleton } from '@/components/ui/skeleton';

interface PodcastCarouselProps {
  title: string;
  className?: string;
}

export function PodcastCarousel({ title, className }: PodcastCarouselProps) {
  const [selectedPodcast, setSelectedPodcast] = useState<Podcast | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { podcasts, loading } = usePodcasts();

  const handlePlay = (podcast: Podcast) => {
    setSelectedPodcast(podcast);
  };

  return (
    <>
      <section className={cn('px-4', className)}>
        <div className="rounded-2xl bg-card p-4">
          <div className="mb-4 flex items-center gap-2">
            <Headphones className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-heading text-lg font-semibold">{title}</h2>
          </div>

          <div
            ref={scrollRef}
            className="scrollbar-hide -mx-2 flex gap-3 overflow-x-auto px-2 pb-2"
          >
            {loading ? (
              <>
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-40 w-48 flex-shrink-0 rounded-xl" />
                ))}
              </>
            ) : podcasts.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground w-full">
                <p>Подкасты пока не добавлены</p>
              </div>
            ) : (
              podcasts.map((podcast, index) => (
                <PodcastCard
                  key={podcast.id}
                  podcast={podcast}
                  onPlay={() => handlePlay(podcast)}
                  className="animate-slide-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                />
              ))
            )}
          </div>
        </div>
      </section>

      <PodcastPlayerModal
        podcast={selectedPodcast}
        isOpen={!!selectedPodcast}
        onClose={() => setSelectedPodcast(null)}
      />
    </>
  );
}
