import { Routes } from '@angular/router';

export const routes: Routes = [
  // Public routes
  {
    path: '',
    loadComponent: () => import('./features/auth/components/login/login.component').then(m => m.LoginComponent)
  },
  
  // Protected routes (we'll add guards later)
  {
    path: 'dashboard',
    loadComponent: () => import('./features/auth/components/login/login.component').then(m => m.LoginComponent)
  },
  
  // Fallback
  {
    path: '**',
    redirectTo: ''
  }
];