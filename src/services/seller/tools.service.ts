import { apiConfig, request } from '../api/client';

export type SellerCampaign = {
  id: number;
  name: string;
  description?: string | null;
  status: string;
  type?: string | null;
  approval_status?: string | null;
  rejection_reason?: string | null;
  review_reason?: string | null;
  scope?: string | null;
  placement?: string | null;
  discount_type?: 'percentage' | 'fixed' | string | null;
  discount_value?: number | null;
  starts_at: string;
  ends_at: string;
  schedule_timezone?: string | null;
  minimum_order_amount?: number | string | null;
  minimum_quantity?: number | null;
  usage_limit?: number | null;
  per_buyer_limit?: number | null;
  usage_count?: number | null;
  priority?: number | null;
  revision?: number | null;
  stacking?: boolean | null;
  destination_type?: string | null;
  destination_id?: number | null;
  destination_url?: string | null;
  targeting?: { category_id?: number | null } | null;
  store?: { id: number; name?: string | null } | null;
  products?: { id: number; name: string }[];
  categories?: { id: number; name: string }[];
  variants?: { variant_type: string; variant_id: number }[];
  analytics?: Record<string, number | string | null>;
  created_at?: string | null;
  updated_at?: string | null;
  creatives?: { desktop_url?: string; mobile_url?: string; title?: string; description?: string; alt_text?: string; cta_text?: string; sort_order?: number; is_active?: boolean }[];
};
export type CampaignUsage = { id: number; order_id?: number | null; units?: number | null; revenue?: number | string | null; discount_amount?: number | string | null; created_at?: string | null };
export type CampaignAudit = { id?: number; action?: string; reason?: string | null; created_at?: string | null; snapshot?: string | Record<string, unknown> | null };
export type CampaignOptions = { products: { id: number; name: string; variants?: { id: number; name?: string; color_name?: string }[]; frame_sizes?: { id: number; size_label?: string }[]; size_volume_variants?: { id: number; size_volume?: string }[]; eye_hygiene_variants?: { id: number; name?: string }[] }[]; categories: { id: number; name: string }[]; discount_campaigns: { id: number; name: string }[]; store?: { id: number; name: string } };
export type SellerAnnouncement = { id: number; title: string; message: string; start_date?: string | null; end_date?: string | null; is_active: boolean };
export type CouponTarget = { id: number; name?: string; sku?: string; parent_id?: number | null; product_id?: number; color_name?: string | null; color_code?: string | null; price?: string | number | null; stock_quantity?: number | null; product?: { id: number; name: string } | null };
export type CouponUsage = { id: number; status?: string | null; discount_amount?: number | string | null; shipping_discount?: number | string | null; created_at?: string | null; store_order?: { id: number; status?: string | null; payment_status?: string | null; total?: number | string | null; order?: { order_no?: string | null } | null } | null; order?: { order_no?: string | null } | null };
export type CouponAudit = { id?: number; action?: string | null; created_at?: string | null; actor?: { id?: number; name?: string | null } | null; snapshot_before?: Record<string, unknown> | null; snapshot_after?: Record<string, unknown> | null };
export type CouponStatistics = { total_coupons?: number; active_coupons?: number; redeemed_coupons?: number; reserved_coupons?: number; total_usages?: number; total_discount_given?: number | string; remaining_usage?: number; revenue_generated?: number | string; order_count?: number; conversion_count?: number };
export type SellerCoupon = { id: number; store_id?: number; code: string; description?: string | null; discount_type: 'percentage' | 'fixed_amount' | 'free_shipping'; discount_value: number | string; min_order_amount?: number | string | null; usage_limit?: number | null; usage_per_user?: number | null; starts_at?: string | null; ends_at?: string | null; schedule_timezone?: string | null; status: string; resolved_status?: string | null; is_active: boolean; scope: 'store' | 'products' | 'categories' | 'variants'; is_public?: boolean; followers_only?: boolean; first_order_only?: boolean; usage_count?: number; reserved_count?: number; usages_count?: number; redeemed_usages_count?: number; products?: CouponTarget[]; categories?: CouponTarget[]; variants?: CouponTarget[]; audits?: CouponAudit[]; store?: { id: number; name?: string | null } | null; created_at?: string | null; updated_at?: string | null };
export type WarehouseProduct = { id: number; name: string; sku: string; description?: string | null; image_url?: string | null; image_path?: string | null; price: string; shipping_fee: string; stock_quantity: number; availability: string; color?: string | null; temple_size?: string | null; lens_size?: string | null; bridge_size?: string | null; details?: Record<string, string | number | boolean | null>; category?: { id: number; name: string; type: 'eyeglasses' | 'contact_lenses' | 'contact_lens_solutions' | string } | null };
export type WarehouseCart = { cart?: { id: number }; items: { id: number; quantity: number; product: WarehouseProduct }[]; subtotal: string; shipping_fee: string; total: string; currency: string };
export type WarehouseOrder = { id: number; order_number: string; status: string; payment_status: string; subtotal: string; shipping_fee: string; total: string; tracking_number?: string | null; shipping_carrier?: string | null; created_at: string; items: { id: number; product_name: string; sku: string; unit_price: string; quantity: number; line_total: string }[] };
export type CategoryLensConfig = { id: number; name: string; slug: string; lens_types: number[]; lens_treatments: number[]; lens_coatings: number[]; lens_thickness_materials: number[]; lens_thickness_options: number[] };
export type LensConfigDetail = { category: { id: number; name: string }; available: Record<string, { id: number; name: string; is_active: boolean }[]>; configured: { lens_types: number[]; treatments: number[]; coatings: number[]; thickness_materials: number[]; thickness_options: number[] } };
export type FieldConfig = { id: number; name: string; slug: string; product_type: string; field_config: Record<string, boolean> };
export type FieldConfigDetail = { category: { id: number; name: string }; product_type: string; available_fields: string[]; field_config: Record<string, boolean> };
export type PrescriptionConfig = { id: number; name: string; slug: string; has_config: boolean; config_status: Record<string, boolean> };
export type PrescriptionDetail = { category: { id: number; name: string }; values: Record<string, { id: number; value: string; label?: string | null; eye_type?: string | null; form_type?: string | null; is_active: boolean; sort_order: number }[]> };
export type ReferralAnalytics = { clicks?: number; registrations?: number; orders?: number; qualified_conversions?: number; pending_rewards?: number; rewarded_conversions?: number; reversed_rewards?: number; revenue_generated?: number | string; referral_commission_cost?: number | string; net_revenue?: number | string; conversion_rate?: number | string; average_order_value?: number | string; budget_used?: number | string; budget_remaining?: number | string };
export type ReferralReward = { id: number; status?: string | null; amount?: string | number | null; created_at?: string | null; order?: { order_no?: string | null } | null; referred?: { name?: string | null; email?: string | null } | null; referrer?: { name?: string | null; email?: string | null } | null };
export type ReferralCampaign = { id: number; name: string; identifier: string; status: string; approval_status?: string; scope_type: 'store' | 'products' | 'categories' | 'mixed'; reward_type: 'fixed' | 'percentage' | string; reward_amount: string | number; max_reward_per_order?: string | number | null; budget_amount: string | number; budget_reserved?: string | number; budget_spent?: string | number; usage_limit?: number | null; monthly_reward_limit?: number | null; per_buyer_limit?: number | null; minimum_order_amount?: string | number | null; minimum_quantity?: number | null; new_customer_only?: boolean; platform_stacking?: 'exclusive' | 'allow_platform' | string | null; activation_mode?: 'immediate' | 'scheduled' | string | null; starts_at?: string | null; ends_at?: string | null; products?: { id: number; name: string }[]; categories?: { id: number; name: string }[]; analytics?: ReferralAnalytics; created_at?: string | null; updated_at?: string | null };
export type AdProduct = {
  id: number;
  name: string;
  images?: string[] | null;
  price: string | number;
  stock_quantity: number;
  is_approved: boolean;
};

