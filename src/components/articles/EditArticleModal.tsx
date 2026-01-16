import { useState, useRef, useEffect } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { Send, Image, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Article } from '@/types';

interface EditArticleModalProps {
  isOpen: boolean;
  onClose: () => void;
  article: Article | null;
  onSave: (articleId: string, updates: any) => Promise<boolean>;
}

export function EditArticleModal({ isOpen, onClose, article, onSave }: EditArticleModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    topic: '',
    body: '',
    media_url: '',
    is_anonymous: false,
    sources: '',
  });
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'youtube' | 'video' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (article) {
      setFormData({
        title: article.title || '',
        topic: (article as any).topic || '',
        body: article.body || '',
        media_url: article.media_url || '',
        is_anonymous: article.is_anonymous || false,
        sources: article.sources?.join(', ') || '',
      });
      setMediaPreview(article.media_url || null);
      setMediaType(article.media_type as 'image' | 'youtube' | 'video' | null);
    }
  }, [article]);

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
    
    if (!formData.title.trim()) {
      toast.error('Введите заголовок статьи');
      return;
    }
    
    if (!formData.body.trim()) {
      toast.error('Введите текст статьи');
      return;
    }

    if (!article) return;

    setLoading(true);
    const success = await onSave(article.id, {
      title: formData.title.trim(),
      topic: formData.topic.trim() || undefined,
      body: formData.body.trim(),
      media_url: formData.media_url || undefined,
      is_anonymous: formData.is_anonymous,
      sources: formData.sources ? formData.sources.split(',').map(s => s.trim()).filter(Boolean) : undefined,
    });

    if (success) {
      onClose();
    }
    setLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Редактировать статью</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Topic */}
          <div className="space-y-2">
            <Label>Тема (пару слов о чём статья)</Label>
            <Input
              value={formData.topic}
              onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
              placeholder="Например: мотивация, успех"
              maxLength={100}
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
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <Image className="h-4 w-4" />
                Загрузить фото или видео
              </Button>
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

          {/* Toggles */}
          <div className="rounded-xl bg-secondary/50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Анонимная публикация</Label>
                <p className="text-xs text-muted-foreground">
                  Ваше имя не будет отображаться
                </p>
              </div>
              <Switch
                checked={formData.is_anonymous}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_anonymous: checked })
                }
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            После редактирования статья будет отправлена на повторную модерацию
          </p>

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
