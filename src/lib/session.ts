export const TOKEN_STORAGE_KEY = "gitkolay:token";
export const GUEST_STORAGE_KEY = "gitkolay:guest";

export function readSessionValue(key: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeSessionValue(key: string, value: string): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // Session storage can be unavailable in hardened browser modes.
  }
}

export function removeSessionValue(key: string): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // Session storage can be unavailable in hardened browser modes.
  }
}
