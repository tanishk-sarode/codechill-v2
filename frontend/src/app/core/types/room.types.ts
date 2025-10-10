export interface Room {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  participants: RoomParticipant[];
  isPrivate: boolean;
  maxParticipants: number;
  language: ProgrammingLanguage;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoomParticipant {
  userId: string;
  userName: string;
  userPicture?: string;
  role: ParticipantRole;
  joinedAt: Date;
  isActive: boolean;
  cursor?: EditorCursor;
}

export interface EditorCursor {
  line: number;
  column: number;
  selection?: {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  };
}

export interface CreateRoomRequest {
  name: string;
  description?: string;
  isPrivate: boolean;
  maxParticipants: number;
  language: ProgrammingLanguage;
}

export interface JoinRoomRequest {
  roomId: string;
  password?: string;
}

export type ParticipantRole = 'owner' | 'moderator' | 'participant';

export type ProgrammingLanguage = 
  | 'javascript'
  | 'typescript'
  | 'python'
  | 'java'
  | 'cpp'
  | 'c'
  | 'csharp'
  | 'go'
  | 'rust'
  | 'php'
  | 'ruby'
  | 'html'
  | 'css'
  | 'sql'
  | 'json'
  | 'xml'
  | 'markdown';