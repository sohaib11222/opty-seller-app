import { apiAssetUrl, request, uploadFile } from '../api/client';
import type { CategoryFieldConfig, FrameSize, FrameSizeInput, Product, ProductCategory, ProductInput, ProductListParams, ProductPage, ProductVariant, ProductVariantInput } from '../../types/products';

type PagePayload = Partial<ProductPage> & { data?: Product[] };

function pageOf(payload: PagePayload): ProductPage {
  return { data: Array.isArray(payload.data) ? payload.data : [], current_page: payload.current_page ?? 1, last_page: payload.last_page ?? 1, per_page: payload.per_page ?? 15, total: payload.total ?? 0 };
}

function queryFrom(params: ProductListParams) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== '') query.set(key, String(value)); });
  const value = query.toString();
  return value ? `?${value}` : '';
}

export const productService = {
  async getProducts(params: ProductListParams = {}) { return pageOf(await request<PagePayload>(`/seller/products${queryFrom(params)}`)); },
  getProduct: (id: number) => request<Product>(`/seller/products/${id}`),
  createProduct: (data: ProductInput) => request<Product>('/seller/products', { method: 'POST', body: data }),
  updateProduct: (id: number, data: Partial<ProductInput>) => request<Product>(`/seller/products/${id}`, { method: 'PUT', body: data }),
  deleteProduct: (id: number) => request<unknown>(`/seller/products/${id}`, { method: 'DELETE' }),
  async duplicateProduct(id: number) {
    const product = await request<Product>(`/seller/products/${id}`);
    const copy: ProductInput = {
      name: `${product.name} (Copy)`, category_id: product.category_id ?? undefined, sub_category_id: product.sub_category_id ?? undefined,
      product_type: product.product_type, price: Number(product.price), stock_quantity: product.stock_quantity, stock_status: product.stock_status,
      description: product.description ?? undefined, short_description: product.short_description ?? undefined, images: product.images ?? [],
      compare_at_price: product.compare_at_price == null ? undefined : Number(product.compare_at_price), cost_price: product.cost_price == null ? undefined : Number(product.cost_price),
      sale_start_date: product.sale_start_date ?? undefined, sale_end_date: product.sale_end_date ?? undefined, frame_shape: product.frame_shape ?? undefined,
      frame_material: product.frame_material ?? undefined, frame_color: product.frame_color ?? undefined, gender: product.gender ?? undefined, lens_type: product.lens_type ?? undefined,
      lens_index_options: product.lens_index_options ?? undefined, treatment_options: product.treatment_options ?? undefined, is_featured: product.is_featured,
      is_active: false, shipping_type: product.shipping_type ?? undefined, shipping_fee: product.shipping_fee == null ? undefined : Number(product.shipping_fee),
      meta_title: product.meta_title ?? undefined, meta_description: product.meta_description ?? undefined, meta_keywords: product.meta_keywords ?? undefined,
      base_curve_options: product.base_curve_options ?? undefined, diameter_options: product.diameter_options ?? undefined, powers_range: product.powers_range ?? undefined,
      replacement_frequency: product.replacement_frequency ?? undefined, contact_lens_brand: product.contact_lens_brand ?? undefined, contact_lens_color: product.contact_lens_color ?? undefined,
      contact_lens_material: product.contact_lens_material ?? undefined, contact_lens_type: product.contact_lens_type ?? undefined, has_uv_filter: product.has_uv_filter,
      can_sleep_with: product.can_sleep_with, water_content: product.water_content ?? undefined, is_medical_device: product.is_medical_device, size_volume: product.size_volume ?? undefined,
      pack_type: product.pack_type ?? undefined, expiry_date: product.expiry_date?.slice(0, 10), model_3d_url: product.model_3d_url ?? undefined, try_on_image: product.try_on_image ?? undefined,
      color_images: product.color_images ?? undefined, mm_calibers: product.mm_calibers, lens_colors: product.lens_colors ?? undefined, size_volume_variants: product.size_volume_variants ?? undefined,
      eye_hygiene_variants: product.eye_hygiene_variants ?? undefined, contact_lens_unit_config: product.contact_lens_unit_config ?? undefined,
    };
    return request<Product>('/seller/products', { method: 'POST', body: copy });
  },
  toggleStatus: (id: number) => request<Product>(`/seller/products/${id}/toggle-status`, { method: 'POST' }),
  toggleMute: (id: number) => request<Product>(`/seller/products/${id}/toggle-mute`, { method: 'POST' }),
  getCategories: () => request<ProductCategory[]>('/seller/products/categories'),
  suggestSku: () => request<{ sku: string }>('/seller/products/suggest-sku').then((response) => response.sku),
  getFieldConfig: (categoryId: number) => request<CategoryFieldConfig>(`/seller/category-field-configs/${categoryId}/fields`),
  getVariants: (productId: number) => request<ProductVariant[]>(`/seller/products/${productId}/variants`),
  createVariant: (productId: number, data: ProductVariantInput) => request<ProductVariant>(`/seller/products/${productId}/variants`, { method: 'POST', body: data }),
  updateVariant: (variantId: number, data: Partial<ProductVariantInput>) => request<ProductVariant>(`/seller/product-variant/${variantId}`, { method: 'PUT', body: data }),
  deleteVariant: (variantId: number) => request<unknown>(`/seller/product-variant/${variantId}`, { method: 'DELETE' }),
  setDefaultVariant: (variantId: number) => request<ProductVariant>(`/seller/product-variant/${variantId}/set-default`, { method: 'POST' }),
  getFrameSizes: (productId: number, variantId?: number) => request<FrameSize[]>(`/seller/products/${productId}/frame-sizes${variantId ? `?variant_id=${variantId}` : ''}`),
  createFrameSize: (productId: number, data: FrameSizeInput) => request<FrameSize>(`/seller/products/${productId}/frame-sizes`, { method: 'POST', body: data }),
  updateFrameSize: (frameSizeId: number, data: Partial<FrameSizeInput>) => request<FrameSize>(`/seller/frame-sizes/${frameSizeId}`, { method: 'PUT', body: data }),
  deleteFrameSize: (frameSizeId: number) => request<unknown>(`/seller/frame-sizes/${frameSizeId}`, { method: 'DELETE' }),
  async uploadImage(asset: { uri: string; fileName?: string | null; mimeType?: string | null }) {
    const response = await uploadFile<{ url: string; path?: string }>('/seller/products/upload-image', { uri: asset.uri, name: asset.fileName || 'product.jpg', mimeType: asset.mimeType || 'image/jpeg' }, { field: 'image' });
    return apiAssetUrl(response.url) || response.url;
  },
};
