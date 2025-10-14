import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NotificationService } from '@shared/services/notification.service';
import { Collaborator } from '../collab-editor.component';

@Component({
  selector: 'app-room-panel',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatTooltipModule],
  template: `
    <aside class="room-panel">
      <div class="panel-header">
        <mat-icon>meeting_room</mat-icon>
        <h3>Collaborator Rooms</h3>
      </div>

      <div class="room-info">
        <div class="room-name">{{ roomData.roomName }}</div>
        <div class="room-id-section">
          <div class="room-id-label">Room ID:</div>
          <div class="room-id-container">
            <span class="room-id">{{ roomData.roomId }}</span>
            <button 
              mat-icon-button 
              (click)="copyRoomId()" 
              matTooltip="Copy Room ID"
              class="copy-btn">
              <mat-icon>content_copy</mat-icon>
            </button>
          </div>
        </div>
      </div>

      <div class="collaborators-section">
        <h4>Active Members ({{ onlineCount }})</h4>
        <ul class="collaborators-list">
          <li *ngFor="let collab of roomData.collaborators" class="collaborator-item">
            <span class="avatar" [ngStyle]="{'background-color': collab.color}">
              {{ getInitials(collab.name) }}
            </span>
            <div class="collaborator-info">
              <span class="collab-name">{{ collab.name }}</span>
              <span class="status-dot" [class.online]="collab.online"></span>
            </div>
          </li>
        </ul>
      </div>

      <div class="actions-section">
        <button 
          mat-stroked-button 
          class="invite-btn secondary-action">
          <mat-icon class="btn-icon">person_add</mat-icon>
          <span class="btn-text">Invite Others</span>
        </button>
        
        <!-- <button 
          mat-flat-button 
          class="join-btn accent-action">
          <mat-icon class="btn-icon">meeting_room</mat-icon>
          <span class="btn-text">Join Meeting</span>
        </button> -->
      </div>
    </aside>
  `,
  styles: [`
    .room-panel {
      width: 100%;
      height: 100%;
      background: var(--panel-bg);
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      overflow-y: auto;
    }

    .panel-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid var(--panel-border);
    }

    .panel-header h3 {
      margin: 0;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-heading);
    }

    .panel-header mat-icon {
      color: var(--primary-accent);
    }

    .room-info {
      background: linear-gradient(135deg, var(--primary-accent), var(--secondary-accent));
      padding: 1rem;
      border-radius: var(--border-radius-sm);
      color: white;
    }

    .room-name {
      font-weight: 600;
      font-size: 0.9rem;
      margin-bottom: 0.75rem;
      text-align: center;
    }

    .room-id-section {
      background: rgba(255, 255, 255, 0.1);
      padding: 0.75rem;
      border-radius: var(--border-radius-sm);
      backdrop-filter: blur(10px);
    }

    .room-id-label {
      font-size: 0.75rem;
      opacity: 0.8;
      margin-bottom: 0.5rem;
    }

    .room-id-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }

    .room-id {
      font-family: var(--font-code);
      font-size: 0.8rem;
      font-weight: 500;
      letter-spacing: 0.5px;
      flex: 1;
      word-break: break-all;
    }

    .copy-btn {
      color: white !important;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 50%;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }

    .copy-btn:hover {
      background: rgba(255, 255, 255, 0.2);
      transform: scale(1.05);
    }

    .copy-btn mat-icon {
      font-size: 1rem;
    }

    .collaborators-section h4 {
      margin: 0 0 1rem 0;
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-heading);
    }

    .collaborators-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .collaborator-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.375rem;
      border-radius: var(--border-radius-sm);
      transition: background-color 0.2s;
    }

    .collaborator-item:hover {
      background: var(--primary-bg);
    }

    .avatar {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
      font-size: 0.65rem;
      flex-shrink: 0;
    }

    .collaborator-info {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .collab-name {
      font-weight: 500;
      font-size: 0.8rem;
      color: var(--text-primary);
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #94a3b8;
      transition: background-color 0.2s;
    }

    .status-dot.online {
      background: var(--success);
      box-shadow: 0 0 4px rgba(16, 185, 129, 0.4);
    }

    .actions-section {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-top: 1rem;
    }

    .primary-action, .secondary-action, .accent-action {
      width: 100%;
      height: 48px;
      border-radius: 25px !important;
      position: relative;
      overflow: hidden;
      transition: all 0.3s ease;
      text-transform: none !important;
      display: flex !important;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
    }

    .btn-icon {
      font-size: 1.25rem !important;
    }

    .btn-text {
      font-weight: 600;
      font-size: 0.9rem;
    }

    .primary-action {
      background: linear-gradient(135deg, var(--primary-accent), var(--secondary-accent)) !important;
      border: none !important;
      color: white !important;
      box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3);
    }

    .primary-action::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(135deg, rgba(255,255,255,0.2), transparent);
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .primary-action:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(139, 92, 246, 0.4);
    }

    .primary-action:hover::before {
      opacity: 1;
    }

    .secondary-action {
      background: transparent !important;
      border: 2px solid var(--primary-accent) !important;
      color: var(--primary-accent) !important;
    }

    .secondary-action:hover {
      background: var(--primary-accent) !important;
      color: white !important;
      transform: translateY(-1px);
      box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3);
    }

    .accent-action {
      background: linear-gradient(135deg, #10b981, #059669) !important;
      border: none !important;
      color: white !important;
      box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
    }

    .accent-action:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
    }

    .login-btn, .invite-btn {
      justify-content: center !important;
    }


  `]
})
export class RoomPanelComponent {
  private notificationService = inject(NotificationService);
  
  @Input() roomData!: { roomName: string; roomId: string; collaborators: Collaborator[] };
  @Output() googleLogin = new EventEmitter<void>();

  get onlineCount(): number {
    return this.roomData.collaborators.filter(c => c.online).length;
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  }

  onGoogleLogin(): void {
    this.googleLogin.emit();
  }

  copyRoomId(): void {
    navigator.clipboard.writeText(this.roomData.roomId).then(() => {
      this.notificationService.success('Room ID copied to clipboard!');
    }).catch(() => {
      this.notificationService.error('Failed to copy Room ID');
    });
  }
}
