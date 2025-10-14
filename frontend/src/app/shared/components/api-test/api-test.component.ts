import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { catchError, tap } from 'rxjs/operators';
import { of } from 'rxjs';
import { EnvironmentService } from '@core/services/environment.service';

interface ApiTestResult {
  endpoint: string;
  status: 'testing' | 'success' | 'error';
  response?: any;
  error?: string;
  duration?: number;
}

@Component({
  selector: 'app-api-test',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h2 class="text-2xl font-bold mb-4 text-gray-900 dark:text-white">API Connection Test</h2>
      
      <div class="space-y-4">
        <button 
          (click)="testAllEndpoints()"
          [disabled]="isTestingAll()"
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md font-medium transition-colors"
        >
          {{ isTestingAll() ? 'Testing...' : 'Test All Endpoints' }}
        </button>

        <div class="space-y-3">
          @for (result of testResults(); track result.endpoint) {
            <div class="border rounded-md p-4" 
                 [class]="getResultClass(result.status)">
              <div class="flex items-center justify-between">
                <span class="font-mono text-sm">{{ result.endpoint }}</span>
                <div class="flex items-center space-x-2">
                  @if (result.duration) {
                    <span class="text-xs text-gray-500">{{ result.duration }}ms</span>
                  }
                  <span [class]="getStatusClass(result.status)">
                    {{ getStatusText(result.status) }}
                  </span>
                </div>
              </div>
              
              @if (result.response) {
                <pre class="mt-2 text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-x-auto">{{ formatResponse(result.response) }}</pre>
              }
              
              @if (result.error) {
                <div class="mt-2 text-red-600 text-sm">{{ result.error }}</div>
              }
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class ApiTestComponent {
  private readonly http = inject(HttpClient);
  private readonly envService = inject(EnvironmentService);

  testResults = signal<ApiTestResult[]>([]);
  
  isTestingAll = signal(false);

  private readonly endpoints = [
    '/health',
    '/api',
    '/api/rooms',
    '/api/auth/verify-token',
    '/api/users/profile',
    '/api/execution/languages',
    '/api/chat/room/test-room/messages'
  ];

  testAllEndpoints(): void {
    this.isTestingAll.set(true);
    this.testResults.set([]);

    this.endpoints.forEach(endpoint => {
      this.testEndpoint(endpoint);
    });
  }

  private testEndpoint(endpoint: string): void {
    const url = endpoint.startsWith('/api') ? 
      `${this.envService.socketUrl}${endpoint}` : 
      `${this.envService.socketUrl}${endpoint}`;

    const startTime = Date.now();
    
    // Add initial result
    this.addResult({
      endpoint,
      status: 'testing'
    });

    this.http.get(url).pipe(
      tap(response => {
        const duration = Date.now() - startTime;
        this.updateResult(endpoint, {
          status: 'success',
          response,
          duration
        });
      }),
      catchError(error => {
        const duration = Date.now() - startTime;
        this.updateResult(endpoint, {
          status: 'error',
          error: error.message || 'Unknown error',
          duration
        });
        return of(null);
      })
    ).subscribe({
      complete: () => {
        // Check if all tests are complete
        const results = this.testResults();
        const allComplete = results.every(r => r.status !== 'testing');
        if (allComplete) {
          this.isTestingAll.set(false);
        }
      }
    });
  }

  private addResult(result: ApiTestResult): void {
    this.testResults.update(results => [...results, result]);
  }

  private updateResult(endpoint: string, updates: Partial<ApiTestResult>): void {
    this.testResults.update(results => 
      results.map(r => r.endpoint === endpoint ? { ...r, ...updates } : r)
    );
  }

  getResultClass(status: string): string {
    switch (status) {
      case 'testing': return 'border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20';
      case 'success': return 'border-green-300 bg-green-50 dark:bg-green-900/20';
      case 'error': return 'border-red-300 bg-red-50 dark:bg-red-900/20';
      default: return 'border-gray-300 bg-gray-50 dark:bg-gray-700';
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'testing': return 'text-yellow-600 dark:text-yellow-400';
      case 'success': return 'text-green-600 dark:text-green-400';
      case 'error': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'testing': return '⏳ Testing...';
      case 'success': return '✅ Success';
      case 'error': return '❌ Error';
      default: return '❓ Unknown';
    }
  }

  formatResponse(response: any): string {
    return JSON.stringify(response, null, 2);
  }
}