import { writable } from 'svelte/store';
import type { AppData } from './types';

// Temporarily using local storage
const LOCAL_STORAGE_KEY = 'appData';

function loadFromStorage(): AppData {
  try {
    // Temporarily using local storage
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (err) {
    console.warn('Failed to load from localStorage:', err);
  }
  // If nothing stored yet
  return { statuses: [], labels: [], views: [], projects: [] };
}

function saveToStorage(data: AppData) {
  try {
    // Temporarily using local storage
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('Failed to save to localStorage:', err);
  }
}

export const appData = writable<AppData>(loadFromStorage());
appData.subscribe(saveToStorage);
