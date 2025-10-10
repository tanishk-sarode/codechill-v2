import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  dismissible?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly toastsSignal = signal<Toast[]>([]);
  
  readonly toasts = this.toastsSignal.asReadonly();

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private addToast(toast: Omit<Toast, 'id'>): string {
    const id = this.generateId();
    const newToast: Toast = {
      id,
      duration: 5000,
      dismissible: true,
      ...toast
    };

    this.toastsSignal.update(toasts => [...toasts, newToast]);

    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, newToast.duration);
    }

    return id;
  }

  success(title: string, message?: string, duration?: number): string {
    return this.addToast({
      type: 'success',
      title,
      message,
      duration
    });
  }

  error(title: string, message?: string, duration?: number): string {
    return this.addToast({
      type: 'error',
      title,
      message,
      duration: duration || 0 // Errors don't auto-dismiss by default
    });
  }

  warning(title: string, message?: string, duration?: number): string {
    return this.addToast({
      type: 'warning',
      title,
      message,
      duration
    });
  }

  info(title: string, message?: string, duration?: number): string {
    return this.addToast({
      type: 'info',
      title,
      message,
      duration
    });
  }

  dismiss(id: string): void {
    this.toastsSignal.update(toasts => toasts.filter(toast => toast.id !== id));
  }

  dismissAll(): void {
    this.toastsSignal.set([]);
  }
}