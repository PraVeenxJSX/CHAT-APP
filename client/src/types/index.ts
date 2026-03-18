export interface User {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  statusMessage?: string;
}

export interface Reaction {
  userId: string;
  emoji: string;
}

export interface Message {
  _id: string;
  sender: { _id: string; name: string; avatar?: string };
  receiver: { _id: string; name: string; avatar?: string };
  conversationId?: string;
  content?: string;
  type: "text" | "image" | "file" | "audio" | "sticker";
  fileUrl?: string;
  fileType?: string;
  status: "sent" | "delivered" | "read";
  reactions?: Reaction[];
  createdAt: string;
  updatedAt?: string;
}

export interface Conversation {
  _id: string;
  type: "direct" | "group";
  participants: User[];
  name?: string;
  avatar?: string;
  admin?: string;
  lastMessage?: Message;
  unreadCount?: number;
  createdAt: string;
}

export interface SendMessagePayload {
  receiver?: string;
  conversationId?: string;
  content?: string;
  type: "text" | "image" | "file" | "audio" | "sticker";
  fileUrl?: string;
  fileType?: string;
}

export interface TypingPayload {
  receiver?: string;
  conversationId?: string;
}
