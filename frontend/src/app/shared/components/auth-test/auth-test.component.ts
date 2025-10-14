import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthenticationService } from '@core/services/authentication.service';
import { EnvironmentService } from '@core/services/environment.service';

@Component({
  selector: 'app-auth-test',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h2 class="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Authentication Test</h2>
      
      <!-- Auth Status -->
      <div class="mb-6 p-4 rounded-md border" [class]="getAuthStatusClass()">
        <div class="flex items-center justify-between">
          <div>
            <div class="flex items-center space-x-2">
              <div class="w-3 h-3 rounded-full" [class]="getStatusIndicatorClass()"></div>
              <span class="font-medium">{{ getAuthStatusText() }}</span>
            </div>
            @if (authService.isLoading()) {
              <div class="mt-1 text-sm text-blue-600">Loading...</div>
            }
            @if (authService.error()) {
              <div class="mt-1 text-sm text-red-600">{{ authService.error() }}</div>
            }
          </div>
        </div>
      </div>

      <!-- Configuration Info -->
      <div class="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
        <h3 class="font-semibold mb-2 text-gray-900 dark:text-white">Auth0 Configuration</h3>
        <div class="text-sm space-y-1 text-gray-600 dark:text-gray-400">
          <div><span class="font-medium">Domain:</span> {{ envService.auth0Config.domain }}</div>
          <div><span class="font-medium">Client ID:</span> {{ envService.auth0Config.clientId }}</div>
          <div><span class="font-medium">Audience:</span> {{ envService.auth0Config.audience }}</div>
          <div><span class="font-medium">API URL:</span> {{ envService.apiUrl }}</div>
        </div>
      </div>

      <!-- Auth Actions -->
      @if (!authService.isAuthenticated()) {
        <div class="space-y-4">
          <button 
            (click)="login()"
            [disabled]="authService.isLoading()"
            class="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md font-medium transition-colors"
          >
            Login with Auth0
          </button>
          
          <div class="text-center text-sm text-gray-500 dark:text-gray-400">
            Click to authenticate and test the login flow
          </div>
        </div>
      } @else {
        <!-- User Info -->
        <div class="space-y-4">
          @if (authService.user(); as user) {
            <div class="border rounded-md p-4 dark:border-gray-600">
              <h3 class="font-semibold mb-3 text-gray-900 dark:text-white">User Profile</h3>
              
              <div class="flex items-center space-x-4 mb-4">
                @if (user.picture) {
                  <img [src]="user.picture" [alt]="user.name" class="w-12 h-12 rounded-full">
                } @else {
                  <div class="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-lg font-medium">
                    {{ user.name ? user.name.charAt(0).toUpperCase() : '?' }}
                  </div>
                }
                <div>
                  <div class="font-medium text-gray-900 dark:text-white">{{ user.name }}</div>
                  <div class="text-sm text-gray-600 dark:text-gray-400">{{ user.email }}</div>
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span class="font-medium">User ID:</span> 
                  <span class="font-mono text-xs">{{ user.id }}</span>
                </div>
                <div>
                  <span class="font-medium">Verified:</span> 
                  <span [class]="user.isVerified ? 'text-green-600' : 'text-red-600'">
                    {{ user.isVerified ? 'Yes' : 'No' }}
                  </span>
                </div>
                                <div>
                  <span class="font-medium">Created:</span> 
                  {{ formatDate(user.createdAt.toString()) }}
                </div>
                <div>
                  <span class="font-medium">Active:</span> 
                  <span [class]="user.isActive ? 'text-green-600' : 'text-red-600'">
                    {{ user.isActive ? 'Yes' : 'No' }}
                  </span>
                </div>
              </div>

              <!-- Social Links -->
              @if (user.githubUsername || user.leetcodeUsername || user.codeforcesUsername) {
                <div class="mt-4 pt-4 border-t dark:border-gray-600">
                  <h4 class="font-medium mb-2">Connected Accounts</h4>
                  <div class="space-y-1 text-sm">
                    @if (user.githubUsername) {
                      <div><span class="font-medium">GitHub:</span> {{ user.githubUsername }}</div>
                    }
                    @if (user.leetcodeUsername) {
                      <div><span class="font-medium">LeetCode:</span> {{ user.leetcodeUsername }}</div>
                    }
                    @if (user.codeforcesUsername) {
                      <div><span class="font-medium">Codeforces:</span> {{ user.codeforcesUsername }}</div>
                    }
                  </div>
                </div>
              }
            </div>
          }

          <!-- Auth Actions -->
          <div class="space-y-2">
            <button 
              (click)="testTokenRefresh()"
              [disabled]="authService.isLoading()"
              class="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-md transition-colors"
            >
              Test Token Refresh
            </button>
            
            <button 
              (click)="testApiCall()"
              [disabled]="authService.isLoading()"
              class="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-md transition-colors"
            >
              Test Authenticated API Call
            </button>
            
            <button 
              (click)="logout()"
              [disabled]="authService.isLoading()"
              class="w-full px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-md transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      }

      <!-- Test Results -->
      @if (testResults().length > 0) {
        <div class="mt-6 border rounded-md dark:border-gray-600">
          <div class="p-3 bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600 flex justify-between items-center">
            <h3 class="font-semibold text-gray-900 dark:text-white">Test Results</h3>
            <button 
              (click)="clearTestResults()"
              class="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
            >
              Clear
            </button>
          </div>
          
          <div class="p-3 space-y-2 max-h-64 overflow-y-auto">
            @for (result of testResults(); track result.timestamp) {
              <div class="border rounded p-3" [class]="getResultClass(result.success)">
                <div class="flex justify-between items-start">
                  <div class="flex-1">
                    <div class="font-medium">{{ result.action }}</div>
                    <div class="text-sm mt-1">{{ result.message }}</div>
                    @if (result.data) {
                      <pre class="mt-2 text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto">{{ formatData(result.data) }}</pre>
                    }
                  </div>
                  <span class="text-xs text-gray-500 ml-4">
                    {{ formatTime(result.timestamp) }}
                  </span>
                </div>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `
})
export class AuthTestComponent implements OnInit {
  readonly authService = inject(AuthenticationService);
  readonly envService = inject(EnvironmentService);

  testResults = signal<Array<{
    timestamp: Date;
    action: string;
    success: boolean;
    message: string;
    data?: any;
  }>>([]);

  ngOnInit(): void {
    // Test authentication state on init
    this.addTestResult('Component Initialized', true, 'Authentication test component loaded');
  }

  login(): void {
    try {
      this.authService.login();
      this.addTestResult('Login Initiated', true, 'Redirecting to Auth0 login...');
    } catch (error: any) {
      this.addTestResult('Login Failed', false, error.message || 'Failed to initiate login');
    }
  }

  logout(): void {
    try {
      this.authService.logout();
      this.addTestResult('Logout Initiated', true, 'Logging out and redirecting...');
    } catch (error: any) {
      this.addTestResult('Logout Failed', false, error.message || 'Failed to logout');
    }
  }

  testTokenRefresh(): void {
    this.authService.getAccessToken().subscribe({
      next: (token) => {
        if (token) {
          this.addTestResult('Token Refresh', true, 'Successfully retrieved access token', {
            tokenLength: token.length,
            tokenPrefix: token.substring(0, 20) + '...'
          });
        } else {
          this.addTestResult('Token Refresh', false, 'No token retrieved');
        }
      },
      error: (error) => {
        this.addTestResult('Token Refresh', false, error.message || 'Failed to refresh token');
      }
    });
  }

  testApiCall(): void {
    // This would make an API call to test authentication
    this.authService.getUserProfile().subscribe({
      next: (profile) => {
        this.addTestResult('API Call Test', true, 'Successfully called authenticated API', {
          profileKeys: Object.keys(profile)
        });
      },
      error: (error) => {
        this.addTestResult('API Call Test', false, error.message || 'Failed to call authenticated API');
      }
    });
  }

  private addTestResult(action: string, success: boolean, message: string, data?: any): void {
    this.testResults.update(results => [
      ...results,
      {
        timestamp: new Date(),
        action,
        success,
        message,
        data
      }
    ].slice(-10)); // Keep only last 10 results
  }

  clearTestResults(): void {
    this.testResults.set([]);
  }

  getAuthStatusClass(): string {
    if (this.authService.error()) {
      return 'border-red-300 bg-red-50 dark:bg-red-900/20';
    }
    if (this.authService.isAuthenticated()) {
      return 'border-green-300 bg-green-50 dark:bg-green-900/20';
    }
    return 'border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20';
  }

  getStatusIndicatorClass(): string {
    if (this.authService.error()) {
      return 'bg-red-500';
    }
    if (this.authService.isAuthenticated()) {
      return 'bg-green-500';
    }
    if (this.authService.isLoading()) {
      return 'bg-yellow-500 animate-pulse';
    }
    return 'bg-gray-500';
  }

  getAuthStatusText(): string {
    if (this.authService.error()) {
      return 'Authentication Error';
    }
    if (this.authService.isAuthenticated()) {
      return 'Authenticated';
    }
    if (this.authService.isLoading()) {
      return 'Loading...';
    }
    return 'Not Authenticated';
  }

  getResultClass(success: boolean): string {
    return success 
      ? 'border-green-200 bg-green-50 dark:bg-green-900/20' 
      : 'border-red-200 bg-red-50 dark:bg-red-900/20';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  formatTime(timestamp: Date): string {
    return timestamp.toLocaleTimeString();
  }

  formatData(data: any): string {
    return JSON.stringify(data, null, 2);
  }
}