export interface Room {
  id: string;
  name: string;
  description?: string;
  created_by: string;
  participants?: RoomParticipant[];
  is_private: boolean;
  max_participants: number;
  current_participants: number;
  language: ProgrammingLanguage;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_activity?: string;
  content_version: number;
}

export interface RoomParticipant {
  id: string;
  room_id: string;
  user_id: string;
  user_name: string;
  user_picture?: string;
  role: ParticipantRole;
  is_active: boolean;
  cursor_line: number;
  cursor_column: number;
  selection_data?: any;
  joined_at: string;
  last_seen?: string;
}

export interface CreateRoomRequest {
  name: string;
  description?: string;
  is_private: boolean;
  max_participants: number;
  language: ProgrammingLanguage;
}

export interface JoinRoomRequest {
  room_id: string;
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