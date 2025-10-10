// ✅ Updated ProfileComponent using our AuthenticationService
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthenticationService } from '@core/services/authentication.service';

@Component({
  selector: 'app-profile-example',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Using our modern Angular authentication service with signals -->
    @if (authService.user(); as user) {
      <div class="profile-container">
        @if (user.picture) {
          <img [src]="user.picture" [alt]="user.name" class="profile-avatar">
        }
        <h3 class="profile-name">{{ user.name }}</h3>
        <p class="profile-email">{{ user.email }}</p>
        
        <!-- Show verification status -->
        @if (user.isVerified) {
          <span class="verified-badge">✓ Verified</span>
        }
        
        <!-- Display user stats (you can create ProfileStatsComponent separately) -->
        <div class="user-stats">
          <p>User statistics would go here</p>
        </div>
        
        <!-- Quick actions -->
        <div class="profile-actions">
          <button (click)="refreshProfile()">Refresh Profile</button>
          <button (click)="authService.logout()">Sign Out</button>
        </div>
      </div>
    } @else if (authService.isLoading()) {
      <div class="loading">Loading user profile...</div>
    } @else if (authService.error()) {
      <div class="error">Error: {{ authService.error() }}</div>
    } @else {
      <div class="not-authenticated">
        <p>Please sign in to view your profile</p>
        <button (click)="authService.login()">Sign In</button>
      </div>
    }
  `,
  styles: [`
    .profile-container {
      padding: 2rem;
      max-width: 600px;
      margin: 0 auto;
    }
    .profile-avatar {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      object-fit: cover;
      margin-bottom: 1rem;
    }
    .profile-name {
      font-size: 1.5rem;
      font-weight: bold;
      margin: 0.5rem 0;
    }
    .profile-email {
      color: #666;
      margin-bottom: 1rem;
    }
    .verified-badge {
      display: inline-block;
      background: #10b981;
      color: white;
      padding: 0.25rem 0.5rem;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      margin-bottom: 1rem;
    }
    .profile-actions {
      display: flex;
      gap: 1rem;
      margin-top: 2rem;
    }
    button {
      padding: 0.5rem 1rem;
      border: 1px solid #ccc;
      border-radius: 0.375rem;
      background: white;
      cursor: pointer;
    }
    button:hover {
      background: #f3f4f6;
    }
    .loading, .error, .not-authenticated {
      text-align: center;
      padding: 2rem;
    }
    .error {
      color: #dc2626;
    }
  `]
})
export class ProfileExampleComponent {
  // Inject the authentication service
  readonly authService = inject(AuthenticationService);

  refreshProfile(): void {
    const user = this.authService.user();
    if (user) {
      // Refresh user profile data
      this.authService.getUserProfile(user.id).subscribe({
        next: (profile) => console.log('Profile refreshed:', profile),
        error: (error) => console.error('Failed to refresh profile:', error)
      });
    }
  }
}

// 🚀 Example usage in other components:

// Example 1: Simple authentication check
@Component({
  template: `
    @if (auth.isAuthenticated()) {
      <p>Welcome back, {{ auth.user()?.name }}!</p>
    } @else {
      <button (click)="auth.login()">Sign In</button>
    }
  `
})
export class SimpleAuthComponent {
  readonly auth = inject(AuthenticationService);
}

// Example 2: Using observables (for compatibility)
@Component({
  template: `
    @if (auth.user(); as user) {
      <h3>{{ user.name }}</h3>
      <p>{{ user.email }}</p>
    }
  `
})
export class ObservableAuthComponent {
  readonly auth = inject(AuthenticationService);
}

// Example 3: Conditional rendering based on auth state
@Component({
  template: `
    @if (auth.isLoading()) {
      <div class="loading-spinner">Loading...</div>
    } @else if (auth.error()) {
      <div class="error-message">{{ auth.error() }}</div>
    } @else if (auth.user(); as user) {
      <!-- Authenticated user content -->
      <div class="user-dashboard">
        <h1>Dashboard for {{ user.name }}</h1>
        <div class="user-stats">User stats would go here</div>
      </div>
    } @else {
      <!-- Unauthenticated content -->
      <div class="landing-page">
        <h1>Welcome to CodeChill</h1>
        <button (click)="auth.login()">Get Started</button>
      </div>
    }
  `
})
export class DashboardComponent {
  readonly auth = inject(AuthenticationService);
}