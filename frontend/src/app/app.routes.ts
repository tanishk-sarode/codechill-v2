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
  
  // API Test route
  {
    path: 'api-test',
    loadComponent: () => import('./shared/components/api-test/api-test.component').then(m => m.ApiTestComponent)
  },
  
  // Socket.IO Test route
  {
    path: 'socket-test',
    loadComponent: () => import('./shared/components/socket-test/socket-test.component').then(m => m.SocketTestComponent)
  },
  
  // Room Integration Test route
  {
    path: 'room-test',
    loadComponent: () => import('./features/room/components/room-test/room-test.component').then(m => m.RoomTestComponent)
  },
  
  // Authentication Test route
  {
    path: 'auth-test',
    loadComponent: () => import('./shared/components/auth-test/auth-test.component').then(m => m.AuthTestComponent)
  },
  
  // Auth0 callback route
  {
    path: 'callback',
    loadComponent: () => import('./features/auth/components/callback/callback.component').then(m => m.CallbackComponent)
  },
  
  // Protected routes (we'll add guards later)
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  
  // Fallback
  {
    path: '**',
    redirectTo: ''
  }
];