import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { RoomPanelComponent } from './room-panel/room-panel.component';
import { CodeEditorComponent } from './code-editor/code-editor.component';
import { WhiteboardComponent } from './whiteboard/whiteboard.component';
import { ChatPanelComponent } from './chat-panel/chat-panel.component';
import { VideoChatComponent } from './video-chat/video-chat.component';

export interface Collaborator {
  name: string;
  online: boolean;
  color: string;
}

export interface ChatMessage {
  user: string;
  text: string;
  timestamp?: Date;
}

@Component({
  selector: 'app-collab-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatSnackBarModule,
    RoomPanelComponent,
    CodeEditorComponent,
    WhiteboardComponent,
    ChatPanelComponent,
    VideoChatComponent
  ],
  templateUrl: './collab-editor.component.html',
  styleUrls: ['./collab-editor.component.css']
})
export class CollabEditorComponent implements OnInit {
  isDarkMode = false;
  selectedTabIndex = 0;
  isLeftCollapsed = false;
  isRightCollapsed = false;
  
  // Broadcast states
  isCodeBroadcasting = false;
  isWhiteboardBroadcasting = false;
  viewingCodeBroadcast = false;
  viewingWhiteboardBroadcast = false;
  private snackBar = inject(MatSnackBar);

  roomData = {
    roomName: 'The Coding Den',
    roomId: 'room-123',
    collaborators: [
      { name: 'Alice Johnson', online: true, color: '#7e57c2' },
      { name: 'Bob Smith', online: true, color: '#42a5f5' },
      { name: 'Charlie Brown', online: false, color: '#ff7043' }
    ] as Collaborator[]
  };

  messages: ChatMessage[] = [
    { user: 'Alice', text: 'Hey everyone! Ready to code?', timestamp: new Date() },
    { user: 'Bob', text: "Let's do this!", timestamp: new Date() },
    { user: 'You', text: 'Sounds good!', timestamp: new Date() }
  ];

  ngOnInit(): void {
    // Initialize any services or WebSocket connections here
  }

  toggleTheme(): void {
    this.isDarkMode = !this.isDarkMode;
  }

  onTabChange(index: number): void {
    this.selectedTabIndex = index;
  }

  switchToTab(index: number): void {
    this.selectedTabIndex = index;
  }

  onNewMessage(message: ChatMessage): void {
    this.messages = [...this.messages, message];
  }

  onGoogleLogin(): void {
    console.log('Google Login clicked');
    // Implement Google OAuth logic
  }

  toggleLeft(): void {
    this.isLeftCollapsed = !this.isLeftCollapsed;
  }

  toggleRight(): void {
    this.isRightCollapsed = !this.isRightCollapsed;
  }

  toggleCodeView(): void {
    this.viewingCodeBroadcast = !this.viewingCodeBroadcast;
  }

  toggleWhiteboardView(): void {
    this.viewingWhiteboardBroadcast = !this.viewingWhiteboardBroadcast;
  }

  onCodeBroadcastChange(isBroadcasting: boolean): void {
    this.isCodeBroadcasting = isBroadcasting;
    if (isBroadcasting) {
      this.snackBar.open('Code broadcasting started', 'Dismiss', { duration: 3000 });
    } else {
      this.snackBar.open('Code broadcasting stopped', 'Dismiss', { duration: 3000 });
    }
  }

  onWhiteboardBroadcastChange(isBroadcasting: boolean): void {
    this.isWhiteboardBroadcasting = isBroadcasting;
    if (isBroadcasting) {
      this.snackBar.open('Whiteboard broadcasting started', 'Dismiss', { duration: 3000 });
      // Auto-switch to whiteboard tab when broadcasting starts
      this.selectedTabIndex = 1;
    } else {
      this.snackBar.open('Whiteboard broadcasting stopped', 'Dismiss', { duration: 3000 });
    }
  }
}
