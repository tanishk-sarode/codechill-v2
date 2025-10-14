import { Routes } from '@angular/router';

export const routes: Routes = [
  // Public routes
  {
    path: '',
    loadComponent: () => import('./features/auth/components/login/login.component').then(m => m.LoginComponent)
  },
  // Collaborative editor demo route
  {
    path: 'collab',
    loadComponent: () => import('./features/editor/components/collab-editor/collab-editor.component').then(m => m.CollabEditorComponent)
  },
  
  // Protected routes (we'll add guards later)
  {
    path: 'dashboard',
    redirectTo: 'collab',
    pathMatch: 'full'
  },
  
  // Fallback
  {
    path: '**',
    redirectTo: ''
  }
];