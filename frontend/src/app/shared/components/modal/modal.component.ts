import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ModalConfig {
  title?: string;
  showCloseButton?: boolean;
  closableOnBackdrop?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [
    CommonModule
  ],
  template: `
    <div 
      class="fixed inset-0 z-50 overflow-y-auto"
      [class.hidden]="!isOpen()"
      (click)="onBackdropClick($event)"
    >
      <!-- Backdrop -->
      <div class="fixed inset-0 bg-black bg-opacity-50 transition-opacity"></div>
      
      <!-- Modal -->
      <div class="flex min-h-full items-center justify-center p-4">
        <div 
          [class]="modalClasses()"
          class="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl transform transition-all"
          (click)="$event.stopPropagation()"
        >
          <!-- Header -->
          @if (config().title || config().showCloseButton) {
            <div class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              @if (config().title) {
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                  {{ config().title }}
                </h3>
              }
              
              @if (config().showCloseButton) {
                <button
                  type="button"
                  class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  (click)="close()"
                >
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              }
            </div>
          }
          
          <!-- Content -->
          <div class="p-6">
            <ng-content></ng-content>
          </div>
          
          <!-- Footer -->
          <ng-content select="[slot=footer]"></ng-content>
        </div>
      </div>
    </div>
  `
})
export class ModalComponent {
  isOpen = input<boolean>(false);
  config = input<ModalConfig>({
    showCloseButton: true,
    closableOnBackdrop: true,
    size: 'md'
  });

  // Outputs
  closeModal = output<void>();

  close() {
    this.closeModal.emit();
  }

  onBackdropClick(event: Event) {
    if (this.config().closableOnBackdrop && event.target === event.currentTarget) {
      this.close();
    }
  }

  modalClasses() {
    const sizeClasses = {
      sm: 'max-w-md',
      md: 'max-w-lg',
      lg: 'max-w-2xl',
      xl: 'max-w-4xl',
      full: 'max-w-full mx-4'
    };

    return `w-full ${sizeClasses[this.config().size || 'md']}`;
  }
}