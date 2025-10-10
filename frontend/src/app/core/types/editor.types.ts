export interface EditorContent {
  roomId: string;
  content: string;
  language: string;
  version: number;
  lastModified: Date;
  lastModifiedBy: string;
}

export interface EditorOperation {
  type: OperationType;
  position: EditorPosition;
  content?: string;
  length?: number;
  userId: string;
  timestamp: Date;
}

export interface EditorPosition {
  line: number;
  column: number;
}

export interface EditorSelection {
  start: EditorPosition;
  end: EditorPosition;
}

export interface EditorCursorUpdate {
  userId: string;
  userName: string;
  position: EditorPosition;
  selection?: EditorSelection;
  roomId: string;
}

export interface CodeExecutionRequest {
  code: string;
  language: string;
  input?: string;
}

export interface CodeExecutionResult {
  output: string;
  error?: string;
  executionTime: number;
  memoryUsage?: number;
  exitCode: number;
}

export type OperationType = 'insert' | 'delete' | 'replace';