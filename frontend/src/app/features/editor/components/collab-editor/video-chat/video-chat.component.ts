import { Component, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';

interface Participant {
  id: string;
  name: string;
  videoEnabled: boolean;
  audioEnabled: boolean;
  avatar?: string;
}

@Component({
  selector: 'app-video-chat',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatDividerModule
  ],
  template: `
    <div class="video-chat-container" [class.collapsed]="isCollapsed()">
      <!-- Video Chat Header -->
      <div class="video-header">
        <div class="header-left">
          <mat-icon class="video-icon">videocam</mat-icon>
          <span class="title">Video Call</span>
          <span class="participant-count">({{ participants().length }})</span>
        </div>

        <div class="app-title">
            <mat-icon class="brand-icon">code</mat-icon>
            <span class="brand-text">CodeChill</span>
        </div>
        
        <div class="header-controls">
          <!-- Local Controls -->
          <div class="control-group">
            <button 
              mat-fab 
              [class.active]="localVideo()"
              [class.inactive]="!localVideo()"
              (click)="toggleVideo()"
              [matTooltip]="localVideo() ? 'Turn off camera' : 'Turn on camera'"
              class="control-btn video-btn">
              <mat-icon>{{ localVideo() ? 'videocam' : 'videocam_off' }}</mat-icon>
            </button>
            
            <button 
              mat-fab 
              [class.active]="localAudio()"
              [class.inactive]="!localAudio()"
              (click)="toggleAudio()"
              [matTooltip]="localAudio() ? 'Mute microphone' : 'Unmute microphone'"
              class="control-btn audio-btn">
              <mat-icon>{{ localAudio() ? 'mic' : 'mic_off' }}</mat-icon>
            </button>
          </div>
          
          <mat-divider [vertical]="true"></mat-divider>
          
          <!-- Broadcast Controls -->
          <div class="control-group">
            <button 
              mat-fab 
              [class.broadcasting]="broadcastingCode()"
              (click)="toggleCodeBroadcast()"
              matTooltip="Share/Stop sharing code editor"
              class="control-btn broadcast-btn code-broadcast">
              <mat-icon>{{ broadcastingCode() ? 'stop_screen_share' : 'screen_share' }}</mat-icon>
            </button>
            
            <button 
              mat-fab 
              [class.broadcasting]="broadcastingWhiteboard()"
              (click)="toggleWhiteboardBroadcast()"
              matTooltip="Share/Stop sharing whiteboard"
              class="control-btn broadcast-btn whiteboard-broadcast">
              <mat-icon>{{ broadcastingWhiteboard() ? 'stop_screen_share' : 'draw' }}</mat-icon>
            </button>
          </div>
          
          <mat-divider [vertical]="true"></mat-divider>
          
          <!-- Collapse Toggle -->
          <button 
            mat-fab 
            (click)="toggleCollapse()"
            [matTooltip]="isCollapsed() ? 'Expand video chat' : 'Collapse video chat'"
            class="control-btn collapse-btn">
            <mat-icon>{{ isCollapsed() ? 'expand_more' : 'expand_less' }}</mat-icon>
          </button>
        </div>
      </div>

      <!-- Video Grid (hidden when collapsed) -->
      <div class="video-content" *ngIf="!isCollapsed()">
        <div class="video-grid" [class]="'grid-' + getGridClass()">
          <!-- Local Video -->
          <div class="video-tile local-video">
            <div class="video-placeholder" *ngIf="!localVideo()">
              <div class="avatar">
                <mat-icon>person</mat-icon>
              </div>
              <span class="name">You</span>
            </div>
            <video *ngIf="localVideo()" autoplay muted playsinline class="video-stream"></video>
            <div class="video-overlay">
              <div class="name-tag">You</div>
              <div class="status-indicators">
                <mat-icon *ngIf="!localAudio()" class="muted-icon">mic_off</mat-icon>
                <mat-icon *ngIf="!localVideo()" class="video-off-icon">videocam_off</mat-icon>
              </div>
            </div>
          </div>

          <!-- Remote Participants -->
          <div class="video-tile" *ngFor="let participant of participants()">
            <div class="video-placeholder" *ngIf="!participant.videoEnabled">
              <div class="avatar" [style.background-color]="getAvatarColor(participant.id)">
                <span>{{ getInitials(participant.name) }}</span>
              </div>
              <span class="name">{{ participant.name }}</span>
            </div>
            <video *ngIf="participant.videoEnabled" autoplay playsinline class="video-stream"></video>
            <div class="video-overlay">
              <div class="name-tag">{{ participant.name }}</div>
              <div class="status-indicators">
                <mat-icon *ngIf="!participant.audioEnabled" class="muted-icon">mic_off</mat-icon>
                <mat-icon *ngIf="!participant.videoEnabled" class="video-off-icon">videocam_off</mat-icon>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .video-chat-container {
      background: var(--panel-bg);
      border-bottom: 1px solid var(--panel-border);
      transition: all 0.3s ease;
      box-shadow: var(--shadow);
    }

    .video-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem 0.75rem;
      background: linear-gradient(135deg, var(--primary-accent), var(--secondary-accent));
      color: white;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 0.375rem;
    }

    .video-icon {
      font-size: 1.1rem;
    }

    .title {
      font-weight: 600;
      font-size: 0.85rem;
    }

    .participant-count {
      font-size: 0.75rem;
      opacity: 0.9;
    }

    .app-title {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-left: 100px;
      padding: 0;
      background: none;
      border: none;
      transition: none;
      box-shadow: none;
    }

    .app-title:hover {
      background: none;
      border: none;
      transform: none;
      box-shadow: none;
    }

    .brand-icon {
      font-size: 1.25rem;
      color: white;
      margin-right: 0.5rem;
      opacity: 0.9;
    }

    .app-title:hover .brand-icon {
      transform: none;
      color: white;
    }

    .brand-text {
      margin-left: 0;
      font-weight: 700;
      font-size: 1rem;
      color: white;
      text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
      letter-spacing: 0.05em;
      font-family: 'Inter', sans-serif;
    }

    .header-controls {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .control-group {
      display: flex;
      gap: 0.375rem;
    }

    .control-btn {
      width: 36px !important;
      height: 36px !important;
      color: white !important;
      background: rgba(255, 255, 255, 0.15) !important;
      border: 2px solid rgba(255, 255, 255, 0.2) !important;
      backdrop-filter: blur(10px);
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }

    .control-btn::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%);
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .control-btn:hover::before {
      opacity: 1;
    }

    .control-btn:hover {
      transform: translateY(-2px) scale(1.05);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
      border-color: rgba(255, 255, 255, 0.4);
    }

    .video-btn.active {
      background: linear-gradient(135deg, #10b981, #059669) !important;
      border-color: #10b981 !important;
      box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
    }

    .video-btn.inactive {
      background: linear-gradient(135deg, #ef4444, #dc2626) !important;
      border-color: #ef4444 !important;
      box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4);
    }

    .audio-btn.active {
      background: linear-gradient(135deg, #3b82f6, #2563eb) !important;
      border-color: #3b82f6 !important;
      box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);
    }

    .audio-btn.inactive {
      background: linear-gradient(135deg, #ef4444, #dc2626) !important;
      border-color: #ef4444 !important;
      box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4);
      animation: pulse 2s infinite;
    }

    .broadcast-btn {
      background: rgba(255, 255, 255, 0.1) !important;
    }

    .broadcast-btn.broadcasting {
      background: linear-gradient(135deg, #f59e0b, #d97706) !important;
      border-color: #f59e0b !important;
      box-shadow: 0 4px 15px rgba(245, 158, 11, 0.4);
      animation: broadcast-pulse 2s infinite;
    }

    .code-broadcast.broadcasting {
      background: linear-gradient(135deg, #8b5cf6, #7c3aed) !important;
      border-color: #8b5cf6 !important;
      box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4);
    }

    .whiteboard-broadcast.broadcasting {
      background: linear-gradient(135deg, #06b6d4, #0891b2) !important;
      border-color: #06b6d4 !important;
      box-shadow: 0 4px 15px rgba(6, 182, 212, 0.4);
    }

    .collapse-btn {
      background: rgba(255, 255, 255, 0.1) !important;
      border-color: rgba(255, 255, 255, 0.2) !important;
    }

    .collapse-btn:hover {
      background: rgba(255, 255, 255, 0.2) !important;
    }

    @keyframes broadcast-pulse {
      0%, 100% { 
        transform: scale(1);
        box-shadow: 0 4px 15px rgba(245, 158, 11, 0.4);
      }
      50% { 
        transform: scale(1.05);
        box-shadow: 0 6px 20px rgba(245, 158, 11, 0.6);
      }
    }

    .video-content {
      padding: 0.75rem;
      background: var(--primary-bg);
    }

    .video-grid {
      display: grid;
      gap: 0.5rem;
      max-height: 150px;
      overflow: hidden;
    }

    .grid-1 { grid-template-columns: 1fr; }
    .grid-2 { grid-template-columns: repeat(2, 1fr); }
    .grid-3 { grid-template-columns: repeat(3, 1fr); }
    .grid-4 { grid-template-columns: repeat(2, 1fr); grid-template-rows: repeat(2, 1fr); }
    .grid-5, .grid-6 { grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(2, 1fr); }

    .video-tile {
      position: relative;
      background: var(--panel-bg);
      border-radius: var(--border-radius-sm);
      overflow: hidden;
      aspect-ratio: 16/9;
      border: 2px solid var(--panel-border);
      transition: all 0.2s ease;
    }

    .video-tile:hover {
      border-color: var(--primary-accent);
      transform: scale(1.02);
    }

    .local-video {
      border-color: var(--primary-accent);
    }

    .video-stream {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .video-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      background: linear-gradient(135deg, #f0f2f5, #e2e8f0);
      color: var(--text-secondary);
    }

    .avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--primary-accent);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
      font-size: 0.9rem;
      margin-bottom: 0.375rem;
    }

    .video-placeholder .name {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--text-primary);
    }

    .video-overlay {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
      padding: 0.375rem;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }

    .name-tag {
      color: white;
      font-size: 0.7rem;
      font-weight: 500;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
    }

    .status-indicators {
      display: flex;
      gap: 0.25rem;
    }

    .status-indicators mat-icon {
      color: #ef4444;
      font-size: 0.9rem;
      background: rgba(0, 0, 0, 0.6);
      border-radius: 50%;
      padding: 0.1rem;
    }

    .collapsed .video-content {
      display: none;
    }

    mat-divider {
      background-color: rgba(255, 255, 255, 0.3);
      height: 16px;
      margin: 0 0.375rem;
    }
  `]
})
export class VideoChatComponent {
  // Outputs for parent component communication
  codeBroadcasting = output<boolean>();
  whiteboardBroadcasting = output<boolean>();
  
