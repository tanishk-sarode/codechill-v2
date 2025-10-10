import { Injectable, signal, computed, inject } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, BehaviorSubject, fromEvent } from 'rxjs';
import { map, filter } from 'rxjs/operators';
import { SocketEvents } from '@core/types';
import { EnvironmentService } from './environment.service';
import { AuthenticationService } from './authentication.service';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private readonly envService = inject(EnvironmentService);
  private readonly authService = inject(AuthenticationService);
  
  private socket: Socket | null = null;
  private readonly connectionStateSignal = signal<'disconnected' | 'connecting' | 'connected'>('disconnected');
  
  // Computed values
  readonly isConnected = computed(() => this.connectionStateSignal() === 'connected');
  readonly isConnecting = computed(() => this.connectionStateSignal() === 'connecting');
  readonly connectionState = computed(() => this.connectionStateSignal());

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

      this.setupEventListeners();
    });
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.connectionStateSignal.set('connected');
      console.log('Socket connected');
    });

    this.socket.on('disconnect', () => {
      this.connectionStateSignal.set('disconnected');
      console.log('Socket disconnected');
    });

    this.socket.on('connect_error', (error: any) => {
      this.connectionStateSignal.set('disconnected');
      console.error('Socket connection error:', error);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connectionStateSignal.set('disconnected');
    }
  }

  // Generic emit method
  emit<K extends keyof SocketEvents>(event: K, data: SocketEvents[K]): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('Socket not connected. Cannot emit event:', event);
    }
  }

  // Generic listen method
  on<K extends keyof SocketEvents>(event: K): Observable<SocketEvents[K]> {
    if (!this.socket) {
      throw new Error('Socket not initialized');
    }
    
    return fromEvent<SocketEvents[K]>(this.socket, event);
  }

  // Room-specific methods
  joinRoom(roomId: string, password?: string): void {
    this.emit('room:join', { roomId, password });
  }

  leaveRoom(roomId: string): void {
    this.emit('room:leave', { roomId });
  }

  // Editor-specific methods
  sendEditorOperation(operation: SocketEvents['editor:content-changed']): void {
    this.emit('editor:content-changed', operation);
  }

  sendCursorUpdate(cursorUpdate: SocketEvents['editor:cursor-moved']): void {
    this.emit('editor:cursor-moved', cursorUpdate);
  }

  // Chat-specific methods
  sendMessage(message: SocketEvents['chat:message-sent']): void {
    this.emit('chat:message-sent', message);
  }

  startTyping(roomId: string): void {
    this.emit('chat:typing-start', { roomId });
  }

  stopTyping(roomId: string): void {
    this.emit('chat:typing-stop', { roomId });
  }

  // Observable streams for specific events
  get roomParticipantJoined$(): Observable<SocketEvents['room:participant-joined']> {
    return this.on('room:participant-joined');
  }

  get roomParticipantLeft$(): Observable<SocketEvents['room:participant-left']> {
    return this.on('room:participant-left');
  }

  get editorContentChanged$(): Observable<SocketEvents['editor:content-changed']> {
    return this.on('editor:content-changed');
  }

  get editorCursorMoved$(): Observable<SocketEvents['editor:cursor-moved']> {
    return this.on('editor:cursor-moved');
  }

  get chatMessageReceived$(): Observable<SocketEvents['chat:message-received']> {
    return this.on('chat:message-received');
  }

  get chatTypingIndicator$(): Observable<SocketEvents['chat:typing-indicator']> {
    return this.on('chat:typing-indicator');
  }

  get errors$(): Observable<SocketEvents['error']> {
    return this.on('error');
  }
}