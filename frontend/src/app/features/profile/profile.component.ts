import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthenticationService } from '@core/services/authentication.service';
import { ProfileStatsComponent } from './components/profile-stats/profile-stats.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ProfileStatsComponent],
  template: `
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div class="max-w-4xl mx-auto py-8 px-4">
        @if (authService.isLoading()) {
          <div class="flex items-center justify-center py-16">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        } @else if (authService.error()) {
          <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div class="text-red-800 dark:text-red-200">
              {{ authService.error() }}
            </div>
          </div>
        } @else if (authService.user(); as user) {
          <div class="space-y-6">
            <!-- User Header -->
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div class="flex items-center space-x-4">
                @if (user.picture) {
                  <img 
                    [src]="user.picture" 
                    [alt]="user.name"
                    class="w-16 h-16 rounded-full object-cover"
                  />
                } @else {
                  <div class="w-16 h-16 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                    <svg class="w-8 h-8 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                    </svg>
                  </div>
                }
                
                <div class="flex-1">
                  <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {{ user.name }}
                  </h1>
                  <p class="text-gray-600 dark:text-gray-400">
                    {{ user.email }}
                  </p>
                  <div class="flex items-center mt-2">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                          [class]="user.isVerified ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'">
                      @if (user.isVerified) {
                        <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                        </svg>
                        Verified
                      } @else {
                        <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                        </svg>
                        Unverified
                      }
                    </span>
                  </div>
                </div>
                
                <button
                  type="button"
                  class="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  (click)="authService.logout()"
                >
                  <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                  </svg>
                  Sign Out
                </button>
              </div>
            </div>
            
            <!-- Profile Stats -->
            <app-profile-stats [userId]="user.id"></app-profile-stats>
            
            <!-- Social Links -->
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Connected Accounts
              </h3>
              
              <div class="space-y-3">
                <!-- GitHub -->
                <div class="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div class="flex items-center space-x-3">
                    <svg class="w-6 h-6 text-gray-900 dark:text-gray-100" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                    <div>
                      <div class="font-medium text-gray-900 dark:text-gray-100">GitHub</div>
                      @if (user.githubUsername) {
                        <div class="text-sm text-gray-600 dark:text-gray-400">@{{ user.githubUsername }}</div>
                      } @else {
                        <div class="text-sm text-gray-500 dark:text-gray-500">Not connected</div>
                      }
                    </div>
                  </div>
                  @if (user.githubUsername) {
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                      Connected
                    </span>
                  } @else {
                    <button class="text-sm text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300">
                      Connect
                    </button>
                  }
                </div>
                
                <!-- LeetCode -->
                <div class="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div class="flex items-center space-x-3">
                    <svg class="w-6 h-6 text-gray-900 dark:text-gray-100" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M13.483 0a1.374 1.374 0 0 0-.961.438L7.116 6.226l-3.854 4.126a5.266 5.266 0 0 0-1.209 2.104 5.35 5.35 0 0 0-.125.513 5.527 5.527 0 0 0 .062 2.362 5.83 5.83 0 0 0 .349 1.017 5.938 5.938 0 0 0 1.271 1.818l4.277 4.193.039.038c2.248 2.165 5.852 2.133 8.063-.074l2.396-2.392c.54-.54.54-1.414.003-1.955a1.378 1.378 0 0 0-1.951-.003l-2.396 2.392a3.021 3.021 0 0 1-4.205.038l-.02-.019-4.276-4.193c-.652-.64-.972-1.469-.948-2.263a2.68 2.68 0 0 1 .066-.523 2.545 2.545 0 0 1 .619-1.164L9.13 8.114c1.058-1.134 3.204-1.27 4.43-.278l3.501 2.831c.593.48 1.461.387 1.94-.207a1.384 1.384 0 0 0-.207-1.943l-3.5-2.831c-2.69-2.178-6.623-1.902-8.98.633l-4.687 5.029a1.378 1.378 0 0 0 .209 1.943 1.378 1.378 0 0 0 1.943-.207l4.688-5.029c.566-.607 1.539-.646 2.154-.084l.018.016 1.78 1.59c.896.804 1.035 2.207.308 3.169l-1.687 2.233a1.378 1.378 0 0 0 .209 1.943 1.378 1.378 0 0 0 1.943-.207l1.687-2.233c1.4-1.853 1.184-4.553-.5-6.158L8.863.438A1.378 1.378 0 0 0 7.901 0H13.483Z"/>
                    </svg>
                    <div>
                      <div class="font-medium text-gray-900 dark:text-gray-100">LeetCode</div>
                      @if (user.leetcodeUsername) {
                        <div class="text-sm text-gray-600 dark:text-gray-400">{{ user.leetcodeUsername }}</div>
                      } @else {
                        <div class="text-sm text-gray-500 dark:text-gray-500">Not connected</div>
                      }
                    </div>
                  </div>
                  @if (user.leetcodeUsername) {
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                      Connected
                    </span>
                  } @else {
                    <button class="text-sm text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300">
                      Connect
                    </button>
                  }
                </div>
                
                <!-- Codeforces -->
                <div class="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div class="flex items-center space-x-3">
                    <svg class="w-6 h-6 text-gray-900 dark:text-gray-100" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M4.5 7.5A1.5 1.5 0 016 9v10.5A1.5 1.5 0 014.5 21h-3A1.5 1.5 0 010 19.5V9a1.5 1.5 0 011.5-1.5h3zM22.5 7.5A1.5 1.5 0 0124 9v10.5a1.5 1.5 0 01-1.5 1.5h-3A1.5 1.5 0 0118 19.5V9a1.5 1.5 0 011.5-1.5h3zM13.5 0A1.5 1.5 0 0115 1.5V22.5A1.5 1.5 0 0113.5 24h-3A1.5 1.5 0 019 22.5V1.5A1.5 1.5 0 0110.5 0h3z"/>
                    </svg>
                    <div>
                      <div class="font-medium text-gray-900 dark:text-gray-100">Codeforces</div>
                      @if (user.codeforcesUsername) {
                        <div class="text-sm text-gray-600 dark:text-gray-400">{{ user.codeforcesUsername }}</div>
                      } @else {
                        <div class="text-sm text-gray-500 dark:text-gray-500">Not connected</div>
                      }
                    </div>
                  </div>
                  @if (user.codeforcesUsername) {
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                      Connected
                    </span>
                  } @else {
                    <button class="text-sm text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300">
                      Connect
                    </button>
                  }
                </div>
              </div>
            </div>
          </div>
        } @else {
          <div class="text-center py-16">
            <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
            </svg>
            <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">Not authenticated</h3>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Please sign in to view your profile.
            </p>
          </div>
        }
      </div>
    </div>
  `
})
export class ProfileComponent {
  readonly authService = inject(AuthenticationService);
}