import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';


@Component({
  selector: 'app-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex flex-col">
      @if (label()) {
        <label [for]="id()" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {{ label() }}
          @if (required()) {
            <span class="text-red-500 ml-1">*</span>
          }
        </label>
      }
      
      <div class="relative">
        <input
          [id]="id()"
          [type]="type()"
          [placeholder]="placeholder()"
          [disabled]="disabled()"
          [required]="required()"
          [class]="inputClasses()"
          [value]="value()"
          (input)="onInput($event)"
          (blur)="onBlur.emit($event)"
          (focus)="onFocus.emit($event)"
        />
        
        @if (icon()) {
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <i [class]="icon()" class="text-gray-400"></i>
          </div>
        }
      </div>
      
      @if (error()) {
        <p class="mt-1 text-sm text-red-600 dark:text-red-400">{{ error() }}</p>
      }
      
      @if (hint() && !error()) {
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ hint() }}</p>
      }
    </div>
  `
})
export class InputComponent {
  id = input<string>('');
  label = input<string>('');
  type = input<'text' | 'email' | 'password' | 'number' | 'search' | 'tel' | 'url'>('text');
  placeholder = input<string>('');
  value = input<string>('');
  disabled = input<boolean>(false);
  required = input<boolean>(false);
  error = input<string>('');
  hint = input<string>('');
  icon = input<string>('');

  // Outputs
  valueChange = output<string>();
  onBlur = output<FocusEvent>();
  onFocus = output<FocusEvent>();

  onInput(event: Event) {
    const target = event.target as HTMLInputElement;
    this.valueChange.emit(target.value);
  }

  inputClasses() {
    const baseClasses = 'block w-full rounded-lg border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
    const iconPadding = this.icon() ? 'pl-10' : 'pl-3';
    const padding = `${iconPadding} pr-3 py-2`;
    
    if (this.error()) {
      return `${baseClasses} ${padding} border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500`;
    }
    
    if (this.disabled()) {
      return `${baseClasses} ${padding} border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed`;
    }
    
    return `${baseClasses} ${padding} border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:border-primary-500 focus:ring-primary-500`;
  }
}