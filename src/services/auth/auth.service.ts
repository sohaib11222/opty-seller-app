import { request } from '../api/client';

export type SellerUser = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: 'seller';
  profile_image_url?: string | null;
  email_verified_at?: string | null;
  phone_verified_at?: string | null;
};

export type Credentials = { email: string; password: string };

export type SellerRegistration = Credentials & {
  name: string;
  phone: string;
  passwordConfirmation: string;
};

export type BusinessVerification = {
  businessType: string;
  businessRegistration: string;
  taxId?: string;
  businessAddress: string;
  website?: string;
  idDocumentUrl?: string;
};

type AuthResponse = { user: SellerUser; token: string; email_verification_required?: boolean; verification_dispatched?: boolean };

export const authService = {
  signIn: (credentials: Credentials) => request<AuthResponse>('/seller/auth/login', { method: 'POST', auth: false, body: credentials }),
  register: (details: SellerRegistration) => request<AuthResponse>('/seller/auth/register', {
    method: 'POST',
    auth: false,
    body: {
      name: details.name,
      email: details.email,
      phone: details.phone,
      password: details.password,
      password_confirmation: details.passwordConfirmation,
    },
  }),
  signOut: () => request('/seller/auth/logout', { method: 'POST' }),
  requestPasswordReset: (email: string) => request('/seller/auth/forgot-password', { method: 'POST', auth: false, body: { email } }),
  verifyPasswordResetCode: (email: string, code: string) => request<{ reset_token: string }>('/seller/auth/verify-reset-code', {
    method: 'POST',
    auth: false,
    body: { email, code },
  }),
  resetPassword: (email: string, resetToken: string, password: string, passwordConfirmation: string) => request('/seller/auth/reset-password', {
    method: 'POST',
    auth: false,
    body: { email, reset_token: resetToken, password, password_confirmation: passwordConfirmation },
  }),
  getProfile: () => request<{ user: SellerUser }>('/seller/profile'),
  sendEmailVerification: () => request('/seller/profile/verify-email/send', { method: 'POST' }),
  verifyEmail: (code: string) => request<{ user: SellerUser }>('/seller/profile/verify-email', { method: 'POST', body: { code } }),
  submitBusinessVerification: (details: BusinessVerification) => request('/seller/verification/submit', {
    method: 'POST',
    body: {
      business_type: details.businessType,
      business_registration: details.businessRegistration,
      tax_id: details.taxId || undefined,
      business_address: details.businessAddress,
      website: details.website || undefined,
      id_document_url: details.idDocumentUrl || undefined,
    },
  }),
};
