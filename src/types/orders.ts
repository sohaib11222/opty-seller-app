export type OrderStatus =
  | 'pending'
  | 'awaiting_payment'
  | 'paid'
  | 'processing'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'rejected'
  | string;

export type CurrencyValue = number | string | null | undefined;

export type OrderBuyer = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
};

export type OrderLine = {
  id: number;
  product_id?: number | null;
  variant_id?: number | null;
  quantity: number;
  price: CurrencyValue;
  line_total: CurrencyValue;
  product_name: string;
  product_sku?: string | null;
  product_images?: string[] | null;
  product_variant?: Record<string, unknown> | null;
  lens_configuration?: Record<string, unknown> | null;
  prescription_data?: Record<string, unknown> | null;
  lens_type?: string | null;
  lens_index?: CurrencyValue;
  lens_thickness_material_id?: number | null;
  lens_thickness_option_id?: number | null;
  lens_color_id?: number | null;
  treatment_ids?: (number | string)[] | null;
  lens_coatings?: string | null;
  photochromic_color_id?: number | null;
  prescription_sun_color_id?: number | null;
  progressive_variant_id?: number | null;
  frame_size_id?: number | null;
  contact_lens_pack_quantity?: number | null;
  contact_lens_left_base_curve?: CurrencyValue;
  contact_lens_left_diameter?: CurrencyValue;
  contact_lens_left_power?: CurrencyValue;
  contact_lens_left_qty?: number | null;
  contact_lens_left_cylinder?: CurrencyValue;
  contact_lens_left_axis?: CurrencyValue;
  contact_lens_right_base_curve?: CurrencyValue;
  contact_lens_right_diameter?: CurrencyValue;
  contact_lens_right_power?: CurrencyValue;
  contact_lens_right_qty?: number | null;
  contact_lens_right_cylinder?: CurrencyValue;
  contact_lens_right_axis?: CurrencyValue;
};

export type StoreOrder = {
  id: number;
  order_id: number;
  store_id: number;
  status: OrderStatus;
  subtotal: CurrencyValue;
  delivery_fee: CurrencyValue;
  total: CurrencyValue;
  discount_total?: CurrencyValue;
  coupon_code?: string | null;
  coupon_discount?: CurrencyValue;
  coupon_shipping_discount?: CurrencyValue;
  coupon_snapshot?: Record<string, unknown> | null;
  payment_status?: string | null;
  financial_version?: number | null;
  delivery_address_snapshot?: Record<string, unknown> | null;
  delivery_code_expires_at?: string | null;
  delivery_verified_at?: string | null;
  dispute_reason?: string | null;
  rejection_reason?: string | null;
  estimated_delivery_date?: string | null;
  delivery_method?: string | null;
  delivery_notes?: string | null;
  accepted_at?: string | null;
  paid_at?: string | null;
  out_for_delivery_at?: string | null;
  delivered_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  escrow?: { id: number; amount: CurrencyValue; status: string } | null;
  payment?: { id?: number; amount?: CurrencyValue; status?: string; provider?: string; reference?: string } | null;
  order: { id: number; order_no: string; user: OrderBuyer };
  items: OrderLine[];
};

export type OrderPage = {
  data: StoreOrder[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

export type AcceptOrderInput = {
  delivery_fee: number;
  estimated_delivery_date: string;
  delivery_method: string;
  delivery_notes?: string;
};