export type AdCampaign = {
  id: number;
  name: string;
  product_id: number;
  seller_id?: number;
  product?: AdProduct | null;
  status: string;
  payment_status?: string | null;
  payment_method?: string | null;
  funding_source?: string | null;
  seller_wallet_id?: number | null;
  starts_at?: string | null;
  ends_at?: string | null;
  schedule_timezone?: string | null;
  budget_type?: 'daily' | 'total' | string | null;
  /** Legacy/mobile fallback; newer API responses expose cent-based values. */
  budget_amount?: string | number | null;
  budget_amount_cents?: number;
  budget_cents?: number;
  bid_cents?: number;
  spent_cents?: number;
  remaining_cents?: number;
  released_cents?: number;
  reserved_cents?: number;
  impressions?: number;
  unique_impressions?: number;
  clicks?: number;
  product_views?: number;
  add_to_carts?: number;
  conversions?: number;
  revenue_cents?: number;
  ctr?: number;
  average_cpc_cents?: number;
  conversion_rate?: number;
  roas?: number;
  placements?: string[];
  locations?: string[];
  rejection_reason?: string | null;
  pause_source?: string | null;
  legacy_snapshot?: Record<string, unknown> | null;
};

export type AdMetric = {
  day?: string;
  placement?: string;
  location?: string;
  impressions: number;
  unique_impressions: number;
  clicks: number;
  product_views: number;
  add_to_carts: number;
  conversions: number;
  revenue_cents: number;
  spent_cents: number;
};

