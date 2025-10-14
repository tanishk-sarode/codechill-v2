import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RoomService } from '../../services/room.service';
import { SocketService } from '@core/services/socket.service';
import { ProgrammingLanguage } from '@core/types/room.types';

@Component({
  selector: 'app-room-test',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h2 class="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Room API Integration Test</h2>
      
      <!-- Room Service Status -->
      <div class="mb-6 p-4 rounded-md border" [class]="getStatusClass()">
        <div class="flex items-center justify-between">
          <div>
            <span class="font-medium">Room Service Status</span>
            @if (roomService.isLoading()) {
              <span class="ml-2 text-sm text-blue-600">Loading...</span>
            }
            @if (roomService.error()) {
              <div class="mt-1 text-sm text-red-600">{{ roomService.error() }}</div>
            }
          </div>
          <div class="text-right">
            <div class="text-sm text-gray-600">Rooms: {{ roomService.rooms().length }}</div>
            @if (roomService.currentRoom()) {
              <div class="text-sm text-green-600">In Room: {{ roomService.currentRoom()?.name }}</div>
            }
          </div>
        </div>
      </div>

      <!-- Actions Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <!-- Room Management -->
        <div class="space-y-4">
          <h3 class="font-semibold text-gray-900 dark:text-white">Room Management</h3>
          
          <!-- Load User Rooms -->
          <button 
            (click)="loadUserRooms()"
            [disabled]="roomService.isLoading()"
            class="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md transition-colors"
          >
            Load My Rooms
          </button>

          <!-- Load Public Rooms -->
          <button 
            (click)="loadPublicRooms()"
            [disabled]="roomService.isLoading()"
            class="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-md transition-colors"
          >
            Load Public Rooms
          </button>

          <!-- Create Test Room -->
          <div class="space-y-2">
            <input 
              [(ngModel)]="newRoomName" 
              placeholder="New room name"
              class="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            <button 
              (click)="createTestRoom()"
              [disabled]="roomService.isLoading() || !newRoomName()"
              class="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-md transition-colors"
            >
              Create Test Room
            </button>
          </div>

          <!-- Join Room -->
          <div class="space-y-2">
            <input 
              [(ngModel)]="joinRoomId" 
              placeholder="Room ID to join"
              class="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            <button 
              (click)="joinTestRoom()"
              [disabled]="roomService.isLoading() || !joinRoomId()"
              class="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white rounded-md transition-colors"
            >
              Join Room
            </button>
          </div>

          <!-- Leave Room -->
          <button 
            (click)="leaveCurrentRoom()"
            [disabled]="roomService.isLoading() || !roomService.currentRoom()"
            class="w-full px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-md transition-colors"
          >
            Leave Current Room
          </button>
        </div>

        <!-- Room Details -->
        <div class="space-y-4">
          <h3 class="font-semibold text-gray-900 dark:text-white">Current Room Details</h3>
          
          @if (roomService.currentRoom(); as room) {
            <div class="border rounded-md p-4 dark:border-gray-600">
              <h4 class="font-medium mb-2">{{ room.name }}</h4>
              <div class="text-sm space-y-1">
                <div><span class="font-medium">Language:</span> {{ room.language }}</div>
                <div><span class="font-medium">Participants:</span> {{ room.current_participants }}/{{ room.max_participants }}</div>
                <div><span class="font-medium">Private:</span> {{ room.is_private ? 'Yes' : 'No' }}</div>
                <div><span class="font-medium">Created:</span> {{ formatDate(room.created_at) }}</div>
                @if (room.description) {
                  <div><span class="font-medium">Description:</span> {{ room.description }}</div>
                }
              </div>
            </div>
          } @else {
            <div class="text-center text-gray-500 dark:text-gray-400 py-8">
              Not in any room
            </div>
          }

          <!-- Participants -->
          @if (roomService.participants().length > 0) {
            <div class="border rounded-md p-4 dark:border-gray-600">
              <h4 class="font-medium mb-2">Participants ({{ roomService.participants().length }})</h4>
              <div class="space-y-2">
                @for (participant of roomService.participants(); track participant.id) {
                  <div class="flex items-center space-x-2">
                    @if (participant.user_picture) {
                      <img [src]="participant.user_picture" [alt]="participant.user_name" class="w-6 h-6 rounded-full">
                    } @else {
                      <div class="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs">
                        {{ participant.user_name.charAt(0).toUpperCase() }}
                      </div>
                    }
                    <span class="text-sm">{{ participant.user_name }}</span>
                    <span class="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700">{{ participant.role }}</span>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      </div>

      <!-- Rooms List -->
      @if (roomService.rooms().length > 0) {
        <div class="mt-6">
          <h3 class="font-semibold text-gray-900 dark:text-white mb-4">Available Rooms ({{ roomService.rooms().length }})</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            @for (room of roomService.rooms(); track room.id) {
              <div class="border rounded-md p-4 dark:border-gray-600 hover:shadow-md transition-shadow">
                <div class="flex justify-between items-start mb-2">
                  <h4 class="font-medium truncate">{{ room.name }}</h4>
                  <span class="text-xs px-2 py-1 rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                    {{ room.language }}
                  </span>
                </div>
                @if (room.description) {
                  <p class="text-sm text-gray-600 dark:text-gray-400 mb-2 truncate">{{ room.description }}</p>
                }
                <div class="flex justify-between items-center text-xs text-gray-500">
                  <span>{{ room.current_participants }}/{{ room.max_participants }} participants</span>
                  <span>{{ formatDate(room.last_activity || room.updated_at) }}</span>
                </div>
                <button 
                  (click)="joinSpecificRoom(room.id)"
                  [disabled]="roomService.isLoading()"
                  class="mt-2 w-full px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded transition-colors"
                >
                  Join
                </button>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `
})
export class RoomTestComponent implements OnInit {
  readonly roomService = inject(RoomService);
  readonly socketService = inject(SocketService);

  newRoomName = signal<string>('Test Room ' + Date.now());
  joinRoomId = signal<string>('');

  publicRooms = signal<any[]>([]);
  isLoadingPublic = signal(false);

  ngOnInit(): void {
    // Auto-load user rooms on init
    this.loadUserRooms();
  }

  loadUserRooms(): void {
    this.roomService.getUserRooms().subscribe({
      next: (rooms) => {
        console.log('Loaded user rooms:', rooms);
      },
      error: (error) => {
        console.error('Failed to load user rooms:', error);
      }
    });
  }

  loadPublicRooms(): void {
    this.isLoadingPublic.set(true);
    this.roomService.getPublicRooms().subscribe({
      next: (response) => {
        this.publicRooms.set(response.rooms);
        // Also update the main rooms signal for display
        this.roomService['roomsSignal'].set(response.rooms);
        console.log('Loaded public rooms:', response);
        this.isLoadingPublic.set(false);
      },
      error: (error) => {
        console.error('Failed to load public rooms:', error);
        this.isLoadingPublic.set(false);
      }
    });
  }

  createTestRoom(): void {
    const roomName = this.newRoomName();
    const request = {
      name: roomName,
      description: 'Test room created from frontend integration test',
      language: 'javascript' as ProgrammingLanguage,
      is_private: false,
      max_participants: 10
    };

    this.roomService.createRoom(request).subscribe({
      next: (room) => {
        console.log('Created room:', room);
        this.newRoomName.set('Test Room ' + Date.now());
        // Auto-join the created room
        this.joinSpecificRoom(room.id);
      },
      error: (error) => {
        console.error('Failed to create room:', error);
      }
    });
  }

  joinTestRoom(): void {
    const roomId = this.joinRoomId();
    if (roomId) {
      this.joinSpecificRoom(roomId);
    }
  }

  joinSpecificRoom(roomId: string): void {
    this.roomService.joinRoom(roomId).subscribe({
      next: (room) => {
        console.log('Joined room:', room);
        this.joinRoomId.set('');
        // Get room participants
        this.roomService.getRoomParticipants(roomId).subscribe({
          next: (participants) => {
            console.log('Room participants:', participants);
          },
          error: (error) => {
            console.error('Failed to get participants:', error);
          }
        });
      },
      error: (error) => {
        console.error('Failed to join room:', error);
      }
    });
  }

  leaveCurrentRoom(): void {
    this.roomService.leaveRoom().subscribe({
      next: () => {
        console.log('Left room successfully');
      },
      error: (error) => {
        console.error('Failed to leave room:', error);
      }
    });
  }

  getStatusClass(): string {
    if (this.roomService.error()) {
      return 'border-red-300 bg-red-50 dark:bg-red-900/20';
    }
    if (this.roomService.isLoading()) {
      return 'border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20';
    }
    return 'border-green-300 bg-green-50 dark:bg-green-900/20';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString() + ' ' + new Date(dateString).toLocaleTimeString();
  }
}