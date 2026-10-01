export type ProductType = 'frame' | 'sunglasses' | 'contact_lens' | 'eye_hygiene' | 'accessory';
export type StockStatus = 'in_stock' | 'out_of_stock' | 'backorder';

export type ProductCategory = {
  id: number;
  name: string;
  slug: string;
  parent_id?: number | null;
  children?: ProductCategory[];
};

export type ProductLensColor = { id?: number; name: string; color_code: string; description?: string | null };
export type ProductSizeVolumeVariant = {
  id?: number; size_volume: string; pack_type?: string | null; price: number; compare_at_price?: number | null;
  cost_price?: number | null; stock_quantity: number; stock_status: StockStatus; sku?: string | null;
  expiry_date?: string | null; image_url?: string | null; is_active?: boolean; sort_order?: number;
};
export type EyeHygieneVariant = { id?: number; name: string; description?: string | null; price: number; image_url?: string | null; is_active?: boolean; sort_order?: number };
export type ContactLensUnitConfig = {
  packs?: { quantity: number; price?: number | null; images?: string[]; available_variant_ids?: number[] }[];
  colour_stock?: { pack_quantity: number; variant_id: number; stock_quantity: number }[];
  qty_options?: number[];
};

export type Product = {
  id: number; store_id: number; category_id?: number | null; sub_category_id?: number | null;
  name: string; slug?: string; sku?: string | null; description?: string | null; short_description?: string | null;
  product_type: ProductType; price: number | string; compare_at_price?: number | string | null;
  sale_start_date?: string | null; sale_end_date?: string | null; cost_price?: number | string | null;
  stock_quantity: number; stock_status: StockStatus; images?: string[] | null;
  frame_shape?: string | null; frame_material?: string | null; frame_color?: string | null;
  gender?: 'men' | 'women' | 'unisex' | 'kids' | null; lens_type?: string | null;
  lens_index_options?: string[] | null; treatment_options?: string[] | null;
  rating?: number | string; review_count?: number; view_count?: number; is_featured?: boolean; is_active: boolean; is_muted?: boolean;
  shipping_type?: 'free' | 'fixed' | null; shipping_fee?: number | string | null;
  total_sold?: number; total_revenue?: number | string; meta_title?: string | null; meta_description?: string | null; meta_keywords?: string | null;
  base_curve_options?: string[] | null; diameter_options?: string[] | null; powers_range?: string | null; replacement_frequency?: string | null;
  contact_lens_brand?: string | null; contact_lens_color?: string | null; contact_lens_material?: string | null; contact_lens_type?: string | null;
  has_uv_filter?: boolean; can_sleep_with?: boolean; water_content?: string | null; is_medical_device?: boolean;
  size_volume?: string | null; pack_type?: string | null; expiry_date?: string | null;
  model_3d_url?: string | null; try_on_image?: string | null; color_images?: string[] | null; mm_calibers?: unknown;
  lens_colors?: ProductLensColor[] | null; size_volume_variants?: ProductSizeVolumeVariant[] | null; eye_hygiene_variants?: EyeHygieneVariant[] | null;
  contact_lens_unit_config?: ContactLensUnitConfig | null;
  category?: ProductCategory | null; sub_category?: ProductCategory | null; sale_campaign?: { display_label?: string; end_date?: string } | null;
  frame_sizes?: FrameSize[]; created_at?: string; updated_at?: string;
};

export type ProductInput = {
  name: string; category_id?: number; sub_category_id?: number; sku?: string; description?: string; short_description?: string;
  product_type: ProductType; price: number; compare_at_price?: number; sale_start_date?: string; sale_end_date?: string; cost_price?: number;
  stock_quantity: number; stock_status: StockStatus; images?: string[]; frame_shape?: string; frame_material?: string; frame_color?: string;
  gender?: 'men' | 'women' | 'unisex' | 'kids'; lens_type?: string; lens_index_options?: string[]; treatment_options?: string[];
  is_featured?: boolean; is_active?: boolean; shipping_type?: 'free' | 'fixed'; shipping_fee?: number;
  meta_title?: string; meta_description?: string; meta_keywords?: string;
  base_curve_options?: string[]; diameter_options?: string[]; powers_range?: string; replacement_frequency?: string;
  contact_lens_brand?: string; contact_lens_color?: string; contact_lens_material?: string; contact_lens_type?: string;
  has_uv_filter?: boolean; can_sleep_with?: boolean; water_content?: string; is_medical_device?: boolean;
  size_volume?: string; pack_type?: string; expiry_date?: string; model_3d_url?: string; try_on_image?: string;
  color_images?: string[]; mm_calibers?: unknown; lens_colors?: ProductLensColor[];
  size_volume_variants?: ProductSizeVolumeVariant[]; eye_hygiene_variants?: EyeHygieneVariant[]; contact_lens_unit_config?: ContactLensUnitConfig;
};

export type ProductPage = { data: Product[]; current_page: number; last_page: number; per_page: number; total: number };
export type ProductListParams = { search?: string; is_active?: boolean; product_type?: ProductType; category_id?: number; is_featured?: boolean; on_sale?: boolean; sort_by?: string; sort_order?: 'asc' | 'desc'; page?: number; per_page?: number };

export type ProductVariant = {
  id: number; product_id: number; color_name: string; color_code?: string | null; images?: string[]; price?: number | string | null;
  stock_quantity: number; stock_status: StockStatus; is_default: boolean; sort_order?: number;
};
export type ProductVariantInput = { color_name: string; color_code?: string; images?: string[]; price?: number; stock_quantity: number; stock_status: StockStatus; is_default?: boolean; sort_order?: number; sizes?: { size_label: string; lens_width?: number; bridge_width?: number; temple_length?: number; stock_quantity: number; stock_status?: StockStatus }[] };
export type FrameSize = { id: number; product_id: number; product_variant_id?: number | null; lens_width?: number; bridge_width?: number; temple_length?: number; frame_width?: number; frame_height?: number; size_label?: string; price?: number | null; image?: string | null; stock_quantity: number; stock_status: StockStatus };
export type FrameSizeInput = { product_variant_id: number; lens_width?: number; bridge_width?: number; temple_length?: number; frame_width?: number; frame_height?: number; size_label: string; price?: number; image?: string; stock_quantity: number; stock_status: StockStatus };

export type CategoryFieldConfig = { category_id: number; category_slug: string; product_type?: ProductType; enabled_fields: string[]; field_config?: Record<string, unknown>; pd_options?: unknown };

export const PRODUCT_CATEGORY_TYPES: Record<string, ProductType> = {
  'eye-glasses': 'frame', 'sun-glasses': 'sunglasses', 'contact-lenses': 'contact_lens', 'eye-hygiene': 'eye_hygiene', accessori: 'accessory',
};
