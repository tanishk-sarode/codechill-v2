import { Component, OnInit, inject, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '@auth0/auth0-angular';
import { of, Subscription, timer } from 'rxjs';
import { filter, switchMap, catchError, take } from 'rxjs/operators';

@Component({
  selector: 'app-callback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div class="max-w-md w-full space-y-8">
        <div class="text-center">
          <div class="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
            <svg class="animate-spin h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <h2 class="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
            {{ loading ? 'Completing Sign In' : 'Authentication Error' }}
          </h2>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {{ loading ? 'Please wait while we process your authentication...' : error }}
          </p>
          <p class="mt-2 text-xs font-mono text-gray-400" *ngIf="debug">
            DEBUG: {{ debug }} | isLoading: {{ authLoading }} | isAuth: {{ authState }}
          </p>
          
          @if (!loading && error) {
            <div class="mt-6 space-y-3">
              <button 
                (click)="retryAuth()"
                class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Try Again
              </button>
              <button 
                (click)="goHome()"
                class="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Go to Home
              </button>
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class CallbackComponent implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  private sub = new Subscription();
  private manualTried = false;
  private navigated = false;

  loading = true;
  error = '';
  debug = '';
  authLoading = true;
  authState = false;

  ngOnInit(): void {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');
    const errorDesc = params.get('error_description');
    this.debug = `code=${code} error=${error}`;

    if (error) {
      this.loading = false;
      this.error = errorDesc || error || 'Authentication error';
      return;
    }

    // Core flow: wait until loading completes, then observe isAuthenticated until true
    console.log('[Callback] Waiting for Auth0 SDK (race-safe)...');
    const authFlowSub = this.auth.isLoading$.pipe(
      filter(isLoading => !isLoading),
      switchMap(() => this.auth.isAuthenticated$)
    ).subscribe(isAuth => {
      this.authLoading = false;
      this.authState = isAuth;
      if (isAuth && !this.navigated) {
        console.log('[Callback] Authenticated -> navigating to /dashboard');
        this.navigated = true;
        this.router.navigateByUrl('/dashboard');
      } else if (!isAuth) {
        // Still not authenticated after loading finished; will rely on fallback timer
        console.warn('[Callback] Loading complete but isAuthenticated false, awaiting fallback...');
      }
    });
    this.sub.add(authFlowSub);

    // Fallback timer: if after 5s post-load we are not authenticated, attempt manual handleRedirectCallback once
    const fallbackSub = timer(5000).subscribe(() => {
      if (!this.navigated && !this.authState && code && !this.manualTried) {
        this.manualTried = true;
        console.warn('[Callback] Fallback firing -> calling handleRedirectCallback() manually');
        this.auth.handleRedirectCallback().pipe(
          catchError(err => {
            console.error('[Callback] Manual callback failed:', err);
            return of(null);
          })
        ).subscribe(result => {
          // After manual attempt, check auth again quickly
          if (!this.navigated) {
            this.auth.isAuthenticated$.pipe(take(1)).subscribe(reAuth => {
              if (reAuth) {
                console.log('[Callback] Manual success -> navigating to /dashboard');
                this.navigated = true;
                this.router.navigateByUrl('/dashboard');
              } else {
                this.loading = false;
                this.error = 'Authentication did not complete. Please try again.';
              }
            });
          }
        });
      } else if (!this.navigated && !code) {
        // No code param present; likely user landed here improperly
        this.loading = false;
        this.error = 'Invalid callback state.';
      }
    });
    this.sub.add(fallbackSub);
  }

  // Removed manual handleRedirectCallback(); SDK already processes it.

  retryAuth(): void {
    this.router.navigate(['/']);
  }

  goHome(): void {
    this.router.navigate(['/']);
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }
}