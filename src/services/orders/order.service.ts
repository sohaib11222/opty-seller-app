import { request } from '../api/client';
import type { AcceptOrderInput, OrderPage, OrderStatus, StoreOrder } from '../../types/orders';

type ListPayload = {
  data?: StoreOrder[];
  current_page?: number;
  last_page?: number;
  per_page?: number;
  total?: number;
};

function asOrderPage(payload: ListPayload): OrderPage {
  return {
    data: Array.isArray(payload.data) ? payload.data : [],
    current_page: payload.current_page ?? 1,
    last_page: payload.last_page ?? 1,
    per_page: payload.per_page ?? 15,
    total: payload.total ?? 0,
  };
}

function makeIdempotencyKey(orderId: number) {
  return `mobile-shipping-quote:${orderId}:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;
}

export const orderService = {
  async getOrders(params: { status?: OrderStatus; page?: number; per_page?: number } = {}) {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    if (params.page) query.set('page', String(params.page));
    if (params.per_page) query.set('per_page', String(params.per_page));
    const suffix = query.toString();
    return asOrderPage(await request<ListPayload>(`/seller/orders${suffix ? `?${suffix}` : ''}`));
  },

  getOrder: (id: number) => request<StoreOrder>(`/seller/orders/${id}`),

  acceptOrder: (id: number, data: AcceptOrderInput) => request<StoreOrder>(`/seller/store-orders/${id}/accept`, {
    method: 'POST',
    body: { ...data, delivery_notes: data.delivery_notes ?? '', idempotency_key: makeIdempotencyKey(id) },
  }),

  rejectOrder: (id: number, reason: string) => request<StoreOrder>(`/seller/store-orders/${id}/reject`, {
    method: 'POST',
    body: { reason },
  }),

  startProcessing: (id: number) => request<StoreOrder>(`/seller/store-orders/${id}/processing`, { method: 'POST' }),

  markOutForDelivery: (id: number) => request<StoreOrder>(`/seller/store-orders/${id}/out-for-delivery`, { method: 'POST' }),

  requestDeliveryCode: (id: number) => request<StoreOrder>(`/seller/store-orders/${id}/delivery-code-request`, { method: 'POST' }),

  markDelivered: (id: number, deliveryCode: string) => request<StoreOrder>(`/seller/store-orders/${id}/delivered`, {
    method: 'POST',
    body: { delivery_code: deliveryCode },
  }),
};
