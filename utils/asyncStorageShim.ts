// Minimal AsyncStorage shim for web builds
// Provides the subset used by wallet libraries

type NullableString = string | null;

const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const AsyncStorage = {
  async getItem(key: string): Promise<NullableString> {
    try {
      return isBrowser ? window.localStorage.getItem(key) : null;
    } catch {
      return null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    try {
      if (isBrowser) window.localStorage.setItem(key, value);
    } catch {
      // ignore
    }
  },
  async removeItem(key: string): Promise<void> {
    try {
      if (isBrowser) window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
  },
  async clear(): Promise<void> {
    try {
      if (isBrowser) window.localStorage.clear();
    } catch {
      // ignore
    }
  },
};

export default AsyncStorage;


