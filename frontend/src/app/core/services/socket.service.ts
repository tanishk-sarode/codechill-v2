import { Injectable, signal, computed, inject } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, BehaviorSubject, fromEvent } from 'rxjs';
import { map, filter, switchMap } from 'rxjs/operators';
import { EnvironmentService } from './environment.service';
import { AuthenticationService } from './authentication.service';

// Backend Socket.IO events (matching our backend implementation)
interface BackendSocketEvents {
  // Connection events
  'connect': void;
  'disconnect': void;
  'connected': { message: string };
  'error': { message: string };
  
  // Room events
  'join_room': { room_id: string; password?: string };
  'leave_room': { room_id?: string };
  'room_joined': { room_id: string; room_data: any; current_content: string; content_version: number };
  'room_left': { room_id: string };
  'user_joined': { user_id: string; user_name: string; user_picture: string; room_id: string };
  'user_left': { user_id: string; room_id: string };
  
  // Code editing events
  'code_change': { content: string; version: number; cursor_position?: any };
  'code_updated': { content: string; version: number; user_id: string; cursor_position?: any };
  'code_change_ack': { version: number; success: boolean };
  'code_conflict': { current_content: string; current_version: number };
  'cursor_update': { cursor_position: any };
  'cursor_moved': { user_id: string; cursor_position: any };
  
  // Chat events
  'send_message': { content: string; type?: string };
  'new_message': any; // Message object
  
  // Code execution events
  'execute_code': { source_code: string; language: string; input?: string };
  'execution_started': { execution_id: string; user_id: string; language: string };
  'execution_queued': { execution_id: string; message: string };
  
  // State events
  'get_room_state': { room_id?: string };
  'room_state': { room: any; content: string; version: number; participants: any[]; recent_messages: any[] };
}

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private readonly envService = inject(EnvironmentService);
  private readonly authService = inject(AuthenticationService);
  
  private socket: Socket | null = null;
  private socketSubject = new BehaviorSubject<Socket | null>(null);
  private connectedSubject = new BehaviorSubject<boolean>(false);
  readonly connected$ = this.connectedSubject.asObservable();
  private readonly connectionStateSignal = signal<'disconnected' | 'connecting' | 'connected'>('disconnected');
  private readonly currentRoomSignal = signal<string | null>(null);
  
  // Computed values
  readonly isConnected = computed(() => this.connectionStateSignal() === 'connected');
  readonly isConnecting = computed(() => this.connectionStateSignal() === 'connecting');
  readonly connectionState = computed(() => this.connectionStateSignal());
  readonly currentRoom = computed(() => this.currentRoomSignal());

  constructor() {
    // Auto-connect when user is authenticated
    this.authService.isAuthenticated$.subscribe(isAuthenticated => {
      if (isAuthenticated && !this.socket) {
        this.connect();
      } else if (!isAuthenticated && this.socket) {
        this.disconnect();
      }
    });
  }

  connect(): void {
    if (this.socket?.connected) {
      return;
    }

    this.connectionStateSignal.set('connecting');

    this.authService.getAccessToken().subscribe(token => {
      this.socket = io(this.envService.socketUrl, {
        auth: {
          token
        },
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });
      this.socketSubject.next(this.socket);
      this.setupEventListeners();
    });
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.connectionStateSignal.set('connected');
      this.connectedSubject.next(true);
      console.log('Socket connected');
    });

    this.socket.on('connected', (data) => {
      console.log('Backend confirmed connection:', data.message);
    });

    this.socket.on('disconnect', () => {
      this.connectionStateSignal.set('disconnected');
      this.currentRoomSignal.set(null);
      this.connectedSubject.next(false);
      console.log('Socket disconnected');
    });

    this.socket.on('connect_error', (error: any) => {
      this.connectionStateSignal.set('disconnected');
      this.connectedSubject.next(false);
      console.error('Socket connection error:', error);
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error.message);
    });

    // Room event listeners
    this.socket.on('room_joined', (data) => {
      this.currentRoomSignal.set(data.room_id);
      console.log('Joined room:', data.room_id);
    });

    this.socket.on('room_left', (data) => {
      this.currentRoomSignal.set(null);
      console.log('Left room:', data.room_id);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.socketSubject.next(null);
      this.connectionStateSignal.set('disconnected');
      this.currentRoomSignal.set(null);
      this.connectedSubject.next(false);
    }
  }

  // Generic emit method
  emit<K extends keyof BackendSocketEvents>(event: K, data: BackendSocketEvents[K]): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('Socket not connected. Cannot emit event:', event);
    }
  }

  // Generic listen method
  on<K extends keyof BackendSocketEvents>(event: K): Observable<BackendSocketEvents[K]> {
    // If socket already exists, return immediate event stream
    if (this.socket) {
      return fromEvent<BackendSocketEvents[K]>(this.socket, event);
    }
    // Defer subscription until socket is created
    return this.socketSubject.pipe(
      filter((s): s is Socket => !!s),
      switchMap(sock => fromEvent<BackendSocketEvents[K]>(sock, event))
    );
  }

  // Room-specific methods
  joinRoom(roomId: string, password?: string): void {
    this.emit('join_room', { room_id: roomId, password });
  }

  leaveRoom(roomId?: string): void {
    this.emit('leave_room', { room_id: roomId });
  }

  getRoomState(roomId?: string): void {
    this.emit('get_room_state', { room_id: roomId });
  }

  // Editor-specific methods
  sendCodeChange(content: string, version: number, cursorPosition?: any): void {
    this.emit('code_change', { content, version, cursor_position: cursorPosition });
  }

  sendCursorUpdate(cursorPosition: any): void {
    this.emit('cursor_update', { cursor_position: cursorPosition });
  }

  // Chat-specific methods
  sendMessage(content: string, type: string = 'text'): void {
    this.emit('send_message', { content, type });
  }

  // Code execution methods
  executeCode(sourceCode: string, language: string, input?: string): void {
    this.emit('execute_code', { source_code: sourceCode, language, input });
  }

  // Observable streams for specific events
  get userJoined$(): Observable<BackendSocketEvents['user_joined']> {
    return this.on('user_joined');
  }

  get userLeft$(): Observable<BackendSocketEvents['user_left']> {
    return this.on('user_left');
  }

  get codeUpdated$(): Observable<BackendSocketEvents['code_updated']> {
    return this.on('code_updated');
  }

  get codeChangeAck$(): Observable<BackendSocketEvents['code_change_ack']> {
    return this.on('code_change_ack');
  }

  get codeConflict$(): Observable<BackendSocketEvents['code_conflict']> {
    return this.on('code_conflict');
  }

  get cursorMoved$(): Observable<BackendSocketEvents['cursor_moved']> {
    return this.on('cursor_moved');
  }

  get newMessage$(): Observable<BackendSocketEvents['new_message']> {
    return this.on('new_message');
  }

  get executionStarted$(): Observable<BackendSocketEvents['execution_started']> {
    return this.on('execution_started');
  }

  get executionQueued$(): Observable<BackendSocketEvents['execution_queued']> {
    return this.on('execution_queued');
  }

  get roomState$(): Observable<BackendSocketEvents['room_state']> {
    return this.on('room_state');
  }

  get roomJoined$(): Observable<BackendSocketEvents['room_joined']> {
    return this.on('room_joined');
  }

  get roomLeft$(): Observable<BackendSocketEvents['room_left']> {
    return this.on('room_left');
  }

  get errors$(): Observable<BackendSocketEvents['error']> {
    return this.on('error');
  }
}