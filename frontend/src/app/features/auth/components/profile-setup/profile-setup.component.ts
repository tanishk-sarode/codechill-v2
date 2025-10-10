import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthenticationService } from '@core/services/authentication.service';
import { ButtonComponent } from '@shared/components/button/button.component';
import { InputComponent } from '@shared/components/input/input.component';
import { ModalComponent } from '@shared/components/modal/modal.component';
import { NotificationService } from '@shared/services/notification.service';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-profile-setup',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent, InputComponent, ModalComponent],
  template: `
    <app-modal
      [isOpen]="isOpen()"
      [config]="{ title: 'Complete Your Profile', showCloseButton: false, closableOnBackdrop: false }"
      (closeModal)="close()"
    >
      <div class="space-y-6">
        <div class="text-center">
          <div class="mx-auto h-16 w-16 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center mb-4">
            <svg class="h-8 w-8 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
            </svg>
          </div>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Link your coding profiles to track your progress and showcase your skills
          </p>
        </div>

        <form (ngSubmit)="saveProfile()" class="space-y-4">
          <!-- GitHub Username -->
          <app-input
            id="github"
            label="GitHub Username (Optional)"
            type="text"
            placeholder="Enter your GitHub username"
            [value]="githubUsername()"
            (valueChange)="githubUsername.set($event)"
            icon="fab fa-github"
            hint="Link your GitHub profile to display repository stats"
          />

          <!-- LeetCode Username -->
          <app-input
            id="leetcode"
            label="LeetCode Username (Optional)"
            type="text"
            placeholder="Enter your LeetCode username"
            [value]="leetcodeUsername()"
            (valueChange)="leetcodeUsername.set($event)"
            icon="fas fa-code"
            hint="Show your problem-solving progress and rankings"
          />

          <!-- Codeforces Username -->
          <app-input
            id="codeforces"
            label="Codeforces Username (Optional)"
            type="text"
            placeholder="Enter your Codeforces username"
            [value]="codeforcesUsername()"
            (valueChange)="codeforcesUsername.set($event)"
            icon="fas fa-trophy"
            hint="Display your competitive programming achievements"
          />

          <div slot="footer" class="flex flex-col sm:flex-row gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
            <app-button
              type="button"
              variant="outline"
              [fullWidth]="true"
              (onClick)="skipSetup()"
            >
              Skip for now
            </app-button>
            
            <app-button
              type="submit"
              variant="primary"
              [fullWidth]="true"
              [loading]="isSaving()"
            >
              Save Profile
            </app-button>
          </div>
        </form>
      </div>
    </app-modal>
  `
})
export class ProfileSetupComponent {
  private readonly authService = inject(AuthenticationService);
  private readonly notificationService = inject(NotificationService);

  // Signals
  readonly isOpen = signal(true);
  readonly isSaving = signal(false);
  readonly githubUsername = signal('');
  readonly leetcodeUsername = signal('');
  readonly codeforcesUsername = signal('');

  saveProfile(): void {
    this.isSaving.set(true);
    
    const updates: any = {};
    
    if (this.githubUsername()) {
      updates.githubUsername = this.githubUsername();
    }
    
    if (this.leetcodeUsername()) {
      updates.leetcodeUsername = this.leetcodeUsername();
    }
    
    if (this.codeforcesUsername()) {
      updates.codeforcesUsername = this.codeforcesUsername();
    }

    // Update profile
    this.authService.updateProfile(updates).pipe(
      catchError(error => {
        this.notificationService.error('Profile Update Failed', error.message);
        return of(null);
      })
    ).subscribe(user => {
      this.isSaving.set(false);
      
      if (user) {
        this.notificationService.success('Profile Updated', 'Your profile has been successfully updated!');
        this.close();
      }
    });
  }

  skipSetup(): void {
    this.close();
  }

  close(): void {
    this.isOpen.set(false);
  }
}