export type AdAnalytics = {
  summary: AdCampaign;
  daily: AdMetric[];
  placements: AdMetric[];
  locations: AdMetric[];
  attribution_window_days: number;
};

export type AdBudgetTransaction = {
  id: number;
  type: string;
  amount_cents: number;
  balance_after_cents: number;
  created_at: string;
  actor_id?: number | null;
  metadata?: Record<string, unknown> | null;
};

export type SellerPage<T> = { data: T[]; current_page: number; last_page: number; total: number };

export type AdOptions = {
  products: SellerPage<AdProduct>;
  locations: { code: string; name: string }[];
  placements: string[];
  bid_types?: string[];
  currency?: string;
  review_required: boolean;
  seller_wallet_available_cents: number;
  seller_wallet_ad_reserved_cents: number;
};

const unwrapPage = <T>(value: unknown): T[] => Array.isArray(value) ? value as T[] : ((value as { data?: T[] })?.data ?? []);
const query = (params: Record<string, string | number | undefined>) => new URLSearchParams(Object.entries(params).filter((entry): entry is [string, string | number] => entry[1] !== undefined).map(([key, value]) => [key, String(value)])).toString();
const warehouseImageUrl = (path?: string | null) => {
  if (!path || /^https?:\/\//i.test(path)) return path ?? null;
  const origin = apiConfig.baseUrl.replace(/\/api$/, '').replace(/\/$/, '');
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
};
const normaliseWarehouseProduct = (product: WarehouseProduct): WarehouseProduct => ({ ...product, image_url: warehouseImageUrl(product.image_url || product.image_path) });
const normaliseWarehouseCart = (cart: WarehouseCart): WarehouseCart => ({ ...cart, items: (cart.items ?? []).map((item) => ({ ...item, product: normaliseWarehouseProduct(item.product) })) });

export const sellerToolsService = {
  discountCampaignsPage: (params: Record<string, string | number | undefined> = {}) => request<SellerPage<SellerCampaign>>(`/seller/discount-campaigns?${query(params)}`),
  bannerCampaignsPage: (params: Record<string, string | number | undefined> = {}) => request<SellerPage<SellerCampaign>>(`/seller/banner-campaigns?${query(params)}`),
  discountCampaigns: async (params: Record<string, string | number | undefined> = {}) => request<{ data?: SellerCampaign[] } | SellerCampaign[]>(`/seller/discount-campaigns?${query(params)}`).then(unwrapPage<SellerCampaign>),
  bannerCampaigns: async (params: Record<string, string | number | undefined> = {}) => request<{ data?: SellerCampaign[] } | SellerCampaign[]>(`/seller/banner-campaigns?${query(params)}`).then(unwrapPage<SellerCampaign>),
  campaignOptions: () => request<CampaignOptions>('/seller/discount-campaigns/options'),
  campaignDetail: (kind: 'discount' | 'banner', id: number) => request<SellerCampaign>(`/seller/${kind}-campaigns/${id}`),
  campaignAnalytics: (kind: 'discount' | 'banner', id: number) => request<{ metrics?: Record<string, number | string | null>; usage?: { data?: CampaignUsage[] } }>(`/seller/${kind}-campaigns/${id}/analytics`),
  campaignAudits: (kind: 'discount' | 'banner', id: number) => request<{ data?: CampaignAudit[] }>(`/seller/${kind}-campaigns/${id}/audits`),
  campaignAction: (kind: 'discount' | 'banner', id: number, action: string) => request<SellerCampaign>(`/seller/${kind}-campaigns/${id}/actions`, { method: 'POST', body: { action } }),
  createDiscountCampaign: (data: Record<string, unknown>) => request<SellerCampaign>('/seller/discount-campaigns', { method: 'POST', body: data }),
  updateDiscountCampaign: (id: number, data: Record<string, unknown>) => request<SellerCampaign>(`/seller/discount-campaigns/${id}`, { method: 'PUT', body: data }),
  discountCampaignPreview: (data: Record<string, unknown>) => request<{ prices?: { name: string; original_price: number | string; discounted_price: number | string; campaign_name?: string | null }[] }>('/seller/discount-campaigns/preview', { method: 'POST', body: data }),
  createBannerCampaign: (data: FormData) => request<SellerCampaign>('/seller/banner-campaigns', { method: 'POST', body: data }),
  updateBannerCampaign: (id: number, data: FormData) => { data.append('_method', 'PUT'); return request<SellerCampaign>(`/seller/banner-campaigns/${id}`, { method: 'POST', body: data }); },
  announcements: () => request<{ data?: SellerAnnouncement[] } | SellerAnnouncement[]>('/seller/announcements?per_page=50').then(unwrapPage<SellerAnnouncement>),
  createAnnouncement: (data: Omit<SellerAnnouncement, 'id'>) => request<SellerAnnouncement>('/seller/announcements', { method: 'POST', body: data }),
  updateAnnouncement: (id: number, data: Partial<SellerAnnouncement>) => request<SellerAnnouncement>(`/seller/announcements/${id}`, { method: 'PUT', body: data }),
  deleteAnnouncement: (id: number) => request<unknown>(`/seller/announcements/${id}`, { method: 'DELETE' }),
  toggleAnnouncement: (id: number) => request<SellerAnnouncement>(`/seller/announcements/${id}/toggle`, { method: 'POST' }),
  couponsPage: (params: Record<string, string | number | undefined> = {}) => request<{ coupons: SellerPage<SellerCoupon>; statistics?: CouponStatistics }>(`/seller/coupons?${query(params)}`),
  coupons: () => request<{ coupons?: { data?: SellerCoupon[] } | SellerCoupon[]; data?: SellerCoupon[] } | SellerCoupon[]>('/seller/coupons?per_page=50').then((response) => Array.isArray(response) ? response : unwrapPage<SellerCoupon>(response.coupons ?? response.data)),
  coupon: (id: number) => request<SellerCoupon>(`/seller/coupons/${id}`),
  couponAnalytics: () => request<{ summary?: CouponStatistics; performance?: { date: string; usages: number; discounts: number | string }[] }>('/seller/coupons/analytics'),
  couponUsageHistory: (id: number, params: Record<string, string | number | undefined> = {}) => request<SellerPage<CouponUsage>>(`/seller/coupons/${id}/usage-history?${query(params)}`),
  couponTargets: (type: 'products' | 'categories' | 'variants') => request<CouponTarget[]>(`/seller/coupons/targets/${type}`),
  createCoupon: (data: Record<string, unknown>) => request<SellerCoupon>('/seller/coupons', { method: 'POST', body: data }),
  updateCoupon: (id: number, data: Record<string, unknown>) => request<SellerCoupon>(`/seller/coupons/${id}`, { method: 'PUT', body: data }),
  deleteCoupon: (id: number) => request<unknown>(`/seller/coupons/${id}`, { method: 'DELETE' }),
  couponAction: (id: number, action: 'toggle-status' | 'pause' | 'resume') => request<SellerCoupon>(`/seller/coupons/${id}/${action}`, { method: 'POST' }),
  warehouseProducts: async (params: Record<string, string | number | undefined> = {}) => request<{ products: { data?: WarehouseProduct[] } | WarehouseProduct[]; categories?: { id: number; name: string; type?: string }[]; cart_count?: number }>(`/seller/warehouse/products?${query(params)}`).then((response) => ({ products: unwrapPage<WarehouseProduct>(response.products).map(normaliseWarehouseProduct), categories: response.categories ?? [], cartCount: response.cart_count ?? 0 })),
  warehouseProduct: (id: number) => request<WarehouseProduct>(`/seller/warehouse/products/${id}`).then(normaliseWarehouseProduct),
  warehouseCart: () => request<WarehouseCart>('/seller/warehouse/cart').then(normaliseWarehouseCart),
  addWarehouseCartItem: (warehouseProductId: number, quantity: number) => request<WarehouseCart>('/seller/warehouse/cart/items', { method: 'POST', body: { warehouse_product_id: warehouseProductId, quantity } }).then(normaliseWarehouseCart),
  updateWarehouseCartItem: (id: number, quantity: number) => request<WarehouseCart>(`/seller/warehouse/cart/items/${id}`, { method: 'PUT', body: { quantity } }).then(normaliseWarehouseCart),
  removeWarehouseCartItem: (id: number) => request<WarehouseCart>(`/seller/warehouse/cart/items/${id}`, { method: 'DELETE' }).then(normaliseWarehouseCart),
  warehouseCheckout: (shippingAddress: Record<string, string>) => request<WarehouseOrder>('/seller/warehouse/checkout', { method: 'POST', body: { shipping_address: shippingAddress, idempotency_key: `${Date.now()}-${Math.random().toString(36).slice(2)}` } }),
  warehouseOrders: () => request<{ data?: WarehouseOrder[] } | WarehouseOrder[]>('/seller/warehouse/orders?per_page=50').then(unwrapPage<WarehouseOrder>),
  lensConfigs: () => request<CategoryLensConfig[]>('/seller/category-lens-config'),
  lensConfig: (categoryId: number) => request<LensConfigDetail>(`/seller/category-lens-config/${categoryId}`),
  updateLensConfig: (categoryId: number, data: Record<string, number[]>) => request<unknown>(`/seller/category-lens-config/${categoryId}`, { method: 'PUT', body: data }),
  fieldConfigs: () => request<FieldConfig[]>('/seller/category-field-configs'),
  fieldConfig: (categoryId: number) => request<FieldConfigDetail>(`/seller/category-field-configs/${categoryId}`),
  updateFieldConfig: (categoryId: number, fieldConfig: Record<string, boolean>) => request<unknown>(`/seller/category-field-configs/${categoryId}`, { method: 'PUT', body: { field_config: fieldConfig } }),
  prescriptionConfigs: () => request<PrescriptionConfig[]>('/seller/prescription-dropdowns'),
  prescriptionConfig: (categoryId: number) => request<PrescriptionDetail>(`/seller/prescription-dropdowns/${categoryId}`),
  updatePrescriptionConfig: (categoryId: number, values: unknown[]) => request<unknown>(`/seller/prescription-dropdowns/${categoryId}`, { method: 'POST', body: { values } }),
  deletePrescriptionValue: (id: number) => request<unknown>(`/seller/prescription-dropdowns/${id}`, { method: 'DELETE' }),
  referralsPage: (params: Record<string, string | number | undefined> = {}) => request<SellerPage<ReferralCampaign>>(`/seller/referral-campaigns?${query(params)}`),
  referrals: () => request<{ data?: ReferralCampaign[] } | ReferralCampaign[]>('/seller/referral-campaigns?per_page=50').then(unwrapPage<ReferralCampaign>),
  referral: (id: number) => request<{ campaign: ReferralCampaign; analytics?: ReferralAnalytics; rewards?: SellerPage<ReferralReward> }>(`/seller/referral-campaigns/${id}`),
  createReferral: (data: Record<string, unknown>) => request<ReferralCampaign>('/seller/referral-campaigns', { method: 'POST', body: data }),
  updateReferral: (id: number, data: Record<string, unknown>) => request<ReferralCampaign>(`/seller/referral-campaigns/${id}`, { method: 'PUT', body: data }),
  referralAction: (id: number, action: 'pause' | 'resume' | 'archive') => request<ReferralCampaign>(`/seller/referral-campaigns/${id}/action`, { method: 'POST', body: { action } }),
  boostCampaignsPage: (params: Record<string, string | number | undefined> = {}) => request<SellerPage<AdCampaign>>(`/seller/ad-campaigns?${query(params)}`),
  boostCampaigns: () => request<{ data?: AdCampaign[] } | AdCampaign[]>('/seller/ad-campaigns?per_page=50').then(unwrapPage<AdCampaign>),
  boostCampaign: (id: number) => request<AdCampaign>(`/seller/ad-campaigns/${id}`),
  boostOptions: (params: { search?: string; page?: number } = {}) => request<AdOptions>(`/seller/ad-campaigns/options?${query(params)}`),
  createBoost: (data: Record<string, unknown>) => request<AdCampaign>('/seller/ad-campaigns', { method: 'POST', body: data }),
  boostAction: (id: number, action: string) => request<AdCampaign>(`/seller/ad-campaigns/${id}/actions`, { method: 'POST', body: { action } }),
  deleteBoost: (id: number) => request<unknown>(`/seller/ad-campaigns/${id}`, { method: 'DELETE' }),
  boostAnalytics: (id: number) => request<AdAnalytics>(`/seller/ad-campaigns/${id}/analytics`),
  boostTransactions: (id: number, page = 1) => request<SellerPage<AdBudgetTransaction>>(`/seller/ad-campaigns/${id}/transactions?${query({ page })}`),
  duplicateBoost: (id: number) => request<Partial<Pick<AdCampaign, 'product_id' | 'name' | 'budget_type' | 'placements' | 'locations'>> & { budget_amount?: string; bid_type?: 'cpc'; bid_amount?: string }>(`/seller/ad-campaigns/${id}/duplicate`, { method: 'POST' }),
  subscription: () => request<{ plan?: { name?: string; price?: string | number }; subscription?: { status?: string; ends_at?: string | null }; features?: string[] }>('/seller/subscription/current'),
  subscriptionPlans: () => request<{ plans?: { id: number; name: string; price: string | number; features?: string[] }[] }>('/seller/subscription/plans'),
};