  isCollapsed = signal(true);
  localVideo = signal(false);
  localAudio = signal(true);
  broadcastingCode = signal(false);
  broadcastingWhiteboard = signal(false);
  
  participants = signal<Participant[]>([
    { id: '1', name: 'Alice Johnson', videoEnabled: true, audioEnabled: true },
    { id: '2', name: 'Bob Smith', videoEnabled: false, audioEnabled: true },
    { id: '3', name: 'Charlie Brown', videoEnabled: true, audioEnabled: false }
  ]);

  toggleCollapse(): void {
    this.isCollapsed.update(collapsed => !collapsed);
  }

  toggleVideo(): void {
    this.localVideo.update(enabled => !enabled);
    // TODO: Implement actual video toggle logic
  }

  toggleAudio(): void {
    this.localAudio.update(enabled => !enabled);
    // TODO: Implement actual audio toggle logic
  }

  toggleCodeBroadcast(): void {
    this.broadcastingCode.update(broadcasting => {
      const newState = !broadcasting;
      this.codeBroadcasting.emit(newState);
      return newState;
    });
  }

  toggleWhiteboardBroadcast(): void {
    this.broadcastingWhiteboard.update(broadcasting => {
      const newState = !broadcasting;
      this.whiteboardBroadcasting.emit(newState);
      return newState;
    });
  }

  getGridClass(): string {
    const count = this.participants().length + 1; // +1 for local user
    return Math.min(count, 6).toString();
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  }

  getAvatarColor(id: string): string {
    const colors = ['#7e57c2', '#42a5f5', '#ff7043', '#66bb6a', '#ffa726', '#ec407a'];
    const index = parseInt(id) % colors.length;
    return colors[index];
  }
}