/**
 * Client-side storage utilities for persistent session and preferences
 */

import { User } from "@shared/schema";

// Keys for localStorage
const STORAGE_KEYS = {
  USER: 'quizzical_user',
  THEME: 'quizzical_theme',
  PREFERENCES: 'quizzical_preferences'
} as const;

// Theme types
export type Theme = 'light' | 'dark';

// User preferences interface
export interface UserPreferences {
  theme: Theme;
  defaultQuizConfig?: {
    amount: number;
    category: number;
    difficulty: 'easy' | 'medium' | 'hard' | 'any';
    timer?: boolean;
  };
}

// Safe localStorage operations with error handling
class ClientStorage {
  private isStorageAvailable(): boolean {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  private getItem(key: string): string | null {
    if (!this.isStorageAvailable()) return null;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private setItem(key: string, value: string): boolean {
    if (!this.isStorageAvailable()) return false;
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }

  private removeItem(key: string): boolean {
    if (!this.isStorageAvailable()) return false;
    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }

  // User session management
  saveUser(user: User): boolean {
    const userData = { ...user, password: undefined }; // Never store password
    return this.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
  }

  getUser(): User | null {
    const userData = this.getItem(STORAGE_KEYS.USER);
    if (!userData) return null;
    
    try {
      return JSON.parse(userData) as User;
    } catch {
      return null;
    }
  }

  removeUser(): boolean {
    return this.removeItem(STORAGE_KEYS.USER);
  }

  // Theme management
  saveTheme(theme: Theme): boolean {
    return this.setItem(STORAGE_KEYS.THEME, theme);
  }

  getTheme(): Theme {
    const theme = this.getItem(STORAGE_KEYS.THEME);
    if (theme === 'dark' || theme === 'light') {
      return theme;
    }
    
    // Default to system preference or light mode
    if (typeof window !== 'undefined' && window.matchMedia) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return prefersDark ? 'dark' : 'light';
    }
    
    return 'light';
  }

  // User preferences management
  savePreferences(preferences: UserPreferences): boolean {
    return this.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(preferences));
  }

  getPreferences(): UserPreferences {
    const prefsData = this.getItem(STORAGE_KEYS.PREFERENCES);
    if (!prefsData) {
      // Return default preferences
      return {
        theme: this.getTheme()
      };
    }
    
    try {
      return JSON.parse(prefsData) as UserPreferences;
    } catch {
      return {
        theme: this.getTheme()
      };
    }
  }

  // Clear all stored data (useful for logout)
  clearAll(): boolean {
    try {
      this.removeUser();
      this.removeItem(STORAGE_KEYS.PREFERENCES);
      // Note: We keep theme preference even after logout
      return true;
    } catch {
      return false;
    }
  }

  // Session validation (check if stored user is still valid)
  async validateSession(): Promise<User | null> {
    const user = this.getUser();
    if (!user || !user.id) return null;

    try {
      // Verify user still exists on server
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const userData = await response.json();
        // Update stored user data with latest from server
        this.saveUser(userData);
        return userData;
      } else if (response.status === 404) {
        // User no longer exists on server, clear local data
        this.removeUser();
        return null;
      } else {
        // Other server errors, keep user logged in locally
        console.warn('Session validation failed, keeping local session:', response.status);
        return user;
      }
    } catch (error) {
      // Network error, keep user logged in locally but warn
      console.warn('Session validation network error, keeping local session:', error);
      return user;
    }
  }
}

// Export singleton instance
export const clientStorage = new ClientStorage();

// Utility functions for direct localStorage access
export const getStoredValue = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;
    return JSON.parse(item);
  } catch {
    return defaultValue;
  }
};

export const setStoredValue = <T>(key: string, value: T): boolean => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};
