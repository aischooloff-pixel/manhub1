import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { mockCategories } from '@/data/mockData';
import { Send, Image, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useArticles } from '@/hooks/use-articles';
import { UpgradeToPlusModal } from '@/components/profile/UpgradeToPlusModal';

interface CreateArticleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onDailyLimitReached?: () => void;
}

// Extract video thumbnail from various platforms
function extractVideoThumbnail(url: string): string | null {
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) {
    return `https://img.youtube.com/vi/${ytMatch[1]}/maxresdefault.jpg`;
  }
  
  // Vimeo - would need API call, return null for now
  // TikTok, Instagram, etc. - complex, return null
  return null;
}

export function CreateArticleModal({ isOpen, onClose, onSuccess, onDailyLimitReached }: CreateArticleModalProps) {
  const { createArticle, loading } = useArticles();
  const [formData, setFormData] = useState({
    category_id: '',
    title: '',
    topic: '',
    body: '',
    media_url: '',
    sources: '',
  });
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'youtube' | 'video' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Handle image files
      if (file.type.startsWith('image/')) {
        if (file.size > 5 * 1024 * 1024) {
          toast.error('Размер изображения не должен превышать 5 МБ');
          return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          setMediaPreview(base64);
          setMediaType('image');
          setFormData({ ...formData, media_url: base64 });
        };
        reader.readAsDataURL(file);
      }
      // Handle video files
      else if (file.type.startsWith('video/')) {
        if (file.size > 50 * 1024 * 1024) {
          toast.error('Размер видео не должен превышать 50 МБ');
          return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          setMediaPreview(base64);
          setMediaType('video');
          setFormData({ ...formData, media_url: base64 });
        };
        reader.readAsDataURL(file);
      } else {
        toast.error('Можно загружать только изображения или видео');
      }
    }
  };


  const handleMediaUrlChange = (url: string) => {
    const thumbnail = extractVideoThumbnail(url);
    if (thumbnail) {
      setMediaPreview(thumbnail);
      setMediaType('youtube');
      // Extract YouTube ID
      const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
      setFormData({ ...formData, media_url: ytMatch ? ytMatch[1] : url });
    } else if (url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      setMediaPreview(url);
      setMediaType('image');
      setFormData({ ...formData, media_url: url });
    } else {
      setFormData({ ...formData, media_url: url });
    }
  };

  const clearMedia = () => {
    setMediaPreview(null);
    setMediaType(null);
    setFormData({ ...formData, media_url: '' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.topic.trim()) {
      toast.error('Укажите тему статьи');
      return;
    }

    if (!formData.title.trim()) {
      toast.error('Введите заголовок статьи');
      return;
    }
    
    if (!formData.body.trim()) {
      toast.error('Введите текст статьи');
      return;
    }

    const sourcesArray = formData.sources.trim() 
      ? formData.sources.split(',').map(s => s.trim()).filter(Boolean)
      : undefined;

    const result = await createArticle({
      category_id: formData.category_id,
      title: formData.title.trim(),
      topic: formData.topic.trim() || undefined,
      body: formData.body.trim(),
      media_url: formData.media_url.trim() || undefined,
      media_type: mediaType || undefined,
      is_anonymous: false,
      allow_comments: true,
      sources: sourcesArray,
    });

    // Check for daily limit error
    if (result?.error === 'daily_limit_reached') {
      onClose();
      onDailyLimitReached?.();
      return;
    }

    if (result?.article) {
      onClose();
      onSuccess?.();
      setFormData({
        category_id: '',
        title: '',
        topic: '',
        body: '',
        media_url: '',
        sources: '',
      });
      setMediaPreview(null);
      setMediaType(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg z-[150]">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Новая статья</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category */}
          <div className="space-y-2">
            <Label>Категория</Label>
            <Select
              value={formData.category_id}
              onValueChange={(value) =>
                setFormData({ ...formData, category_id: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите категорию" />
              </SelectTrigger>
              <SelectContent>
                {mockCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Topic */}
          <div className="space-y-2">
            <Label>Тема (пару слов о чём статья) *</Label>
            <Input
              value={formData.topic}
              onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
              placeholder="Например: мотивация, успех"
              maxLength={100}
              required
            />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label>Заголовок *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Введите заголовок статьи"
              maxLength={200}
            />
          </div>

          {/* Body */}
          <div className="space-y-2">
            <Label>Текст статьи *</Label>
            <Textarea
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              placeholder="Напишите вашу статью..."
              rows={8}
            />
            <p className="text-xs text-muted-foreground text-right">
              {formData.body.length} символов
            </p>
          </div>

          {/* Media */}
          <div className="space-y-2">
            <Label>Медиа (опционально)</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {mediaPreview ? (
              <div className="relative rounded-xl border border-border overflow-hidden aspect-[4/3]">
                {mediaType === 'video' ? (
                  <video
                    src={mediaPreview}
                    className="w-full h-full object-cover"
                    controls
                  />
                ) : (
                  <img
                    src={mediaPreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                )}
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={clearMedia}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={formData.media_url}
                  onChange={(e) => handleMediaUrlChange(e.target.value)}
                  placeholder="Вставьте ссылку на видео YouTube"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  title="Загрузить фото или видео"
                >
                  <Image className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Sources */}
          <div className="space-y-2">
            <Label>Источники (опционально)</Label>
            <Input
              value={formData.sources}
              onChange={(e) => setFormData({ ...formData, sources: e.target.value })}
              placeholder="Ссылки на источники через запятую"
            />
          </div>

          {/* Submit */}
          <Button type="submit" className="w-full gap-2" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Отправка...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Отправить на модерацию
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
