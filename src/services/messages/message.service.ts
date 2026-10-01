import { apiAssetUrl, request, uploadFile } from '../api/client';
import type { AdminConversation, AdminMessage, ChatAttachment, CustomerConversation, CustomerMessage, MessagePage } from '../../types/messages';

function customerConversation(conversation: CustomerConversation): CustomerConversation {
  return {
    ...conversation,
    buyer: conversation.buyer ? { ...conversation.buyer, profile_image_url: apiAssetUrl(conversation.buyer.profile_image_url) } : null,
  };
}

function customerMessage(message: CustomerMessage): CustomerMessage {
  return { ...message, attachment_url: apiAssetUrl(message.attachment_url) };
}

function adminMessage(message: AdminMessage): AdminMessage {
  return { ...message, attachment_url: apiAssetUrl(message.attachment_url) };
}

export const messageService = {
  listCustomerConversations: (page = 1, perPage = 50) => request<MessagePage>(`/seller/chat/conversations?page=${page}&per_page=${perPage}`).then((result) => ({ ...result, conversations: (result.conversations ?? []).map(customerConversation) })),
  getCustomerConversation: (id: number) => request<{ conversation: CustomerConversation; messages: CustomerMessage[] }>(`/seller/chat/conversations/${id}`).then((result) => ({ conversation: customerConversation(result.conversation), messages: (result.messages ?? []).map(customerMessage) })),
  getCustomerMessages: (id: number, afterId?: number) => request<{ messages: CustomerMessage[] }>(`/seller/chat/conversations/${id}/messages${afterId ? `?after_id=${afterId}` : ''}`).then((result) => ({ messages: (result.messages ?? []).map(customerMessage) })),
  sendCustomerMessage: async (id: number, body: string, attachment?: ChatAttachment | null) => {
    const result = attachment
      ? await uploadFile<{ message: CustomerMessage }>(`/seller/chat/conversations/${id}/messages`, attachment, { parameters: body ? { body } : {} })
      : await request<{ message: CustomerMessage }>(`/seller/chat/conversations/${id}/messages`, { method: 'POST', body: { body } });
    return customerMessage(result.message);
  },
  getAdminConversation: () => request<{ conversation: AdminConversation; messages: AdminMessage[] }>('/seller/admin-chat').then((result) => ({ ...result, messages: (result.messages ?? []).map(adminMessage) })),
  getAdminMessages: (afterId?: number) => request<{ messages: AdminMessage[] }>(`/seller/admin-chat/messages${afterId ? `?after_id=${afterId}` : ''}`).then((result) => ({ messages: (result.messages ?? []).map(adminMessage) })),
  sendAdminMessage: async (body: string, attachment?: ChatAttachment | null) => {
    const result = attachment
      ? await uploadFile<{ message: AdminMessage }>('/seller/admin-chat/messages', attachment, { parameters: body ? { body } : {} })
      : await request<{ message: AdminMessage }>('/seller/admin-chat/messages', { method: 'POST', body: { body } });
    return adminMessage(result.message);
  },
};
