import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, map, tap, catchError, of, switchMap } from 'rxjs';
import { Room, RoomParticipant, CreateRoomRequest, JoinRoomRequest, ApiResponse, PaginatedResponse } from '@core/types';
import { EnvironmentService } from '@core/services/environment.service';
import { AuthenticationService } from '@core/services/authentication.service';
import { SocketService } from '@core/services/socket.service';

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

  private setupSocketListeners(): void {
    // Listen for room updates
    this.socketService.roomParticipantJoined$.subscribe(participant => {
      this.participantsSignal.update(participants => [...participants, participant]);
    });

    this.socketService.roomParticipantLeft$.subscribe(({ userId }) => {
      this.participantsSignal.update(participants => 
        participants.filter(p => p.userId !== userId)
      );
    });
  }

  // Create a new room
  createRoom(request: CreateRoomRequest): Observable<Room> {
    this.isLoadingSignal.set(true);
    this.errorSignal.set(null);

    return this.authService.getAccessToken().pipe(
      switchMap(token => {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        return this.http.post<ApiResponse<Room>>(`${this.envService.apiUrl}/rooms`, request, { headers });
      }),
      map(response => response.data!),
      tap(room => {
        this.roomsSignal.update(rooms => [room, ...rooms]);
        this.isLoadingSignal.set(false);
      }),
      catchError(error => {
        this.errorSignal.set(error.message || 'Failed to create room');
        this.isLoadingSignal.set(false);
        throw error;
      })
    );
  }

  // Join a room
  joinRoom(request: JoinRoomRequest): Observable<Room> {
    this.isLoadingSignal.set(true);
    this.errorSignal.set(null);

    return this.authService.getAccessToken().pipe(
      switchMap(token => {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        return this.http.post<ApiResponse<Room>>(`${this.envService.apiUrl}/rooms/${request.roomId}/join`, request, { headers });
      }),
      map(response => response.data!),
      tap(room => {
        this.currentRoomSignal.set(room);
        this.participantsSignal.set(room.participants);
        this.socketService.joinRoom(room.id, request.password);
        this.isLoadingSignal.set(false);
      }),
      catchError(error => {
        this.errorSignal.set(error.message || 'Failed to join room');
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
      switchMap(token => {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        return this.http.post<ApiResponse<void>>(`${this.envService.apiUrl}/rooms/${currentRoom.id}/leave`, {}, { headers });
      }),
      map(() => undefined),
      tap(() => {
        this.socketService.leaveRoom(currentRoom.id);
        this.currentRoomSignal.set(null);
        this.participantsSignal.set([]);
      }),
      catchError(error => {
        this.errorSignal.set(error.message || 'Failed to leave room');
        throw error;
      })
    );
  }

  // Get user's rooms
  getUserRooms(page: number = 1, limit: number = 10): Observable<Room[]> {
    this.isLoadingSignal.set(true);

    return this.authService.getAccessToken().pipe(
      switchMap(token => {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const params = { page: page.toString(), limit: limit.toString() };
        return this.http.get<PaginatedResponse<Room>>(`${this.envService.apiUrl}/rooms/my-rooms`, { headers, params });
      }),
      map(response => response.data!),
      tap(rooms => {
        this.roomsSignal.set(rooms);
        this.isLoadingSignal.set(false);
      }),
      catchError(error => {
        this.errorSignal.set(error.message || 'Failed to fetch rooms');
        this.isLoadingSignal.set(false);
        return of([]);
      })
    );
  }

  // Search public rooms
  searchRooms(query: string = '', page: number = 1, limit: number = 10): Observable<Room[]> {
    this.isLoadingSignal.set(true);

    const params = { 
      q: query, 
      page: page.toString(), 
      limit: limit.toString(),
      type: 'public'
    };

    return this.http.get<PaginatedResponse<Room>>(`${this.envService.apiUrl}/rooms/search`, { params }).pipe(
      map(response => response.data!),
      tap(rooms => {
        this.isLoadingSignal.set(false);
      }),
      catchError(error => {
        this.errorSignal.set(error.message || 'Failed to search rooms');
        this.isLoadingSignal.set(false);
        return of([]);
      })
    );
  }

  // Get room details
  getRoomDetails(roomId: string): Observable<Room> {
    return this.authService.getAccessToken().pipe(
      switchMap(token => {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        return this.http.get<ApiResponse<Room>>(`${this.envService.apiUrl}/rooms/${roomId}`, { headers });
      }),
      map(response => response.data!),
      tap(room => {
        this.currentRoomSignal.set(room);
        this.participantsSignal.set(room.participants);
      })
    );
  }

  // Update room settings (owner only)
  updateRoom(roomId: string, updates: Partial<Room>): Observable<Room> {
    return this.authService.getAccessToken().pipe(
      switchMap(token => {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        return this.http.patch<ApiResponse<Room>>(`${this.envService.apiUrl}/rooms/${roomId}`, updates, { headers });
      }),
      map(response => response.data!),
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
      switchMap(token => {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        return this.http.delete<ApiResponse<void>>(`${this.envService.apiUrl}/rooms/${roomId}`, { headers });
      }),
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

  // Get current user's role in the current room
  getCurrentUserRole(): 'owner' | 'moderator' | 'participant' | null {
    const currentRoom = this.currentRoomSignal();
    const currentUser = this.authService.user();
    
    if (!currentRoom || !currentUser) {
      return null;
    }

    const participant = currentRoom.participants.find(p => p.userId === currentUser.id);
    return participant?.role || null;
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