import { fetch as tauriFetch } from '@tauri-apps/plugin-http';

/**
 * A wrapper around fetch that uses Tauri's HTTP plugin when running in a desktop environment
 * to bypass CORS issues, and falls back to native fetch in the browser.
 */
export async function universalFetch(url: string, options?: any) {
  // Check if we are running in a Tauri environment
  const isTauri = !!(window as any).__TAURI_INTERNALS__;

  if (isTauri) {
    try {
      // Tauri's fetch has a slightly different API for options
      // but it's mostly compatible for basic GET/POST
      const response = await tauriFetch(url, options);
      
      // Wrap Tauri response to match native Response interface for common methods
      return {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        json: () => response.json(),
        text: () => response.text(),
        blob: () => response.blob(),
        headers: response.headers,
      };
    } catch (error) {
      console.error('Tauri fetch error:', error);
      throw error;
    }
  }

  // Fallback to native fetch
  return fetch(url, options as RequestInit);
}
