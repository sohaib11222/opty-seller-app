import { apiAssetUrl, createIdempotencyKey, request, uploadFile } from '../api/client';
import type { SellerUser } from '../auth/auth.service';

export type SellerProfile = SellerUser & { profile_image_url?: string | null; email_verified_at?: string | null; phone_verified_at?: string | null };
export type SellerWallet = { available_balance: string | number; pending_balance: string | number; reserved_balance: string | number; total_earnings: string | number; locked_escrow_amount?: string | number };
export type WalletEntry = { id: number; type: string; amount: string | number; status: string; description?: string; created_at: string };
export type SellerWithdrawal = { id: number; amount: string | number; status: string; created_at: string; payout_reference?: string | null; notes?: string | null };
export type SellerReview = { id: number; rating?: number; comment?: string; title?: string; created_at: string; user?: { id: number; name: string } | null; product?: { id: number; name: string } | null; store?: { id: number; name: string } | null };
export type MarketplaceNotification = { id: string; type: string; title: string; message: string; url?: string | null; context?: Record<string, unknown>; read_at?: string | null; created_at?: string | null };
export type SellerUnreadSummary = { messages: number; orders: number; support: number; files: number; notifications: number; total: number };
export type StoreFollower = { id: number; followed_at?: string | null; user: { id: number; name: string; profile_image_url?: string | null; created_at?: string | null } };
export type WarehouseOrder = { id: number; order_number: string; status: string; payment_status: string; total: string | number; created_at: string; tracking_number?: string | null; shipping_carrier?: string | null; items: { id: number; product_name: string; sku: string; unit_price: string | number; quantity: number; line_total: string | number }[] };
export type SupportTicketStatus = 'open' | 'in_progress' | 'waiting_for_user' | 'resolved' | 'closed';
export type SupportTicketCategory = 'order' | 'payment' | 'shipping' | 'refund' | 'product' | 'account' | 'seller_store' | 'technical' | 'other';
export type SupportTicketPriority = 'low' | 'normal' | 'high' | 'urgent';
export type SupportMessage = { id: number; body?: string | null; sender_role: string; sender?: { id: number; name: string } | null; attachment_url?: string | null; attachment_name?: string | null; created_at: string };
export type SellerSupportTicket = { id: number; ticket_no: string; subject: string; category: SupportTicketCategory; priority: SupportTicketPriority; status: SupportTicketStatus; description: string; user_unread_count?: number; admin_unread_count?: number; created_at: string; updated_at: string; messages?: SupportMessage[]; events?: { id: number; type?: string; event?: string; created_at: string; actor?: { id: number; name: string } | null }[] };

const profileWithAssetUrl = (user: SellerProfile): SellerProfile => ({ ...user, profile_image_url: apiAssetUrl(user.profile_image_url) });
const supportMessageWithAssetUrl = (message: SupportMessage): SupportMessage => ({ ...message, attachment_url: apiAssetUrl(message.attachment_url) });
const supportTicketWithAssetUrls = (ticket: SellerSupportTicket): SellerSupportTicket => ({ ...ticket, messages: ticket.messages?.map(supportMessageWithAssetUrl) });

