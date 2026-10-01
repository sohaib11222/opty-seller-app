export type ChatAttachment = { uri: string; name: string; mimeType?: string | null; size?: number | null };

export type CustomerConversation = {
  id: number;
  store_id: number;
  buyer: { id: number; name: string; email?: string; profile_image_url?: string | null } | null;
  buyer_unread_count: number;
  seller_unread_count: number;
  last_message_at: string | null;
  last_message_preview: string | null;
};

export type CustomerMessage = {
  id: number;
  store_chat_conversation_id: number;
  sender_id: number;
  body: string;
  attachment_path?: string | null;
  attachment_type?: 'image' | 'file' | string | null;
  attachment_name?: string | null;
  attachment_url?: string | null;
  created_at: string;
  sender?: { id: number; name: string } | null;
};

export type AdminConversation = { id: number; store_id: number; seller_unread_count: number; admin_unread_count: number; last_message_at?: string | null; last_message_preview: string | null };
export type AdminMessage = {
  id: number;
  admin_store_chat_conversation_id: number;
  sender_id: number;
  sender_role: 'admin' | 'seller' | string;
  body: string;
  attachment_path?: string | null;
  attachment_type?: 'image' | 'file' | string | null;
  attachment_name?: string | null;
  attachment_url?: string | null;
  created_at: string;
  sender?: { id: number; name: string } | null;
};

export type MessagePage = { conversations: CustomerConversation[]; pagination: { current_page: number; last_page: number; per_page: number; total: number } };
