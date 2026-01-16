import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Podcast {
  id: string;
  youtube_url: string;
  youtube_id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  created_at: string | null;
}

export function usePodcasts() {
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPodcasts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('podcasts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching podcasts:', error);
    } else {
      setPodcasts(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPodcasts();
  }, [fetchPodcasts]);

  return { podcasts, loading, refetch: fetchPodcasts };
}
