import { Injectable, inject } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { map, take } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { AuthenticationService } from '@core/services/authentication.service';

@Injectable({
  providedIn: 'root'
})
export class GuestGuard implements CanActivate {
  private readonly authService = inject(AuthenticationService);
  private readonly router = inject(Router);

  canActivate(): Observable<boolean> {
    return this.authService.isAuthenticated$.pipe(
      take(1),
      map(isAuthenticated => {
        if (isAuthenticated) {
          this.router.navigate(['/dashboard']);
          return false;
        }
        return true;
      })
    );
  }
}