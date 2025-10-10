import { Injectable, inject } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable, switchMap, catchError, of } from 'rxjs';
import { AuthenticationService } from '@core/services/authentication.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private readonly authService = inject(AuthenticationService);

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Skip adding auth header for auth endpoints
    if (req.url.includes('/auth/')) {
      return next.handle(req);
    }

    return this.authService.getAccessToken().pipe(
      switchMap(token => {
        if (token) {
          const authReq = req.clone({
            setHeaders: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          return next.handle(authReq);
        }
        return next.handle(req);
      }),
      catchError(error => {
        // Handle token refresh errors
        if (error.status === 401) {
          this.authService.logout();
        }
        throw error;
      })
    );
  }
}