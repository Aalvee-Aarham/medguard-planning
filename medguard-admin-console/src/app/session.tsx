import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

export type Area = 'hospital' | 'medguard';

export interface DemoUser {
  id: string;
  area: Area;
  name: string;
  contact: string;
  phone?: string;
  hospitalId?: string;
}

export const demoUsers: DemoUser[] = [
  { id: 'farhana', area: 'hospital', name: 'Farhana Haque', contact: 'farhana@shanti.example', phone: '+8801700000001', hospitalId: 'shanti' },
  { id: 'tania', area: 'medguard', name: 'Tania', contact: 'tania@medguard.example', phone: '+8801700000002' },
  { id: 'sabbir', area: 'medguard', name: 'Sabbir', contact: 'sabbir@medguard.example', phone: '+8801700000003' },
];

export const DEMO_OTP = '123456';
export const DEMO_AUTHENTICATOR = '000000';
const IDLE_LIMIT = 10 * 60 * 1000;
const SESSION_KEY = 'medguard.admin.session';

interface Session {
  user: DemoUser;
  locked: boolean;
  lastActive: number;
}

interface SessionContextValue {
  user: DemoUser | null;
  locked: boolean;
  signIn: (user: DemoUser) => void;
  signOut: () => void;
  lock: () => void;
  unlock: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function loginPath(area: Area) {
  return area === 'hospital' ? '/login' : '/medguard/login';
}

function restoreSession(): Session | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? 'null') as Session | null;
    if (!value?.user?.id || !['hospital', 'medguard'].includes(value.user.area) || !Number.isFinite(value.lastActive)) {
      return null;
    }
    return { ...value, locked: value.locked || Date.now() - value.lastActive >= IDLE_LIMIT };
  } catch {
    return null;
  }
}

function saveSession(value: Session | null) {
  try {
    if (value) sessionStorage.setItem(SESSION_KEY, JSON.stringify(value));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Sign-in still works when the browser disables session storage.
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState(restoreSession);
  const lastActive = useRef(session?.lastActive ?? 0);
  const user = session?.user ?? null;
  const locked = session?.locked ?? false;

  const signIn = useCallback((nextUser: DemoUser) => {
    lastActive.current = Date.now();
    const nextSession = { user: nextUser, locked: false, lastActive: lastActive.current };
    setSession(nextSession);
    saveSession(nextSession);
  }, []);

  const signOut = useCallback(() => {
    setSession(null);
    saveSession(null);
  }, []);

  const lock = useCallback(() => {
    if (!user) return;
    const nextSession = { user, locked: true, lastActive: lastActive.current };
    setSession(nextSession);
    saveSession(nextSession);
  }, [user]);

  const unlock = useCallback(() => {
    if (user) signIn(user);
  }, [user, signIn]);

  useEffect(() => {
    if (!user || locked) return;
    let timeout: ReturnType<typeof setTimeout>;
    let lastSaved = lastActive.current;
    const checkIdle = () => {
      const remaining = IDLE_LIMIT - (Date.now() - lastActive.current);
      clearTimeout(timeout);
      if (remaining <= 0) lock();
      else timeout = setTimeout(checkIdle, remaining);
    };
    const onActivity = () => {
      const now = Date.now();
      if (now - lastActive.current >= IDLE_LIMIT) {
        lock();
        return;
      }
      lastActive.current = now;
      if (now - lastSaved >= 1000) {
        saveSession({ user, locked: false, lastActive: now });
        lastSaved = now;
      }
      checkIdle();
    };
    const events = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;
    events.forEach((event) => window.addEventListener(event, onActivity, { capture: true, passive: true }));
    document.addEventListener('visibilitychange', checkIdle);
    checkIdle();

    return () => {
      clearTimeout(timeout);
      events.forEach((event) => window.removeEventListener(event, onActivity, true));
      document.removeEventListener('visibilitychange', checkIdle);
    };
  }, [user, locked, lock]);

  return (
    <SessionContext.Provider value={{ user, locked, signIn, signOut, lock, unlock }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error('SessionProvider is missing.');
  return session;
}
