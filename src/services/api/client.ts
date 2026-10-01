import { fetch as expoFetch } from 'expo/fetch';
import { File as ExpoFile, UploadType } from 'expo-file-system';

/**
 * Small API boundary shared by every feature. Services work with unwrapped
 * Laravel `data` payloads; screens never need to know about HTTP envelopes.
 */
export const apiConfig = {
  baseUrl: (process.env.EXPO_PUBLIC_API_URL ?? 'https://api.vistaexpress.it/api').replace(/\/$/, ''),
  timeoutMs: 15_000,
};

/**
 * Laravel returns storage URLs relative to its host. Browsers resolve those
 * automatically, but React Native requires an absolute URL for Image and
 * attachment previews.
 */
export function apiAssetUrl(path?: string | null) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;

  const origin = apiConfig.baseUrl.replace(/\/api(?:\/.*)?$/, '').replace(/\/$/, '');
  return origin + (path.startsWith('/') ? path : '/' + path);
}

/** Generates an RFC 4122 version 4 key accepted by Laravel's uuid validator. */
export function createIdempotencyKey() {
  const bytes = new Uint8Array(16);
  const cryptoApi = globalThis.crypto;

  if (cryptoApi?.getRandomValues) {
    cryptoApi.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-' + hex.slice(12, 16) + '-' + hex.slice(16, 20) + '-' + hex.slice(20);
}

type ApiEnvelope<T> = { success?: boolean; message?: string; errors?: Record<string, string[]>; data?: T };

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly errors?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiError';
  }
}

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

type ApiRequestOptions = Omit<RequestInit, 'body' | 'headers'> & {
  auth?: boolean;
  body?: unknown;
  headers?: Record<string, string>;
};

export type NativeUploadFile = { uri: string; name?: string | null; mimeType?: string | null; size?: number | null };
type NativeUploadOptions = {
  auth?: boolean;
  field?: string;
  parameters?: Record<string, string>;
  headers?: Record<string, string>;
};

function endpoint(path: string) {
  return apiConfig.baseUrl + (path.startsWith('/') ? path : '/' + path);
}

export async function request<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { auth = true, body, headers, ...init } = options;
  const controller = new AbortController();
  const isFormData = typeof FormData !== 'undefined'
    && (body instanceof FormData
      || (typeof body === 'object' && body !== null && typeof (body as { append?: unknown }).append === 'function'));
  // The website does not cap upload duration. Native image/PDF uploads can
  // legitimately exceed the short JSON-request timeout on mobile networks.
  const timeout = setTimeout(() => controller.abort(), isFormData ? 90_000 : apiConfig.timeoutMs);
  const isBodyJson = body !== undefined && body !== null && typeof body !== 'string' && !isFormData;

  try {
    const response = await expoFetch(endpoint(path), {
      ...init,
      body: isBodyJson ? JSON.stringify(body) : (body as BodyInit | undefined),
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(isBodyJson ? { 'Content-Type': 'application/json' } : {}),
        ...(auth && accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...headers,
      },
    });
    const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<T>;

    if (!response.ok || payload.success === false) {
      const message = payload.message
        ?? Object.values(payload.errors ?? {}).flat()[0]
        ?? 'We could not complete that request. Please try again.';
      throw new ApiError(message, response.status, payload.errors);
    }

    return (payload.data ?? ({} as T)) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError('The request timed out. Please check your connection and try again.', 408);
    }
    throw new ApiError('Unable to reach VistaExpress. Please check your connection and try again.', 0);
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Native multipart transport for all binary uploads.
 *
 * Expo Go's legacy document picker can return a cache URI that the legacy
 * FileSystem module cannot reopen. The modern File API carries Android's
 * Storage Access Framework permission through the upload instead, so content
 * selected with File.pickFileAsync remains readable when the request starts.
 */
export async function uploadFile<T>(path: string, file: NativeUploadFile, options: NativeUploadOptions = {}): Promise<T> {
  const { auth = true, field = 'attachment', parameters = {}, headers = {} } = options;
  if (!file.uri) throw new ApiError('Choose a file before uploading.', 422);

  try {
    const source = new ExpoFile(file.uri);
    if (!source.exists) {
      throw new ApiError('The selected file is no longer available. Please choose it again.', 422);
    }

    const result = await source.upload(endpoint(path), {
      httpMethod: 'POST',
      uploadType: UploadType.MULTIPART,
      fieldName: field,
      mimeType: file.mimeType || source.type || 'application/octet-stream',
      parameters,
      headers: {
        Accept: 'application/json',
        ...(auth && accessToken ? { Authorization: 'Bearer ' + accessToken } : {}),
        ...headers,
      },
    });
    const payload = JSON.parse(result.body || '{}') as ApiEnvelope<T>;

    if (result.status < 200 || result.status >= 300 || payload.success === false) {
      const message = payload.message
        ?? Object.values(payload.errors ?? {}).flat()[0]
        ?? 'We could not complete that upload. Please try again.';
      throw new ApiError(message, result.status, payload.errors);
    }

    return (payload.data ?? ({} as T)) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error) {
      throw new ApiError('Upload failed before reaching VistaExpress: ' + error.message, 0);
    }
    throw new ApiError('Upload failed before reaching VistaExpress. Please check your connection and try again.', 0);
  }
}

export function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}
