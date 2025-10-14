import { Injectable, signal, computed, inject } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';
import { map, switchMap, catchError, tap } from 'rxjs/operators';
import { of, Observable, BehaviorSubject } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { User, AuthState, UserProfile, ApiResponse } from '@core/types';
import { EnvironmentService } from '@core/services/environment.service';

@Injectable({
  providedIn: 'root'
})
export class AuthenticationService {
  private readonly auth0 = inject(AuthService);
  private readonly http = inject(HttpClient);
  private readonly envService = inject(EnvironmentService);

  // Signals for reactive state management
  private readonly authStateSignal = signal<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null
  });

  // Computed values
  readonly user = computed(() => this.authStateSignal().user);
  readonly isAuthenticated = computed(() => this.authStateSignal().isAuthenticated);
  readonly isLoading = computed(() => this.authStateSignal().isLoading);
  readonly error = computed(() => this.authStateSignal().error);

  // Observable streams for compatibility
  readonly user$ = this.auth0.user$;
  readonly isAuthenticated$ = this.auth0.isAuthenticated$;
  readonly isLoading$ = this.auth0.isLoading$;

  constructor() {
    this.initializeAuth();
  }

  private initializeAuth(): void {
    // Subscribe to Auth0 state changes
    this.auth0.isLoading$.pipe(
      switchMap(isLoading => {
        if (!isLoading) {
          return this.auth0.isAuthenticated$.pipe(
            switchMap(isAuthenticated => {
              if (isAuthenticated) {
                return this.auth0.user$.pipe(
                  switchMap(auth0User => {
                    if (auth0User) {
                      return this.syncUserWithBackend(auth0User);
                    }
                    return of(null);
                  })
                );
              } else {
                this.updateAuthState({
                  user: null,
                  isAuthenticated: false,
                  isLoading: false,
                  error: null
                });
                return of(null);
              }
            })
          );
        } else {
          this.updateAuthState({
            user: null,
            isAuthenticated: false,
            isLoading: true,
            error: null
          });
          return of(null);
        }
      }),
      catchError(error => {
        this.updateAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: error.message || 'Authentication error'
        });
        return of(null);
      })
    ).subscribe();
  }

  private syncUserWithBackend(auth0User: any): Observable<User | null> {
    const userData = {
      email: auth0User.email,
      name: auth0User.name,
      picture: auth0User.picture,
      auth0Id: auth0User.sub
    };

    // Get the Auth0 access token and send it in the Authorization header
    return this.auth0.getAccessTokenSilently().pipe(
      switchMap((accessToken: string) => {
        const headers = new HttpHeaders({
          Authorization: `Bearer ${accessToken}`
        });
        return this.http.post<{ data: User }>(`${this.envService.apiUrl}/auth/sync`, userData, { headers });
      }),
      map(response => response.data),
      tap(user => {
        this.updateAuthState({
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null
        });
      }),
      catchError(error => {
        this.updateAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: 'Failed to sync user data'
        });
        return of(null);
      })
    );
  }

  private updateAuthState(state: Partial<AuthState>): void {
    this.authStateSignal.update(current => ({ ...current, ...state }));
  }

  // Auth actions
  login(): void {
    this.auth0.loginWithRedirect({
      appState: { target: '/dashboard' }
    });
  }

  logout(): void {
    this.auth0.logout({
      logoutParams: {
        returnTo: window.location.origin
      }
    });
  }

  // Get access token for API calls
  getAccessToken(): Observable<string | null> {
    return this.auth0.getAccessTokenSilently().pipe(
      catchError(() => of(null))
    );
  }

  // Helper method to create headers properly
  private createHeaders(token: string | null): { headers?: HttpHeaders } {
    if (token) {
      return { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) };
    }
    return {};
  }

  // Update user profile
  updateProfile(updates: Partial<User>): Observable<User> {
    return this.getAccessToken().pipe(
      switchMap(token => {
        const options = this.createHeaders(token);
        return this.http.patch<{ data: User }>(`${this.envService.apiUrl}/users/profile`, updates, options);
      }),
      map(response => response.data),
      tap(user => {
        this.updateAuthState({ user });
      })
    );
  }

  // Get user profile with stats
  getUserProfile(userId?: string): Observable<UserProfile> {
    const targetUserId = userId || this.user()?.id;
    if (!targetUserId) {
      throw new Error('User ID is required');
    }

    return this.getAccessToken().pipe(
      switchMap(token => {
        const options = this.createHeaders(token);
        return this.http.get<{ data: UserProfile }>(`${this.envService.apiUrl}/users/${targetUserId}/profile`, options);
      }),
      map(response => response.data)
    );
  }

  // Link social accounts
  linkGitHub(username: string): Observable<User> {
    return this.getAccessToken().pipe(
      switchMap(token => {
        const options = this.createHeaders(token);
        return this.http.post<{ data: User }>(`${this.envService.apiUrl}/users/link/github`, { username }, options);
      }),
      map(response => response.data),
      tap(user => {
        this.updateAuthState({ user });
      })
    );
  }

  linkLeetCode(username: string): Observable<User> {
    return this.getAccessToken().pipe(
      switchMap(token => {
        const options = this.createHeaders(token);
        return this.http.post<{ data: User }>(`${this.envService.apiUrl}/users/link/leetcode`, { username }, options);
      }),
      map(response => response.data),
      tap(user => {
        this.updateAuthState({ user });
      })
    );
  }

  linkCodeforces(username: string): Observable<User> {
    return this.getAccessToken().pipe(
      switchMap(token => {
        const options = this.createHeaders(token);
        return this.http.post<{ data: User }>(`${this.envService.apiUrl}/users/link/codeforces`, { username }, options);
      }),
      map(response => response.data),
      tap(user => {
        this.updateAuthState({ user });
      })
    );
  }
}