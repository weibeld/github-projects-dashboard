/**
 * Mock mode utilities for the application
 * This module provides the core mock mode detection functionality
 * Mock mode can be used for testing, demos, or other purposes
 */

export function isMockMode(): boolean {
  if (typeof window === 'undefined') return false;
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('mock') === 'true' || (window.location.hostname === 'localhost' && urlParams.has('mock'));
}

/**
 * Simulates the asynchronous nature of real database/API calls with artificial delay.
 * This ensures mock implementations behave realistically for testing:
 * - Catches race conditions and timing bugs
 * - Tests loading states and UI transitions
 * - Provides realistic performance characteristics
 */
export function mockDelay(ms: number = 100): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}