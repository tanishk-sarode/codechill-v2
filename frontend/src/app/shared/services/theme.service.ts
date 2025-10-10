import { Injectable, signal } from '@angular/core';

export type Theme = 'light' | 'dark' | 'system';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly themeSignal = signal<Theme>('system');
  private readonly systemThemeSignal = signal<'light' | 'dark'>('light');
  
  readonly theme = this.themeSignal.asReadonly();
  readonly systemTheme = this.systemThemeSignal.asReadonly();

  constructor() {
    this.initializeTheme();
    this.watchSystemTheme();
  }

  private initializeTheme(): void {
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      this.themeSignal.set(savedTheme);
    }
    this.applyTheme();
  }

  private watchSystemTheme(): void {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      // Set initial system theme
      this.systemThemeSignal.set(mediaQuery.matches ? 'dark' : 'light');
      
      // Listen for changes
      mediaQuery.addEventListener('change', (e) => {
        this.systemThemeSignal.set(e.matches ? 'dark' : 'light');
        this.applyTheme();
      });
    }
  }

  setTheme(theme: Theme): void {
    this.themeSignal.set(theme);
    localStorage.setItem('theme', theme);
    this.applyTheme();
  }

  private applyTheme(): void {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    const currentTheme = this.themeSignal();
    
    // Remove existing theme classes
    root.classList.remove('light', 'dark');
    
    let activeTheme: 'light' | 'dark';
    
    if (currentTheme === 'system') {
      activeTheme = this.systemThemeSignal();
    } else {
      activeTheme = currentTheme;
    }
    
    // Add the active theme class
    root.classList.add(activeTheme);
    
    // Set data attribute for styling
    root.setAttribute('data-theme', activeTheme);
  }

  toggleTheme(): void {
    const currentTheme = this.themeSignal();
    
    switch (currentTheme) {
      case 'light':
        this.setTheme('dark');
        break;
      case 'dark':
        this.setTheme('system');
        break;
      case 'system':
        this.setTheme('light');
        break;
    }
  }

  getEffectiveTheme(): 'light' | 'dark' {
    const currentTheme = this.themeSignal();
    return currentTheme === 'system' ? this.systemThemeSignal() : currentTheme;
  }
}