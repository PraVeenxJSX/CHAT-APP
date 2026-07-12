export interface User {
  _id: string;
  name: string;
  username?: string;
  email: string;
  avatar?: string;
  statusMessage?: string;
  dob?: string;
  showDob?: boolean;
  showOnlineStatus?: boolean;
}

export interface Reaction {
  userId: string;
  emoji: string;
}

export interface Message {
  _id: string;
  sender: { _id: string; name: string; avatar?: string };
  receiver?: { _id: string; name: string; avatar?: string };
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
  description?: string;
  admin?: string;
  admins?: string[];
  onlyAdminsCanMessage?: boolean;
  disappearingMessagesSeconds?: number;
  mutedMembers?: { userId: string; until?: string }[];
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

export interface CallInvitePayload {
  callId: string;
  type: "audio" | "video";
  conversationId?: string;
  fromUserId: string;
  caller: { _id: string; name: string; avatar?: string };
}

export interface CallAcceptedPayload {
  callId: string;
  acceptedBy: { _id: string; name: string; avatar?: string };
}

export interface CallRejectedPayload {
  callId: string;
  by: string;
  reason?: string;
}

export interface CallBusyPayload {
  callId: string;
  by: string;
}

export interface CallCanceledPayload {
  callId: string;
}

export interface CallOfferPayload {
  callId: string;
  to: string;
  from: string;
  sdp: RTCSessionDescriptionInit;
}

export interface CallAnswerPayload {
  callId: string;
  to: string;
  from: string;
  sdp: RTCSessionDescriptionInit;
}

export interface CallIcePayload {
  callId: string;
  to: string;
  from: string;
  candidate: RTCIceCandidateInit;
}

export interface CallTogglePayload {
  callId: string;
  from: string;
  kind: "mic" | "cam";
  enabled: boolean;
}

export interface CallHangupPayload {
  callId: string;
  by: string;
}

export type CallTarget =
  | { kind: "direct"; partnerId: string }
  | { kind: "group"; conversationId: string };

