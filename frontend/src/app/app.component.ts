import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [CommonModule, RouterOutlet],
    template: `
    <div class="min-h-screen bg-gray-50 dark:bg-dark-900 transition-colors duration-300">
      <router-outlet></router-outlet>
    </div>
  `
})
export class AppComponent {
  title = 'codechill-frontend';
}