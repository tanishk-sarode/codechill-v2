import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export interface ChatMessage {
  user: string;
  text: string;
  timestamp?: Date;
}

@Component({
  selector: 'app-chat-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <aside class="chat-panel">
      <header class="chat-header">
        <h4>
          <mat-icon>chat</mat-icon>
          Room Chat
        </h4>
      </header>

      <section class="messages" #messagesContainer>
        <div class="message" *ngFor="let m of messages">
          <div class="meta">
            <span class="user">{{ m.user }}</span>
            <span class="time">{{ m.timestamp ? (m.timestamp | date:'shortTime') : '' }}</span>
          </div>
          <div class="text">{{ m.text }}</div>
        </div>
      </section>

      <footer class="composer">
        <mat-form-field appearance="outline" class="composer-field">
          <input matInput placeholder="Type a message" [(ngModel)]="draft" (keydown.enter)="send()" />
        </mat-form-field>
        <button mat-raised-button color="primary" (click)="send()" [disabled]="!draft.trim()">
          <mat-icon>send</mat-icon>
          <!-- Send -->
        </button>
      </footer>
    </aside>
  `,
  styles: [`
    .chat-panel {
      width: 100%;
      height: 100%;
      background: var(--panel-bg);
      display: flex;
      flex-direction: column;
    }

    .chat-header {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--panel-border);
      background: var(--panel-bg);
    }
    .chat-header h4 {
      margin: 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.85rem;
      color: var(--text-heading);
    }

    .messages {
      padding: 0.75rem 1rem;
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .message .meta {
      display: flex;
      justify-content: space-between;
      font-size: 0.65rem;
      color: var(--text-secondary);
    }
    .message .text {
      background: var(--primary-bg);
      border: 1px solid var(--panel-border);
      border-radius: var(--border-radius-sm);
      padding: 0.5rem 0.75rem;
      font-size: 0.8rem;
      color: var(--text-primary);
      white-space: pre-wrap;
    }

    .composer {
      border-top: 1px solid var(--panel-border);
      padding: 0.5rem;
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }
    .composer-field { flex: 1; }


  `]
})
export class ChatPanelComponent {
  @Input() messages: ChatMessage[] = [];
  @Output() newMessage = new EventEmitter<ChatMessage>();

  draft = '';

  send(): void {
    const text = this.draft.trim();
    if (!text) return;
    const msg: ChatMessage = { user: 'You', text, timestamp: new Date() };
    this.newMessage.emit(msg);
    this.draft = '';
  }
}
