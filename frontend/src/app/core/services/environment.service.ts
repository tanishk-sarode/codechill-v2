import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Environment } from '@core/types';

@Injectable({
  providedIn: 'root'
})
export class EnvironmentService {
  private readonly env: Environment = environment;

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