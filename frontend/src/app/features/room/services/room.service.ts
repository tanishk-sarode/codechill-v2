import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, map, tap, catchError, of, switchMap } from 'rxjs';
import { EnvironmentService } from '@core/services/environment.service';
import { AuthenticationService } from '@core/services/authentication.service';
import { SocketService } from '@core/services/socket.service';
import { Room, CreateRoomRequest, JoinRoomRequest, RoomParticipant } from '@core/types/room.types';

@Injectable({
  providedIn: 'root'
})
export class RoomService {
  private readonly http = inject(HttpClient);
  private readonly envService = inject(EnvironmentService);
  private readonly authService = inject(AuthenticationService);
  private readonly socketService = inject(SocketService);

  // Signals for state management
  private readonly roomsSignal = signal<Room[]>([]);
  private readonly currentRoomSignal = signal<Room | null>(null);
  private readonly participantsSignal = signal<RoomParticipant[]>([]);
  private readonly isLoadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  // Computed values
  readonly rooms = computed(() => this.roomsSignal());
  readonly currentRoom = computed(() => this.currentRoomSignal());
  readonly participants = computed(() => this.participantsSignal());
  readonly isLoading = computed(() => this.isLoadingSignal());
  readonly error = computed(() => this.errorSignal());
  readonly isInRoom = computed(() => !!this.currentRoomSignal());

  constructor() {
    this.setupSocketListeners();
  }

  private buildAuthOptions(token?: string): { headers?: Record<string, string> } {
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  }

  private setupSocketListeners(): void {
    // Listen for room updates from Socket.IO
    this.socketService.userJoined$.subscribe(data => {
      this.participantsSignal.update(participants => [
        ...participants,
        {
          id: data.user_id,
          room_id: data.room_id || '',
          user_id: data.user_id,
          user_name: data.user_name,
          user_picture: data.user_picture,
          role: 'participant',
          is_active: true,
          cursor_line: 1,
          cursor_column: 1,
          joined_at: new Date().toISOString()
        }
      ]);
    });

    this.socketService.userLeft$.subscribe(data => {
      this.participantsSignal.update(participants => 
        participants.filter(p => p.user_id !== data.user_id)
      );
    });

    this.socketService.roomJoined$.subscribe(data => {
      this.currentRoomSignal.update(room => {
        if (room) {
          return { ...room, ...data.room_data };
        }
        return data.room_data;
      });
    });
  }

  // Create a new room
  createRoom(request: CreateRoomRequest): Observable<Room> {
    this.isLoadingSignal.set(true);
    this.errorSignal.set(null);

    return this.authService.getAccessToken().pipe(
      switchMap(token => this.http.post<{ message: string; room: Room }>(
        `${this.envService.apiUrl}/rooms`,
        request,
        this.buildAuthOptions(token || undefined)
      )),
      map(response => response.room),
      tap(room => {
        this.roomsSignal.update(rooms => [room, ...rooms]);
        this.isLoadingSignal.set(false);
      }),
      catchError(error => {
        this.errorSignal.set(error.error?.error || error.message || 'Failed to create room');
        this.isLoadingSignal.set(false);
        throw error;
      })
    );
  }

  // Join a room
  joinRoom(roomId: string, password?: string): Observable<Room> {
    this.isLoadingSignal.set(true);
    this.errorSignal.set(null);

    return this.authService.getAccessToken().pipe(
      switchMap(token => this.http.post<{ room: Room }>(
        `${this.envService.apiUrl}/rooms/${roomId}/join`,
        { password },
        this.buildAuthOptions(token || undefined)
      )),
      map(response => response.room),
      tap(room => {
        this.currentRoomSignal.set(room);
        this.participantsSignal.set(room.participants || []);
        this.socketService.joinRoom(room.id, password);
        this.isLoadingSignal.set(false);
      }),
      catchError(error => {
        this.errorSignal.set(error.error?.error || error.message || 'Failed to join room');
        this.isLoadingSignal.set(false);
        throw error;
      })
    );
  }

  // Leave current room
  leaveRoom(): Observable<void> {
    const currentRoom = this.currentRoomSignal();
    if (!currentRoom) {
      return of(undefined);
    }

    return this.authService.getAccessToken().pipe(
      switchMap(token => this.http.post<{ message: string }>(
        `${this.envService.apiUrl}/rooms/${currentRoom.id}/leave`,
        {},
        this.buildAuthOptions(token || undefined)
      )),
      map(() => undefined),
      tap(() => {
        this.socketService.leaveRoom(currentRoom.id);
        this.currentRoomSignal.set(null);
        this.participantsSignal.set([]);
      }),
      catchError(error => {
        this.errorSignal.set(error.error?.error || error.message || 'Failed to leave room');
        throw error;
      })
    );
  }