export const profileService = {
  get: () => request<{ user: SellerProfile }>('/seller/profile').then((response) => profileWithAssetUrl(response.user)),
  update: (data: { name?: string; phone?: string | null }) => request<{ user: SellerProfile }>('/seller/profile', { method: 'PUT', body: data }).then((response) => profileWithAssetUrl(response.user)),
  changePassword: (data: { currentPassword: string; password: string; confirmation: string }) => request<unknown>('/seller/profile/change-password', { method: 'POST', body: { current_password: data.currentPassword, password: data.password, password_confirmation: data.confirmation } }),
  sendPasswordChangeCode: () => request<{ email: string }>('/seller/profile/change-password/send-code', { method: 'POST' }),
  verifyPasswordChangeCode: (code: string) => request<unknown>('/seller/profile/change-password/verify-code', { method: 'POST', body: { code } }),
  resetPasswordWithVerifiedCode: (password: string, confirmation: string) => request<unknown>('/seller/profile/change-password/reset', { method: 'POST', body: { password, password_confirmation: confirmation } }),
  async uploadImage(asset: { uri: string; name?: string | null; mimeType?: string | null }) { return profileWithAssetUrl((await uploadFile<{ user: SellerProfile }>('/seller/profile/upload-image', { uri: asset.uri, name: asset.name || 'profile.jpg', mimeType: asset.mimeType || 'image/jpeg' }, { field: 'image' })).user); },
  removeImage: () => request<{ user: SellerProfile }>('/seller/profile/image', { method: 'DELETE' }).then((response) => response.user),
  wallet: () => request<SellerWallet>('/seller/wallet'),
  walletCapabilities: () => request<{ wallet_top_up: boolean; currency: string }>('/seller/wallet/capabilities'),
  topUpWallet: (amount: string) => request<unknown>('/seller/wallet/top-ups', { method: 'POST', body: { amount, idempotency_key: createIdempotencyKey() } }),
  walletTransactions: () => request<{ data: WalletEntry[] }>('/seller/wallet/transactions?per_page=20').then((response) => response.data ?? []),
  withdrawals: () => request<{ data: SellerWithdrawal[] }>('/seller/wallet/withdrawals?per_page=25').then((response) => response.data ?? []),
  requestWithdrawal: (data: { amount: string; accountName: string; accountNumber: string; bankName: string }) => request<SellerWithdrawal>('/seller/wallet/withdrawals', { method: 'POST', body: { amount: data.amount, idempotency_key: createIdempotencyKey(), bank_details: { account_name: data.accountName, account_number: data.accountNumber, bank_name: data.bankName } } }),
  followers: () => request<{ followers: StoreFollower[]; pagination?: { total?: number } }>('/seller/store/followers?per_page=100'),
  warehouseOrders: () => request<{ data: WarehouseOrder[] }>('/seller/warehouse/orders?per_page=50').then((response) => response.data ?? []),
  reviews: (type: 'store' | 'product' = 'store') => request<{ reviews: SellerReview[] }>(`/seller/profile/reviews?type=${type}&per_page=50`).then((response) => response.reviews ?? []),
  notifications: () => request<{ notifications: MarketplaceNotification[]; unread_count: number }>('/seller/notifications?per_page=50'),
  unreadSummary: () => request<SellerUnreadSummary>('/seller/notifications/unread'),
  markUnreadCategoryRead: (category: 'orders') => request<SellerUnreadSummary>('/seller/notifications/read-category', { method: 'POST', body: { category } }),
  markNotificationRead: (id: string) => request<unknown>(`/seller/notifications/${encodeURIComponent(id)}/read`, { method: 'POST' }),
  markAllNotificationsRead: () => request<unknown>('/seller/notifications/read-all', { method: 'POST' }),
  supportTickets: (filters: { status?: SupportTicketStatus | ''; category?: SupportTicketCategory | '' } = {}) => {
    const query = new URLSearchParams({ per_page: '50' }); if (filters.status) query.set('status', filters.status); if (filters.category) query.set('category', filters.category);
    return request<{ tickets: SellerSupportTicket[] }>(`/seller/support/tickets?${query}`).then((response) => response.tickets ?? []);
  },
  supportTicket: (id: number) => request<{ ticket: SellerSupportTicket }>(`/seller/support/tickets/${id}`).then((response) => supportTicketWithAssetUrls(response.ticket)),
  createSupportTicket: async (data: { subject: string; category: SupportTicketCategory; priority: SupportTicketPriority; description: string; attachment?: { uri: string; name: string; mimeType?: string | null } | null }) => {
    const parameters = { subject: data.subject, category: data.category, priority: data.priority, description: data.description };
    const response = data.attachment
      ? await uploadFile<{ ticket: SellerSupportTicket }>('/seller/support/tickets', data.attachment, { parameters })
      : await request<{ ticket: SellerSupportTicket }>('/seller/support/tickets', { method: 'POST', body: parameters });
    return supportTicketWithAssetUrls(response.ticket);
  },
  replySupportTicket: async (id: number, data: { body: string; attachment?: { uri: string; name: string; mimeType?: string | null } | null }) => {
    const response = data.attachment
      ? await uploadFile<{ message: SupportMessage }>(`/seller/support/tickets/${id}/messages`, data.attachment, { parameters: { body: data.body } })
      : await request<{ message: SupportMessage }>(`/seller/support/tickets/${id}/messages`, { method: 'POST', body: { body: data.body } });
    return supportMessageWithAssetUrl(response.message);
  },
  closeSupportTicket: (id: number) => request<{ ticket: SellerSupportTicket }>(`/seller/support/tickets/${id}/close`, { method: 'POST' }).then((response) => response.ticket),
  reopenSupportTicket: (id: number) => request<{ ticket: SellerSupportTicket }>(`/seller/support/tickets/${id}/reopen`, { method: 'POST' }).then((response) => response.ticket),
};
