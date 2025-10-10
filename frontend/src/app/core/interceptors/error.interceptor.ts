import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        let errorMessage = 'An unexpected error occurred';
        
        if (error.error instanceof ErrorEvent) {
          // Client-side error
          errorMessage = error.error.message;
        } else {
          // Server-side error
          switch (error.status) {
            case 400:
              errorMessage = error.error?.message || 'Bad Request';
              break;
            case 401:
              errorMessage = 'Unauthorized access';
              break;
            case 403:
              errorMessage = 'Access forbidden';
              break;
            case 404:
              errorMessage = 'Resource not found';
              break;
            case 422:
              errorMessage = error.error?.message || 'Validation error';
              break;
            case 500:
              errorMessage = 'Internal server error';
              break;
            case 503:
              errorMessage = 'Service unavailable';
              break;
            default:
              errorMessage = error.error?.message || `Error ${error.status}: ${error.statusText}`;
          }
        }

        console.error('HTTP Error:', error);
        
        // You can add toast notifications here
        // this.notificationService.showError(errorMessage);
        
        return throwError(() => new Error(errorMessage));
      })
    );
  }
}