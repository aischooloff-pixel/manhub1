import { useState, useEffect } from 'react';
import { X, Plus, Package, Trash2, ExternalLink, Edit2, Image, Youtube } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useTelegram } from '@/hooks/use-telegram';
import { toast } from 'sonner';

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

  useEffect(() => {
    if (isOpen && userProfileId) {
      loadProducts();
    }
  }, [isOpen, userProfileId]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_products')
        .select('*')
        .eq('user_profile_id', userProfileId)
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        setProducts(data as Product[]);
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
                <label className="text-sm text-muted-foreground">Медиа (ссылка на изображение или YouTube)</label>
                <Input
                  value={formData.media_url}
                  onChange={(e) => setFormData({ ...formData, media_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="text-sm text-muted-foreground">Ссылка на покупку</label>
                <Input
                  value={formData.link}
                  onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                  placeholder="https://..."
                />
              </div>

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
              <Button
                onClick={() => setIsCreating(true)}
                className="w-full mb-4 gap-2"
                variant="outline"
              >
                <Plus className="h-4 w-4" />
                Добавить продукт
              </Button>

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
                      className="rounded-xl border border-border p-4"
                    >
                      <div className="flex items-start gap-3">
                        {product.media_url && (
                          <div className="w-16 h-16 rounded-lg bg-secondary flex-shrink-0 overflow-hidden">
                            {product.media_type === 'youtube' ? (
                              <div className="w-full h-full flex items-center justify-center bg-red-500/20">
                                <Youtube className="h-6 w-6 text-red-500" />
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
    </div>
  );
}