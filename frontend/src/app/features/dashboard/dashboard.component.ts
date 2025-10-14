import { Component, inject, signal, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthenticationService } from '@core/services/authentication.service';
import { SocketService } from '@core/services/socket.service';
import { RoomService } from '@features/room/services/room.service';
import { ButtonComponent } from '@shared/components/button/button.component';
import { CreateRoomComponent } from '@features/room/components/create-room/create-room.component';
import { ModalComponent } from '@shared/components/modal/modal.component';
import { InputComponent } from '@shared/components/input/input.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, 
    ButtonComponent, 
    CreateRoomComponent, 
    ModalComponent, 
    InputComponent, 
    FormsModule
  ],
  template: `
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
      <!-- Header -->
      <header class="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between items-center h-16">
            <!-- Logo/Title -->
            <div class="flex items-center">
              <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
                CodeChill
              </h1>
            </div>

            <!-- User Info & Actions -->
            <div class="flex items-center space-x-4">
              @if (authService.isAuthenticated()) {
                @if (authService.user(); as user) {
                  <div class="flex items-center space-x-3">
                    @if (user.picture) {
                      <img 
                        [src]="user.picture" 
                        [alt]="user.name"
                        class="h-8 w-8 rounded-full"
                      >
                    }
                    <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {{ user.name }}
                    </span>
                  </div>
                }
                <app-button 
                  (click)="logout()"
                  variant="outline"
                  size="sm"
                  class="text-red-600 border-red-300 hover:bg-red-50"
                >
                  Logout
                </app-button>
              } @else {
                <app-button 
                  (click)="login()"
                  variant="primary"
                  size="sm"
                >
                  Login
                </app-button>
              }
            </div>
          </div>
        </div>
      </header>

      <!-- Main Content -->
      <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        @if (authService.isAuthenticated()) {
          <!-- Dashboard Content -->
          <div class="space-y-8">
            <!-- Welcome Section -->
            <div class="text-center">
              <h2 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Welcome to CodeChill!
              </h2>
              <p class="text-lg text-gray-600 dark:text-gray-400">
                Collaborate on code in real-time with developers worldwide
              </p>
            </div>

            <!-- Action Cards -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <!-- Create Room Card -->
              <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
                <div class="text-center">
                  <div class="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900 mb-4">
                    <svg class="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Create Room
                  </h3>
                  <p class="text-gray-600 dark:text-gray-400 mb-4">
                    Start a new collaborative coding session
                  </p>
                  <app-button 
                    (click)="openCreateRoom()"
                    variant="primary"
                    class="w-full"
                    [disabled]="roomService.isLoading()"
                  >
                    Create New Room
                  </app-button>
                </div>
              </div>

              <!-- Join Room Card -->
              <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
                <div class="text-center">
                  <div class="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-green-100 dark:bg-green-900 mb-4">
                    <svg class="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                  </div>
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Join Room
                  </h3>
                  <p class="text-gray-600 dark:text-gray-400 mb-4">
                    Enter an existing room by ID
                  </p>
                  <app-button 
                    (click)="openJoinRoom()"
                    variant="outline"
                    class="w-full"
                  >
                    Join Room
                  </app-button>
                </div>
              </div>
            </div>

            <!-- Recent Rooms (if any) -->
            @if (roomService.rooms().length > 0) {
              <div class="max-w-4xl mx-auto">
                <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Recent Rooms
                </h3>
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                  <div class="divide-y divide-gray-200 dark:divide-gray-700">
                    @for (room of roomService.rooms().slice(0, 5); track room.id) {
                      <div class="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <div class="flex items-center justify-between">
                          <div>
                            <h4 class="font-medium text-gray-900 dark:text-white">{{ room.name }}</h4>
                            <p class="text-sm text-gray-500 dark:text-gray-400">
                              {{ room.language }} • {{ room.current_participants }}/{{ room.max_participants }} participants
                            </p>
                          </div>
                          <app-button 
                            (click)="joinRoom(room.id)"
                            variant="outline"
                            size="sm"
                          >
                            Join
                          </app-button>
                        </div>
                      </div>
                    }
                  </div>
                </div>
              </div>
            }
          </div>
        } @else {
          <!-- Not Authenticated -->
          <div class="text-center py-12">
            <div class="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 mb-6">
              <svg class="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Please Sign In
            </h2>
            <p class="text-gray-600 dark:text-gray-400 mb-6">
              You need to be authenticated to access the dashboard
            </p>
            <app-button 
              (click)="login()"
              variant="primary"
              size="lg"
            >
              Sign In with Auth0
            </app-button>
          </div>
        }
      </main>

      <!-- Create Room Modal -->
      <app-create-room 
        #createRoomComponent
        (roomCreated)="onRoomCreated()"
      />

      <!-- Join Room Modal -->
      <app-modal
        [isOpen]="showJoinModal()"
        [config]="{ title: 'Join Room', showCloseButton: true }"
        (closeModal)="closeJoinModal()"
      >
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Room ID
            </label>
            <app-input
              [(value)]="joinRoomId"
              placeholder="Enter room ID"
              class="w-full"
            />
          </div>
          <div class="flex justify-end space-x-3">
            <app-button 
              (click)="closeJoinModal()"
              variant="outline"
            >
              Cancel
            </app-button>
            <app-button 
              (click)="submitJoinRoom()"
              variant="primary"
              [disabled]="!joinRoomId().trim()"
            >
              Join Room
            </app-button>
          </div>
        </div>
      </app-modal>

      <!-- Loading State -->
      @if (authService.isLoading()) {
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div class="bg-white dark:bg-gray-800 rounded-lg p-6 flex items-center space-x-3">
            <svg class="animate-spin h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span class="text-gray-700 dark:text-gray-300">Loading...</span>
          </div>
        </div>
      }
    </div>
  `
})
export class DashboardComponent implements OnInit {
  readonly authService = inject(AuthenticationService);
  readonly roomService = inject(RoomService);
  readonly socketService = inject(SocketService);
  private readonly router = inject(Router);

