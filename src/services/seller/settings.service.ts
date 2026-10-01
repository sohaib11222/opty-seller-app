import { request } from '../api/client';

export type PhoneVisibility = 'public' | 'request' | 'hidden';

export type StoreSettings = {
  is_active: boolean;
  phone_visibility: PhoneVisibility;
  status: string;
};

export const settingsService = {
  getSettings: async () => (await request<{ settings: StoreSettings }>('/seller/store/settings')).settings,
  updateSettings: async (settings: Partial<Pick<StoreSettings, 'is_active' | 'phone_visibility'>>) => request('/seller/store/settings', { method: 'PUT', body: settings }),
};
