import { Injectable } from '@angular/core';
import { Environment } from '@core/types';

@Injectable({
  providedIn: 'root'
})
export class EnvironmentService {
  private readonly env: Environment = {
    production: false,
    apiUrl: 'http://localhost:5001/api',
    socketUrl: 'http://localhost:5001',
    auth0: {
      domain: 'your-auth0-domain.auth0.com',
      clientId: 'your-auth0-client-id',
      audience: 'your-auth0-audience'
    },
    github: {
      clientId: 'your-github-client-id'
    }
  };

  get production(): boolean {
    return this.env.production;
  }

  get apiUrl(): string {
    return this.env.apiUrl;
  }

  get socketUrl(): string {
    return this.env.socketUrl;
  }

  get auth0Config() {
    return this.env.auth0;
  }

  get githubClientId(): string {
    return this.env.github.clientId;
  }
}