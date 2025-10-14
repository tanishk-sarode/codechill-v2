import { Component, inject, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from '@shared/components/button/button.component';
import { InputComponent } from '@shared/components/input/input.component';
import { ModalComponent } from '@shared/components/modal/modal.component';
import { RoomService } from '../../services/room.service';
import { NotificationService } from '@shared/services/notification.service';
import { CreateRoomRequest, ProgrammingLanguage, Room } from '@core/types/room.types';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-create-room',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent, InputComponent, ModalComponent],
  template: `
    <app-modal
      [isOpen]="isOpen()"
      [config]="{ title: 'Create New Room', showCloseButton: true, size: 'lg' }"
      (closeModal)="close()"
    >
      <form (ngSubmit)="createRoom()" class="space-y-6">
        <!-- Room Name -->
        <app-input
          id="roomName"
          label="Room Name"
          type="text"
          placeholder="Enter room name"
          [value]="roomName()"
          [required]="true"
          (valueChange)="roomName.set($event)"
          hint="Choose a descriptive name for your coding session"
        />

        <!-- Description -->
        <div>
          <label for="description" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description (Optional)
          </label>
          <textarea
            id="description"
            rows="3"
            class="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:border-primary-500 focus:ring-primary-500 transition-colors duration-200 px-3 py-2"
            placeholder="Describe what you'll be working on..."
            [value]="description()"
            (input)="updateDescription($event)"
          ></textarea>
        </div>

        <!-- Programming Language -->
        <div>
          <label for="language" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Programming Language
          </label>
          <select
            id="language"
            class="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:ring-primary-500 transition-colors duration-200 px-3 py-2"
            [value]="language()"
            (change)="updateLanguage($event)"
          >
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="cpp">C++</option>
            <option value="c">C</option>
            <option value="csharp">C#</option>
            <option value="go">Go</option>
            <option value="rust">Rust</option>
            <option value="php">PHP</option>
            <option value="ruby">Ruby</option>
            <option value="html">HTML</option>
            <option value="css">CSS</option>
            <option value="sql">SQL</option>
            <option value="json">JSON</option>
          </select>
        </div>

        <!-- Room Settings -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Max Participants -->
          <app-input
            id="maxParticipants"
            label="Max Participants"
            type="number"
            placeholder="10"
            [value]="maxParticipants().toString()"
            [required]="true"
            (valueChange)="updateMaxParticipants($event)"
            hint="2-50 participants"
          />

          <!-- Privacy Toggle -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Room Privacy
            </label>
            <div class="flex items-center space-x-4">
              <label class="flex items-center">
                <input
                  type="radio"
                  name="privacy"
                  value="false"
                  [ngModel]="!isPrivate()"
                  (ngModelChange)="onPrivacyChange($event)"
                  class="mr-2 text-primary-600"
                />
                <span class="text-sm text-gray-700 dark:text-gray-300">Public</span>
              </label>
              <label class="flex items-center">
                <input
                  type="radio"
                  name="privacy"
                  value="true"
                  [ngModel]="isPrivate()"
                  (ngModelChange)="onPrivacyChange($event)"
                  class="mr-2 text-primary-600"
                />
                <span class="text-sm text-gray-700 dark:text-gray-300">Private</span>
              </label>
            </div>
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Public rooms are discoverable by everyone
            </p>
          </div>
        </div>

        <!-- Action Buttons -->
        <div slot="footer" class="flex flex-col sm:flex-row gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <app-button
            type="button"
            variant="outline"
            [fullWidth]="true"
            (onClick)="close()"
          >
            Cancel
          </app-button>
          
          <app-button
            type="submit"
            variant="primary"
            [fullWidth]="true"
            [loading]="roomService.isLoading()"
            [disabled]="!isFormValid()"
          >
            Create Room
          </app-button>
        </div>
      </form>
    </app-modal>
  `
})
export class CreateRoomComponent {
  readonly roomService = inject(RoomService);
  private readonly notificationService = inject(NotificationService);

  // Signals
  readonly isOpen = signal(false);
  readonly roomName = signal('');
  readonly description = signal('');
  readonly language = signal<ProgrammingLanguage>('javascript');
  readonly maxParticipants = signal(10);
  readonly isPrivate = signal(false);

  // Outputs
  roomCreated = output<void>();

  updateDescription(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.description.set(target.value);
  }

  updateLanguage(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.language.set(target.value as ProgrammingLanguage);
  }

  updateMaxParticipants(value: string): void {
    const num = parseInt(value, 10);
    if (num >= 2 && num <= 50) {
      this.maxParticipants.set(num);
    }
  }

  setPrivacy(isPrivate: boolean): void {
    this.isPrivate.set(isPrivate);
  }

  onPrivacyChange(value: boolean): void {
    this.isPrivate.set(value);
  }

  isFormValid(): boolean {
    return this.roomName().trim().length > 0 && 
           this.maxParticipants() >= 2 && 
           this.maxParticipants() <= 50;
  }

  createRoom(): void {
    if (!this.isFormValid()) {
      return;
    }

    const request: CreateRoomRequest = {
      name: this.roomName().trim(),
      description: this.description().trim() || undefined,
      language: this.language(),
      max_participants: this.maxParticipants(),
      is_private: this.isPrivate()
    };

    this.roomService.createRoom(request).pipe(
      catchError((error: any) => {
        this.notificationService.error('Failed to Create Room', error.message);
        return of(null);
      })
    ).subscribe((room: Room | null) => {
      if (room) {
        this.notificationService.success('Room Created', `Room "${room.name}" has been created successfully!`);
        this.resetForm();
        this.close();
        this.roomCreated.emit();
      }
    });
  }

  open(): void {
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }

  private resetForm(): void {
    this.roomName.set('');
    this.description.set('');
    this.language.set('javascript');
    this.maxParticipants.set(10);
    this.isPrivate.set(false);
  }
}