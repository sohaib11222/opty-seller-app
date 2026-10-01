import { apiAssetUrl, request, uploadFile } from '../api/client';

export type SellerStore = {
  id: number;
  name: string;
  status: 'pending' | 'active' | 'suspended' | string;
  onboarding_status: 'pending' | 'in_progress' | 'pending_review' | 'approved' | 'rejected' | string;
  verification_submitted_at?: string | null;
  store_setup_completed_at?: string | null;
  can_sell?: boolean;
  profile_image_url?: string | null;
  banner_image_url?: string | null;
  theme_color?: string | null;
  products_count?: number;
  followers_count?: number;
  rating?: number | null;
  description?: string | null;
  email?: string | null;
  phone?: string | null;
  meta?: { profile?: StoreProfile } | null;
};
export type StoreProfile = { tagline?: string | null; business_type?: string | null; registration_number?: string | null; tax_id?: string | null; address?: string | null; city?: string | null; state?: string | null; postal_code?: string | null; country?: string | null; website?: string | null; support_email?: string | null; shipping_policy?: string | null; return_policy?: string | null };
export type UpdateStoreInput = { name: string; description: string; email: string; phone: string; profile: StoreProfile };
export type StoreSocialLink = { id: number; platform: 'facebook' | 'instagram' | 'twitter' | 'linkedin' | 'youtube' | 'website' | 'other'; url: string; is_active: boolean };

async function upload(path: string, asset: { uri: string; name?: string | null; mimeType?: string | null }) { return withAssetUrls((await uploadFile<{ store: SellerStore }>(path, { uri: asset.uri, name: asset.name || 'store.jpg', mimeType: asset.mimeType || 'image/jpeg' }, { field: 'image' })).store); }

const withAssetUrls = (store: SellerStore): SellerStore => ({ ...store, profile_image_url: apiAssetUrl(store.profile_image_url), banner_image_url: apiAssetUrl(store.banner_image_url) });

export type SellerGate = '/verification' | '/pending-review' | '/(tabs)';

export function getSellerDestination(store: SellerStore): SellerGate {
  if (!store.verification_submitted_at && ['pending', 'in_progress', 'rejected'].includes(store.onboarding_status)) {
    return '/verification';
  }
  if (store.onboarding_status === 'pending_review') return '/pending-review';
  return '/(tabs)';
}

export const storeService = {
  getStore: async () => withAssetUrls((await request<{ store: SellerStore }>('/seller/store')).store),
  updateStore: async (data: UpdateStoreInput) => withAssetUrls((await request<{ store: SellerStore }>('/seller/store', { method: 'PUT', body: data })).store),
  uploadProfileImage: (asset: { uri: string; name?: string | null; mimeType?: string | null }) => upload('/seller/store/profile-image', asset),
  uploadBannerImage: (asset: { uri: string; name?: string | null; mimeType?: string | null }) => upload('/seller/store/banner-image', asset),
  socialLinks: async () => (await request<{ social_links: StoreSocialLink[] }>('/seller/store/social-links')).social_links ?? [],
  createSocialLink: async (data: Pick<StoreSocialLink, 'platform' | 'url'> & { is_active?: boolean }) => (await request<{ social_link: StoreSocialLink }>('/seller/store/social-links', { method: 'POST', body: data })).social_link,
  updateSocialLink: async (id: number, data: Partial<Pick<StoreSocialLink, 'platform' | 'url' | 'is_active'>>) => (await request<{ social_link: StoreSocialLink }>(`/seller/store/social-links/${id}`, { method: 'PUT', body: data })).social_link,
  deleteSocialLink: (id: number) => request<unknown>(`/seller/store/social-links/${id}`, { method: 'DELETE' }),
  toggleSocialLink: async (id: number) => (await request<{ social_link: StoreSocialLink }>(`/seller/store/social-links/${id}/toggle`, { method: 'POST' })).social_link,
};
