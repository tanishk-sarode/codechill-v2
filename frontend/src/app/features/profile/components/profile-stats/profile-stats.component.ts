import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthenticationService } from '@core/services/authentication.service';
import { UserProfile } from '@core/types';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-profile-stats',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Profile Statistics
      </h3>
      
      @if (isLoading()) {
        <div class="flex items-center justify-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      } @else if (error()) {
        <div class="text-red-600 dark:text-red-400 py-4">
          {{ error() }}
        </div>
      } @else if (userProfile()) {
        <div class="space-y-6">
          <!-- GitHub Stats -->
          @if (userProfile()?.githubStats) {
            <div class="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h4 class="font-medium text-gray-900 dark:text-gray-100 flex items-center mb-3">
                <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                GitHub
              </h4>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="text-center">
                  <div class="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {{ userProfile()?.githubStats?.publicRepos || 0 }}
                  </div>
                  <div class="text-sm text-gray-600 dark:text-gray-400">Repositories</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {{ userProfile()?.githubStats?.followers || 0 }}
                  </div>
                  <div class="text-sm text-gray-600 dark:text-gray-400">Followers</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {{ userProfile()?.githubStats?.following || 0 }}
                  </div>
                  <div class="text-sm text-gray-600 dark:text-gray-400">Following</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {{ userProfile()?.githubStats?.totalStars || 0 }}
                  </div>
                  <div class="text-sm text-gray-600 dark:text-gray-400">Stars</div>
                </div>
              </div>
            </div>
          }
          
          <!-- LeetCode Stats -->
          @if (userProfile()?.leetcodeStats) {
            <div class="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h4 class="font-medium text-gray-900 dark:text-gray-100 flex items-center mb-3">
                <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M13.483 0a1.374 1.374 0 0 0-.961.438L7.116 6.226l-3.854 4.126a5.266 5.266 0 0 0-1.209 2.104 5.35 5.35 0 0 0-.125.513 5.527 5.527 0 0 0 .062 2.362 5.83 5.83 0 0 0 .349 1.017 5.938 5.938 0 0 0 1.271 1.818l4.277 4.193.039.038c2.248 2.165 5.852 2.133 8.063-.074l2.396-2.392c.54-.54.54-1.414.003-1.955a1.378 1.378 0 0 0-1.951-.003l-2.396 2.392a3.021 3.021 0 0 1-4.205.038l-.02-.019-4.276-4.193c-.652-.64-.972-1.469-.948-2.263a2.68 2.68 0 0 1 .066-.523 2.545 2.545 0 0 1 .619-1.164L9.13 8.114c1.058-1.134 3.204-1.27 4.43-.278l3.501 2.831c.593.48 1.461.387 1.94-.207a1.384 1.384 0 0 0-.207-1.943l-3.5-2.831c-2.69-2.178-6.623-1.902-8.98.633l-4.687 5.029a1.378 1.378 0 0 0 .209 1.943 1.378 1.378 0 0 0 1.943-.207l4.688-5.029c.566-.607 1.539-.646 2.154-.084l.018.016 1.78 1.59c.896.804 1.035 2.207.308 3.169l-1.687 2.233a1.378 1.378 0 0 0 .209 1.943 1.378 1.378 0 0 0 1.943-.207l1.687-2.233c1.4-1.853 1.184-4.553-.5-6.158L8.863.438A1.378 1.378 0 0 0 7.901 0H13.483Z"/>
                </svg>
                LeetCode
              </h4>
              <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div class="text-center">
                  <div class="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {{ userProfile()?.leetcodeStats?.totalSolved || 0 }}
                  </div>
                  <div class="text-sm text-gray-600 dark:text-gray-400">Solved</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold text-green-600">
                    {{ userProfile()?.leetcodeStats?.easySolved || 0 }}
                  </div>
                  <div class="text-sm text-gray-600 dark:text-gray-400">Easy</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold text-yellow-600">
                    {{ userProfile()?.leetcodeStats?.mediumSolved || 0 }}
                  </div>
                  <div class="text-sm text-gray-600 dark:text-gray-400">Medium</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold text-red-600">
                    {{ userProfile()?.leetcodeStats?.hardSolved || 0 }}
                  </div>
                  <div class="text-sm text-gray-600 dark:text-gray-400">Hard</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {{ userProfile()?.leetcodeStats?.ranking || 'N/A' }}
                  </div>
                  <div class="text-sm text-gray-600 dark:text-gray-400">Ranking</div>
                </div>
              </div>
            </div>
          }
          
          <!-- Codeforces Stats -->
          @if (userProfile()?.codeforcesStats) {
            <div class="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h4 class="font-medium text-gray-900 dark:text-gray-100 flex items-center mb-3">
                <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4.5 7.5A1.5 1.5 0 016 9v10.5A1.5 1.5 0 014.5 21h-3A1.5 1.5 0 010 19.5V9a1.5 1.5 0 011.5-1.5h3zM22.5 7.5A1.5 1.5 0 0124 9v10.5a1.5 1.5 0 01-1.5 1.5h-3A1.5 1.5 0 0118 19.5V9a1.5 1.5 0 011.5-1.5h3zM13.5 0A1.5 1.5 0 0115 1.5V22.5A1.5 1.5 0 0113.5 24h-3A1.5 1.5 0 019 22.5V1.5A1.5 1.5 0 0110.5 0h3z"/>
                </svg>
                Codeforces
              </h4>
              <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div class="text-center">
                  <div class="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {{ userProfile()?.codeforcesStats?.rating || 0 }}
                  </div>
                  <div class="text-sm text-gray-600 dark:text-gray-400">Rating</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {{ userProfile()?.codeforcesStats?.maxRating || 0 }}
                  </div>
                  <div class="text-sm text-gray-600 dark:text-gray-400">Max Rating</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {{ userProfile()?.codeforcesStats?.rank || 'Unrated' }}
                  </div>
                  <div class="text-sm text-gray-600 dark:text-gray-400">Rank</div>
                </div>
              </div>
            </div>
          }
          
          @if (!userProfile()?.githubStats && !userProfile()?.leetcodeStats && !userProfile()?.codeforcesStats) {
            <div class="text-center py-8">
              <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
              </svg>
              <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No stats available</h3>
              <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Link your GitHub, LeetCode, or Codeforces accounts to see your stats.
              </p>
            </div>
          }
        </div>
      }
    </div>
  `
})
export class ProfileStatsComponent implements OnInit {
  @Input() userId!: string;
  
  private readonly authService = inject(AuthenticationService);
  
  readonly userProfile = signal<UserProfile | null>(null);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.loadUserProfile();
  }

  private loadUserProfile(): void {
    if (!this.userId) {
      this.error.set('User ID is required');
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    this.authService.getUserProfile(this.userId).pipe(
      catchError((error: any) => {
        this.error.set('Failed to load profile stats');
        return of(null);
      })
    ).subscribe((profile: UserProfile | null) => {
      this.userProfile.set(profile);
      this.isLoading.set(false);
    });
  }

  refreshStats(): void {
    this.loadUserProfile();
  }
}