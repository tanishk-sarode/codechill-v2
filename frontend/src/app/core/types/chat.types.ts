export interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  userPicture?: string;
  content: string;
  type: MessageType;
  timestamp: Date;
  isEdited: boolean;
  editedAt?: Date;
  replyTo?: string;
}

export interface TypingIndicator {
  userId: string;
  userName: string;
  roomId: string;
}

export interface SendMessageRequest {
  roomId: string;
  content: string;
  type: MessageType;
  replyTo?: string;
}

export type MessageType = 'text' | 'code' | 'system' | 'file';