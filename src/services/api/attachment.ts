import { File as ExpoFile } from 'expo-file-system';
import { translate } from '../../features/i18n/translate';

export type UploadAttachment = { uri: string; name: string; mimeType?: string | null; size?: number | null };

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', pdf: 'application/pdf',
};

const ALLOWED_MIME_TYPES = new Set(Object.values(MIME_BY_EXTENSION));
const PICKABLE_MIME_TYPES = Array.from(ALLOWED_MIME_TYPES);

/**
 * Android document providers occasionally omit `mimeType`. Laravel's file
 * validator then sees application/octet-stream and rejects an otherwise valid
 * image or PDF. Infer the type from the selected filename before multipart
 * submission, while keeping the server's allow-list as the final authority.
 */
export function attachmentMimeType(attachment: Pick<UploadAttachment, 'name' | 'mimeType'>) {
  if (attachment.mimeType && ALLOWED_MIME_TYPES.has(attachment.mimeType.toLowerCase())) return attachment.mimeType.toLowerCase();
  const extension = attachment.name.split('.').pop()?.trim().toLowerCase() ?? '';
  return MIME_BY_EXTENSION[extension] ?? null;
}

export function validateChatAttachment(attachment: UploadAttachment) {
  const mimeType = attachmentMimeType(attachment);
  if (!mimeType) throw new Error(translate('attachment.errorType'));
  if ((attachment.size ?? 0) > 5 * 1024 * 1024) throw new Error(translate('attachment.errorSize'));
  return { ...attachment, mimeType };
}

/**
 * Use Expo's modern system picker for attachments. On Android it retains the
 * SAF read grant for the selected document, unlike the legacy document-picker
 * cache URI that can become unreadable before an upload starts in Expo Go.
 */
export async function pickChatAttachment(): Promise<UploadAttachment | null> {
  const selection = await ExpoFile.pickFileAsync({ mimeTypes: PICKABLE_MIME_TYPES });
  if (selection.canceled || !selection.result) return null;

  const file = selection.result;
  if (!file.exists) {
    throw new Error(translate('attachment.errorUnreadable'));
  }

  return validateChatAttachment({
    uri: file.uri,
    name: file.name || 'attachment',
    mimeType: file.type || null,
    size: file.size,
  });
}

/**
 * Keep the React Native multipart object in one place. In particular, do not
 * set Content-Type manually: fetch adds the required multipart boundary.
 */
export function appendNativeFile(
  form: FormData,
  attachment: UploadAttachment,
  field = 'attachment',
  fallbackMimeType = 'application/octet-stream',
) {
  if (!attachment.uri) throw new Error(translate('attachment.errorMissing'));
  const mimeType = attachment.mimeType || attachmentMimeType(attachment) || fallbackMimeType;
  if (!mimeType) throw new Error(translate('attachment.errorUnknownType'));

  /*
   * Expo SDK 57 uses expo/fetch on native platforms. Its multipart encoder
   * accepts a Blob/File, not React Native's legacy { uri, name, type } part.
   * The legacy object caused native fetch to reject every binary body before
   * Laravel received it. Expo File implements Blob and keeps the URI streaming
   * instead of loading the complete image/PDF into JavaScript memory.
   */
  const file = new ExpoFile(attachment.uri);
  form.append(field, file, attachment.name || file.name || 'upload');
}

export function appendImage(form: FormData, attachment: UploadAttachment, field = 'image') {
  const mimeType = attachmentMimeType(attachment) || attachment.mimeType || 'image/jpeg';
  if (!mimeType.startsWith('image/')) throw new Error(translate('attachment.errorNotImage'));
  appendNativeFile(form, { ...attachment, mimeType }, field, 'image/jpeg');
}

export function appendAttachment(form: FormData, attachment: UploadAttachment, field = 'attachment') {
  const valid = validateChatAttachment(attachment);
  appendNativeFile(form, valid, field);
}
