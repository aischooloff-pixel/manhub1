import { useState, useEffect, useRef } from 'react';
import { X, Plus, Package, Trash2, ExternalLink, Edit2, Image, Youtube, Upload, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useTelegram } from '@/hooks/use-telegram';
import { toast } from 'sonner';
import { PodcastPlayerModal } from '@/components/podcasts/PodcastPlayerModal';

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  media_url: string | null;
  media_type: string | null;
  link: string | null;
  is_active: boolean;
  status: string;
  rejection_reason: string | null;
  created_at: string;
}

interface ProductsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfileId: string;
}

export function ProductsModal({ isOpen, onClose, userProfileId }: ProductsModalProps) {
  const { webApp } = useTelegram();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    currency: 'RUB',
    media_url: '',
    link: '',
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [videoPlayerOpen, setVideoPlayerOpen] = useState(false);
  const [videoToPlay, setVideoToPlay] = useState<{ id: string; title: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && userProfileId) {
      loadProducts();
    }
  }, [isOpen, userProfileId]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const initData = webApp?.initData;
      if (!initData) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('tg-manage-product', {
        body: { initData, action: 'list' },
      });
      
      if (!error && data?.products) {
        setProducts(data.products as Product[]);
      }
    } catch (err) {
      console.error('Error loading products:', err);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      price: '',
      currency: 'RUB',
      media_url: '',
      link: '',
    });
    setIsCreating(false);
    setEditingProduct(null);
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.description.trim() || !formData.price) {
      toast.error('Заполните обязательные поля');
      return;
    }

    const initData = webApp?.initData;
    if (!initData) {
      toast.error('Ошибка авторизации');
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('tg-manage-product', {
        body: {
          initData,
          action: editingProduct ? 'update' : 'create',
          productId: editingProduct?.id,
          product: {
            title: formData.title.trim(),
            description: formData.description.trim(),
            price: parseFloat(formData.price),
            currency: formData.currency,
            media_url: formData.media_url.trim() || null,
            link: formData.link.trim() || null,
          },
        },
      });

      if (error) throw error;

      toast.success(editingProduct ? 'Продукт обновлён' : 'Продукт добавлен');
      resetForm();
      loadProducts();
    } catch (err) {
      console.error('Error saving product:', err);
      toast.error('Ошибка сохранения');
    }
    setSaving(false);
  };

  const handleDelete = async (productId: string) => {
    const initData = webApp?.initData;
    if (!initData) return;

    try {
      const { error } = await supabase.functions.invoke('tg-manage-product', {
        body: {
          initData,
          action: 'delete',
          productId,
        },
      });

      if (error) throw error;

      toast.success('Продукт удалён');
      loadProducts();
    } catch (err) {
      console.error('Error deleting product:', err);
      toast.error('Ошибка удаления');
    }
  };

  const startEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      title: product.title,
      description: product.description,
      price: product.price.toString(),
      currency: product.currency,
      media_url: product.media_url || '',
      link: product.link || '',
    });
    setIsCreating(true);
  };

  const getMediaType = (url: string): 'youtube' | 'image' | null => {
    if (!url) return null;
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    return 'image';
  };

  const extractYoutubeId = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const getYoutubeThumbnail = (url: string): string | null => {
    const videoId = extractYoutubeId(url);
    if (videoId) {
      return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
    }
    return null;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const initData = webApp?.initData;
    if (!initData) {
      toast.error('Ошибка авторизации');
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Поддерживаются только изображения (JPEG, PNG, GIF, WebP)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Максимальный размер файла: 5 МБ');
      return;
    }

    setUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('initData', initData);
      formDataUpload.append('file', file);

      const { data, error } = await supabase.functions.invoke('tg-upload-product-media', {
        body: formDataUpload,
      });

      if (error) throw error;
      if (data?.url) {
        setFormData({ ...formData, media_url: data.url });
        toast.success('Изображение загружено');
      }
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Ошибка загрузки');
    }
    setUploading(false);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePlayVideo = (url: string) => {
    const videoId = extractYoutubeId(url);
    if (videoId) {
      setVideoToPlay({ id: videoId, title: 'Видео продукта' });
      setVideoPlayerOpen(true);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-fade-in" onClick={onClose} />

      <div
        className={cn(
          'absolute inset-x-0 bottom-0 max-h-[90vh] overflow-y-auto rounded-t-2xl bg-card animate-slide-up',
          'md:inset-auto md:left-1/2 md:top-1/2 md:w-full md:max-w-lg md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-lg'
        )}
      >
        <div className="sticky top-0 z-10 flex justify-center bg-card pt-3 md:hidden">
          <div className="h-1 w-12 rounded-full bg-border" />
        </div>

        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <h2 className="font-heading text-lg font-semibold">Мои продукты</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-4">
          {isCreating ? (
            <div className="space-y-4">
              <h3 className="font-medium">{editingProduct ? 'Редактировать' : 'Новый продукт'}</h3>
              
              <div>
                <label className="text-sm text-muted-foreground">Название *</label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Название продукта"
                  maxLength={100}
                />
              </div>

              <div>
                <label className="text-sm text-muted-foreground">Описание *</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Что входит в продукт..."
                  rows={4}
                  maxLength={1000}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-muted-foreground">Цена *</label>
                  <Input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="1990"
                    min="0"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Валюта</label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="RUB">₽ RUB</option>
                    <option value="USD">$ USD</option>
                    <option value="EUR">€ EUR</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm text-muted-foreground">Медиа</label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={formData.media_url}
                      onChange={(e) => setFormData({ ...formData, media_url: e.target.value })}
                      placeholder="Ссылка на изображение или YouTube..."
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                  {formData.media_url && (
                    <div className="relative rounded-lg overflow-hidden bg-secondary h-32">
                      {getMediaType(formData.media_url) === 'youtube' ? (
                        <div 
                          className="w-full h-full relative cursor-pointer group"
                          onClick={() => handlePlayVideo(formData.media_url)}
                        >
                          <img
                            src={getYoutubeThumbnail(formData.media_url) || ''}
                            alt="YouTube Preview"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors">
                            <Play className="h-8 w-8 text-white" fill="white" />
                          </div>
                        </div>
                      ) : (
                        <img
                          src={formData.media_url}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      )}
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6"
                        onClick={() => setFormData({ ...formData, media_url: '' })}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Загрузите изображение или вставьте ссылку на YouTube видео
                  </p>
                </div>
              </div>

              {/* Link field removed - products go to moderation */}

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={resetForm}>
                  Отмена
                </Button>
                <Button className="flex-1" onClick={handleSave} disabled={saving}>
                  {saving ? 'Сохранение...' : 'Сохранить'}
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Premium users can add max 1 product */}
              {products.length < 1 && (
                <Button
                  onClick={() => setIsCreating(true)}
                  className="w-full mb-4 gap-2"
                  variant="outline"
                >
                  <Plus className="h-4 w-4" />
                  Добавить продукт
                </Button>
              )}
              {products.length >= 1 && (
                <div className="mb-4 text-center text-sm text-muted-foreground">
                  Максимум 1 продукт для Premium подписки
                </div>
              )}

              {loading ? (
                <div className="py-8 text-center text-muted-foreground">Загрузка...</div>
              ) : products.length === 0 ? (
                <div className="py-8 text-center">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">У вас пока нет продуктов</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Добавьте свой первый продукт для продажи
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {products.map((product) => (
                    <div
                      key={product.id}
                      className={cn(
                        "rounded-xl border p-4",
                        product.status === 'pending' ? "border-yellow-500/50 bg-yellow-500/5" :
                        product.status === 'rejected' ? "border-destructive/50 bg-destructive/5" :
                        "border-border"
                      )}
                    >
                      {/* Status badge */}
                      {product.status === 'pending' && (
                        <div className="mb-2 flex items-center gap-1.5 text-xs text-yellow-600">
                          <span className="h-1.5 w-1.5 rounded-full bg-yellow-500 animate-pulse" />
                          На модерации
                        </div>
                      )}
                      {product.status === 'rejected' && (
                        <div className="mb-2">
                          <div className="flex items-center gap-1.5 text-xs text-destructive">
                            <X className="h-3 w-3" />
                            Отклонён
                          </div>
                          {product.rejection_reason && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              Причина: {product.rejection_reason}
                            </p>
                          )}
                        </div>
                      )}
                      <div className="flex items-start gap-3">
                        {product.media_url && (
                          <div 
                            className="w-16 h-16 rounded-lg bg-secondary flex-shrink-0 overflow-hidden cursor-pointer"
                            onClick={() => {
                              if (product.media_type === 'youtube' && product.media_url) {
                                handlePlayVideo(product.media_url);
                              }
                            }}
                          >
                            {product.media_type === 'youtube' ? (
                              <div className="w-full h-full relative group">
                                <img
                                  src={getYoutubeThumbnail(product.media_url!) || ''}
                                  alt={product.title}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors">
                                  <Play className="h-5 w-5 text-white" fill="white" />
                                </div>
                              </div>
                            ) : (
                              <img
                                src={product.media_url}
                                alt={product.title}
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{product.title}</h4>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {product.description}
                          </p>
                          <p className="text-sm font-semibold text-primary mt-1">
                            {product.price} {product.currency === 'RUB' ? '₽' : product.currency === 'USD' ? '$' : '€'}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-3">
                        {product.link && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 gap-1"
                            onClick={() => window.open(product.link!, '_blank')}
                          >
                            <ExternalLink className="h-3 w-3" />
                            Открыть
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEdit(product)}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(product.id)}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Video Player Modal */}
      {videoToPlay && (
        <PodcastPlayerModal
          isOpen={videoPlayerOpen}
          onClose={() => {
            setVideoPlayerOpen(false);
            setVideoToPlay(null);
          }}
          podcast={{
            id: 'product-video',
            title: videoToPlay.title,
            youtube_id: videoToPlay.id,
            youtube_url: `https://youtube.com/watch?v=${videoToPlay.id}`,
            description: '',
            thumbnail_url: '',
          }}
        />
      )}
    </div>
  );
}