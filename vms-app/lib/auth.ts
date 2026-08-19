import { supabase } from './supabase';

export interface UserSession {
  id: string;
  username: string;
  role: 'admin' | 'user';
  requires_password_change: boolean;
}

const AUTH_KEY = 'vms_user_session';

export function getStoredSession(): UserSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredSession(session: UserSession | null) {
  if (typeof window === 'undefined') return;
  if (session) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(AUTH_KEY);
  }
}

export async function hashPasswordAsync(password: string, salt: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + salt);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback string hash
  let hash = 0;
  const str = password + salt;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}
