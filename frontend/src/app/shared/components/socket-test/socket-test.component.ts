import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SocketService } from '@core/services/socket.service';
import { Subscription } from 'rxjs';

interface SocketEvent {
  timestamp: Date;
  event: string;
  data: any;
  type: 'sent' | 'received';
}

@Component({
  selector: 'app-socket-test',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h2 class="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Socket.IO Real-time Test</h2>
      
      <!-- Connection Status -->
      <div class="mb-6 p-4 rounded-md border" [class]="getConnectionClass()">
        <div class="flex items-center space-x-2">
          <div class="w-3 h-3 rounded-full" [class]="getStatusIndicatorClass()"></div>
          <span class="font-medium">{{ getConnectionText() }}</span>
        </div>
        @if (socketService.currentRoom()) {
          <div class="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Current Room: <span class="font-mono">{{ socketService.currentRoom() }}</span>
          </div>
        }
      </div>

      <!-- Test Actions -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <!-- Room Actions -->
        <div class="space-y-3">
          <h3 class="font-semibold text-gray-900 dark:text-white">Room Actions</h3>
          
          <div class="flex space-x-2">
            <input 
              [(ngModel)]="testRoomId" 
              placeholder="Room ID (e.g., test-room)"
              class="flex-1 px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            <button 
              (click)="joinTestRoom()"
              [disabled]="!socketService.isConnected() || !testRoomId"
              class="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-md transition-colors"
            >
              Join Room
            </button>
          </div>
          
          <button 
            (click)="leaveRoom()"
            [disabled]="!socketService.isConnected() || !socketService.currentRoom()"
            class="w-full px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-md transition-colors"
          >
            Leave Room
          </button>
          
          <button 
            (click)="getRoomState()"
            [disabled]="!socketService.isConnected()"
            class="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md transition-colors"
          >
            Get Room State
          </button>
        </div>

        <!-- Message Actions -->
        <div class="space-y-3">
          <h3 class="font-semibold text-gray-900 dark:text-white">Chat Actions</h3>
          
          <div class="flex space-x-2">
            <input 
              [(ngModel)]="testMessage" 
              placeholder="Test message"
              class="flex-1 px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              (keyup.enter)="sendTestMessage()"
            />
            <button 
              (click)="sendTestMessage()"
              [disabled]="!socketService.isConnected() || !testMessage || !socketService.currentRoom()"
              class="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-md transition-colors"
            >
              Send
            </button>
          </div>

          <button 
            (click)="sendCodeChange()"
            [disabled]="!socketService.isConnected() || !socketService.currentRoom()"
            class="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white rounded-md transition-colors"
          >
            Send Code Change
          </button>

          <button 
            (click)="executeCode()"
            [disabled]="!socketService.isConnected() || !socketService.currentRoom()"
            class="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-md transition-colors"
          >
            Execute Test Code
          </button>
        </div>
      </div>

      <!-- Event Log -->
      <div class="border rounded-md dark:border-gray-600">
        <div class="p-3 bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600 flex justify-between items-center">
          <h3 class="font-semibold text-gray-900 dark:text-white">Event Log</h3>
          <button 
            (click)="clearLog()"
            class="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
          >
            Clear
          </button>
        </div>
        
        <div class="h-96 overflow-y-auto p-3 space-y-2">
          @if (events().length === 0) {
            <div class="text-center text-gray-500 dark:text-gray-400 py-8">
              No events yet. Connect and interact to see real-time events.
            </div>
          }
          
          @for (event of events(); track event.timestamp) {
            <div class="border rounded p-3" [class]="getEventClass(event.type)">
              <div class="flex justify-between items-start">
                <div class="flex-1">
                  <div class="flex items-center space-x-2">
                    <span class="font-mono text-sm" [class]="getEventTypeClass(event.type)">
                      {{ event.type.toUpperCase() }}
                    </span>
                    <span class="font-medium">{{ event.event }}</span>
                  </div>
                  <pre class="mt-2 text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto">{{ formatEventData(event.data) }}</pre>
                </div>
                <span class="text-xs text-gray-500 ml-4">
                  {{ formatTime(event.timestamp) }}
                </span>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class SocketTestComponent implements OnInit, OnDestroy {
  readonly socketService = inject(SocketService);
  
  events = signal<SocketEvent[]>([]);
  testRoomId = signal<string>('test-room');
  testMessage = signal<string>('Hello from Socket.IO!');
  
  private subscriptions: Subscription[] = [];

  ngOnInit(): void {
    this.setupEventListeners();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private setupEventListeners(): void {
    // Room events
    this.subscriptions.push(
      this.socketService.roomJoined$.subscribe(data => {
        this.addEvent('room_joined', data, 'received');
      })
    );

    this.subscriptions.push(
      this.socketService.roomLeft$.subscribe(data => {
        this.addEvent('room_left', data, 'received');
      })
    );

    this.subscriptions.push(
      this.socketService.userJoined$.subscribe(data => {
        this.addEvent('user_joined', data, 'received');
      })
    );

    this.subscriptions.push(
      this.socketService.userLeft$.subscribe(data => {
        this.addEvent('user_left', data, 'received');
      })
    );

    // Editor events
    this.subscriptions.push(
      this.socketService.codeUpdated$.subscribe(data => {
        this.addEvent('code_updated', data, 'received');
      })
    );

    this.subscriptions.push(
      this.socketService.codeChangeAck$.subscribe(data => {
        this.addEvent('code_change_ack', data, 'received');
      })
    );

    this.subscriptions.push(
      this.socketService.cursorMoved$.subscribe(data => {
        this.addEvent('cursor_moved', data, 'received');
      })
    );

    // Chat events
    this.subscriptions.push(
      this.socketService.newMessage$.subscribe(data => {
        this.addEvent('new_message', data, 'received');
      })
    );

    // Execution events
    this.subscriptions.push(
      this.socketService.executionStarted$.subscribe(data => {
        this.addEvent('execution_started', data, 'received');
      })
    );

    this.subscriptions.push(
      this.socketService.executionQueued$.subscribe(data => {
        this.addEvent('execution_queued', data, 'received');
      })
    );

    // Room state
    this.subscriptions.push(
      this.socketService.roomState$.subscribe(data => {
        this.addEvent('room_state', data, 'received');
      })
    );

    // Errors
    this.subscriptions.push(
      this.socketService.errors$.subscribe(data => {
        this.addEvent('error', data, 'received');
      })
    );
  }

  private addEvent(event: string, data: any, type: 'sent' | 'received'): void {
    this.events.update(events => [
      ...events,
      {
        timestamp: new Date(),
        event,
        data,
        type
      }
    ].slice(-50)); // Keep only last 50 events
  }

  joinTestRoom(): void {
    const roomId = this.testRoomId();
    if (roomId) {
      this.socketService.joinRoom(roomId);
      this.addEvent('join_room', { room_id: roomId }, 'sent');
    }
  }

  leaveRoom(): void {
    this.socketService.leaveRoom();
    this.addEvent('leave_room', {}, 'sent');
  }

  getRoomState(): void {
    this.socketService.getRoomState();
    this.addEvent('get_room_state', {}, 'sent');
  }

  sendTestMessage(): void {
    const message = this.testMessage();
    if (message) {
      this.socketService.sendMessage(message);
      this.addEvent('send_message', { content: message }, 'sent');
      this.testMessage.set('');
    }
  }

  sendCodeChange(): void {
    const testCode = `console.log("Hello from Socket.IO at ${new Date().toLocaleTimeString()}!");`;
    this.socketService.sendCodeChange(testCode, Date.now());
    this.addEvent('code_change', { content: testCode, version: Date.now() }, 'sent');
  }

  executeCode(): void {
    const testCode = 'console.log("Test execution from Socket.IO!");';
    this.socketService.executeCode(testCode, 'javascript');
    this.addEvent('execute_code', { source_code: testCode, language: 'javascript' }, 'sent');
  }

  clearLog(): void {
    this.events.set([]);
  }

  getConnectionClass(): string {
    const state = this.socketService.connectionState();
    switch (state) {
      case 'connected': return 'border-green-300 bg-green-50 dark:bg-green-900/20';
      case 'connecting': return 'border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20';
      case 'disconnected': return 'border-red-300 bg-red-50 dark:bg-red-900/20';
      default: return 'border-gray-300 bg-gray-50 dark:bg-gray-700';
    }
  }

  getStatusIndicatorClass(): string {
    const state = this.socketService.connectionState();
    switch (state) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500 animate-pulse';
      case 'disconnected': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  }

  getConnectionText(): string {
    const state = this.socketService.connectionState();
    switch (state) {
      case 'connected': return 'Connected to Socket.IO server';
      case 'connecting': return 'Connecting to Socket.IO server...';
      case 'disconnected': return 'Disconnected from Socket.IO server';
      default: return 'Unknown connection state';
    }
  }

  getEventClass(type: 'sent' | 'received'): string {
    return type === 'sent' 
      ? 'border-blue-200 bg-blue-50 dark:bg-blue-900/20' 
      : 'border-green-200 bg-green-50 dark:bg-green-900/20';
  }

  getEventTypeClass(type: 'sent' | 'received'): string {
    return type === 'sent' 
      ? 'text-blue-600 dark:text-blue-400' 
      : 'text-green-600 dark:text-green-400';
  }

  formatEventData(data: any): string {
    return JSON.stringify(data, null, 2);
  }

  formatTime(timestamp: Date): string {
    return timestamp.toLocaleTimeString();
  }
}