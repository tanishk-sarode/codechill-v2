import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [
    CommonModule
  ],
  template: `
    <div [class]="containerClasses()">
      <div [class]="spinnerClasses()"></div>
      @if (text()) {
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">{{ text() }}</p>
      }
    </div>
  `,
  styles: [`
    .spinner {
      border: 2px solid transparent;
      border-top: 2px solid currentColor;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `]
})
export class LoadingSpinnerComponent {
  size = input<'sm' | 'md' | 'lg'>('md');
  text = input<string>('');
  centered = input<boolean>(true);

  containerClasses() {
    const baseClasses = 'flex flex-col items-center';
    const centerClasses = this.centered() ? 'justify-center min-h-32' : '';
    return `${baseClasses} ${centerClasses}`;
  }

  spinnerClasses() {
    const baseClasses = 'spinner';
    const sizeClasses = {
      sm: 'w-4 h-4',
      md: 'w-8 h-8',
      lg: 'w-12 h-12'
    };
    return `${baseClasses} ${sizeClasses[this.size()]}`;
  }
}