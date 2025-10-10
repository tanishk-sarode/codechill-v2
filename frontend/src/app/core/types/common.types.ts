// Socket.IO event types
export interface SocketEvents {
  // Room events
  'room:join': JoinRoomRequest;
  'room:leave': { roomId: string };
  'room:participant-joined': RoomParticipant;
  'room:participant-left': { userId: string; roomId: string };
  'room:updated': Room;
  
  // Editor events
  'editor:content-changed': EditorOperation;
  'editor:cursor-moved': EditorCursorUpdate;
  'editor:selection-changed': EditorCursorUpdate;
  'editor:sync-content': EditorContent;
  
  // Chat events
  'chat:message-sent': SendMessageRequest;
  'chat:message-received': ChatMessage;
  'chat:typing-start': { roomId: string };
  'chat:typing-stop': { roomId: string };
  'chat:typing-indicator': TypingIndicator;
  
  // System events
  'connect': void;
  'disconnect': void;
  'error': { message: string; code?: string };
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: Date;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Environment configuration
export interface Environment {
  production: boolean;
  apiUrl: string;
  socketUrl: string;
  auth0: {
    domain: string;
    clientId: string;
    audience: string;
  };
  github: {
    clientId: string;
  };
}

import { Room, RoomParticipant, JoinRoomRequest } from './room.types';
import { ChatMessage, SendMessageRequest, TypingIndicator } from './chat.types';
import { EditorContent, EditorOperation, EditorCursorUpdate } from './editor.types';