  @ViewChild('createRoomComponent') createRoomComponent!: CreateRoomComponent;

  // Modal states
  showJoinModal = signal(false);
  joinRoomId = signal('');

  ngOnInit() {
    // Load recent rooms if authenticated
    if (this.authService.isAuthenticated()) {
      this.loadRooms();
    }

    console.log('[Dashboard] Initial socket connected?', this.socketService.isConnected());
    this.socketService.connected$.subscribe(c => {
      console.log('[Dashboard] connected$ state changed:', c);
    });
  }

  login(): void {
    this.authService.login();
  }

  logout(): void {
    this.authService.logout();
  }

  openCreateRoom(): void {
    // Use ViewChild to access the create room component
    if (this.createRoomComponent) {
      this.createRoomComponent.open();
    }
  }

  openJoinRoom(): void {
    this.showJoinModal.set(true);
    this.joinRoomId.set('');
  }

  closeJoinModal(): void {
    this.showJoinModal.set(false);
    this.joinRoomId.set('');
  }

  submitJoinRoom(): void {
    const roomId = this.joinRoomId().trim();
    if (roomId) {
      this.joinRoom(roomId);
      this.closeJoinModal();
    }
  }

  joinRoom(roomId: string): void {
    // Navigate to the collaborative editor with the room ID
    this.router.navigate(['/collab'], { queryParams: { room: roomId } });
  }

  onRoomCreated(): void {
    // Refresh the rooms list
    this.loadRooms();
  }

  private loadRooms(): void {
    // Load public rooms to show recent activity
    this.roomService.getPublicRooms(1, 10).subscribe({
      next: (response: any) => {
        console.log('Loaded rooms:', response.rooms);
      },
      error: (error: any) => {
        console.error('Failed to load rooms:', error);
      }
    });
  }
}