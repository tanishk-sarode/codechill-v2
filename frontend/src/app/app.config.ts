import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, HTTP_INTERCEPTORS } from '@angular/common/http';
import { provideAuth0 } from '@auth0/auth0-angular';
import { routes } from './app.routes';
import { environment } from '../environments/environment';
import { AuthInterceptor } from '@core/interceptors/auth.interceptor';
import { ErrorInterceptor } from '@core/interceptors/error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(),
    
    // Auth0 Configuration
    provideAuth0({
      domain: environment.auth0.domain,
      clientId: environment.auth0.clientId,
      authorizationParams: {
        redirect_uri: window.location.origin + '/callback',
        audience: environment.auth0.audience,
        scope: 'openid profile email',
        response_type: 'code'
      },
      useRefreshTokens: true,
      cacheLocation: 'localstorage',
      httpInterceptor: {
        allowedList: [
          {
            uri: environment.apiUrl + '/*',
            tokenOptions: {
              authorizationParams: {
                audience: environment.auth0.audience,
                scope: 'openid profile email'
              }
            }
          }
        ]
      }
    }),
    
    // HTTP Interceptors
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: ErrorInterceptor,
      multi: true
    }
  ]
};