  // Get user's rooms
  getUserRooms(): Observable<Room[]> {
    this.isLoadingSignal.set(true);

    return this.authService.getAccessToken().pipe(
      switchMap(token => this.http.get<{ rooms: Room[] }>(
        `${this.envService.apiUrl}/rooms/my-rooms`,
        this.buildAuthOptions(token || undefined)
      )),
      map(response => response.rooms),
      tap(rooms => {
        this.roomsSignal.set(rooms);
        this.isLoadingSignal.set(false);
      }),
      catchError(error => {
        this.errorSignal.set(error.error?.error || error.message || 'Failed to fetch rooms');
        this.isLoadingSignal.set(false);
        return of([]);
      })
    );
  }

  // Get public rooms
  getPublicRooms(page: number = 1, per_page: number = 20, search?: string, language?: string): Observable<{ rooms: Room[], pagination: any }> {
    this.isLoadingSignal.set(true);

    const params: any = { page: page.toString(), per_page: per_page.toString() };
    if (search) params.search = search;
    if (language) params.language = language;

    return this.http.get<{ rooms: Room[], pagination: any }>(`${this.envService.apiUrl}/rooms`, { params }).pipe(
      tap(() => {
        this.isLoadingSignal.set(false);
      }),
      catchError(error => {
        this.errorSignal.set(error.error?.error || error.message || 'Failed to fetch public rooms');
        this.isLoadingSignal.set(false);
        return of({ rooms: [], pagination: { page: 1, pages: 1, total: 0 } });
      })
    );
  }

  // Get room details
  getRoomDetails(roomId: string): Observable<Room> {
    return this.authService.getAccessToken().pipe(
      switchMap(token => this.http.get<{ room: Room }>(
        `${this.envService.apiUrl}/rooms/${roomId}`,
        this.buildAuthOptions(token || undefined)
      )),
      map(response => response.room),
      tap(room => {
        this.currentRoomSignal.set(room);
        this.participantsSignal.set(room.participants || []);
      })
    );
  }

  // Update room settings (owner only)
  updateRoom(roomId: string, updates: Partial<CreateRoomRequest>): Observable<Room> {
    return this.authService.getAccessToken().pipe(
      switchMap(token => this.http.put<{ room: Room }>(
        `${this.envService.apiUrl}/rooms/${roomId}`,
        updates,
        this.buildAuthOptions(token || undefined)
      )),
      map(response => response.room),
      tap(room => {
        this.currentRoomSignal.set(room);
        this.roomsSignal.update(rooms => 
          rooms.map(r => r.id === roomId ? room : r)
        );
      })
    );
  }

  // Delete room (owner only)
  deleteRoom(roomId: string): Observable<void> {
    return this.authService.getAccessToken().pipe(
      switchMap(token => this.http.delete<{ message: string }>(
        `${this.envService.apiUrl}/rooms/${roomId}`,
        this.buildAuthOptions(token || undefined)
      )),
      map(() => undefined),
      tap(() => {
        this.roomsSignal.update(rooms => rooms.filter(r => r.id !== roomId));
        if (this.currentRoomSignal()?.id === roomId) {
          this.currentRoomSignal.set(null);
          this.participantsSignal.set([]);
        }
      })
    );
  }

  // Get participants of a room
  getRoomParticipants(roomId: string): Observable<RoomParticipant[]> {
    return this.authService.getAccessToken().pipe(
      switchMap(token => this.http.get<{ participants: RoomParticipant[] }>(
        `${this.envService.apiUrl}/rooms/${roomId}/participants`,
        this.buildAuthOptions(token || undefined)
      )),
      map(response => response.participants),
      tap(participants => {
        this.participantsSignal.set(participants);
      })
    );
  }

  // Get current user's role in the current room
  getCurrentUserRole(): 'owner' | 'moderator' | 'participant' | null {
    const currentRoom = this.currentRoomSignal();
    const currentUser = this.authService.user();
    
    if (!currentRoom || !currentUser) {
      return null;
    }

    const participant = currentRoom.participants?.find(p => p.user_id === currentUser.id);
    return (participant?.role as any) || null;
  }

  // Check if current user can perform admin actions
  canPerformAdminActions(): boolean {
    const role = this.getCurrentUserRole();
    return role === 'owner' || role === 'moderator';
  }

  // Clear error
  clearError(): void {
    this.errorSignal.set(null);
  }
}