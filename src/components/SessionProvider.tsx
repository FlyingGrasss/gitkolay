"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  GitHubApiError,
  getAuthenticatedUser,
  getErrorMessage,
} from "@/lib/github";
import {
  GUEST_STORAGE_KEY,
  TOKEN_STORAGE_KEY,
  readSessionValue,
  removeSessionValue,
  writeSessionValue,
} from "@/lib/session";
import type { GitHubUser } from "@/lib/types";

interface ConnectResult {
  ok: boolean;
  error?: string;
}

interface SessionContextValue {
  token: string | null;
  user: GitHubUser | null;
  loading: boolean;
  guest: boolean;
  authError: string | null;
  connect: (token: string) => Promise<ConnectResult>;
  disconnect: () => void;
  skip: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [guest, setGuest] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = readSessionValue(TOKEN_STORAGE_KEY);
    const storedGuest = readSessionValue(GUEST_STORAGE_KEY) === "1";

    setGuest(storedGuest);

    if (!storedToken) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const validate = async () => {
      try {
        const authenticatedUser = await getAuthenticatedUser(storedToken);

        if (cancelled) {
          return;
        }

        setToken(storedToken);
        setUser(authenticatedUser);
        setAuthError(null);
      } catch (error) {
        if (cancelled) {
          return;
        }

        removeSessionValue(GUEST_STORAGE_KEY);
        setGuest(false);

        if (error instanceof GitHubApiError && error.status === 401) {
          removeSessionValue(TOKEN_STORAGE_KEY);
        }

        setAuthError(getErrorMessage(error));
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void validate();

    return () => {
      cancelled = true;
    };
  }, []);

  const connect = useCallback(async (rawToken: string): Promise<ConnectResult> => {
    const value = rawToken.trim();

    if (!value) {
      return { ok: false, error: "Token girin." };
    }

    setAuthError(null);

    try {
      const authenticatedUser = await getAuthenticatedUser(value);
      writeSessionValue(TOKEN_STORAGE_KEY, value);
      removeSessionValue(GUEST_STORAGE_KEY);
      setToken(value);
      setUser(authenticatedUser);
      setGuest(false);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: getErrorMessage(error) };
    }
  }, []);

  const disconnect = useCallback(() => {
    removeSessionValue(TOKEN_STORAGE_KEY);
    removeSessionValue(GUEST_STORAGE_KEY);
    setToken(null);
    setUser(null);
    setGuest(false);
    setAuthError(null);
  }, []);

  const skip = useCallback(() => {
    writeSessionValue(GUEST_STORAGE_KEY, "1");
    setGuest(true);
    setAuthError(null);
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      token,
      user,
      loading,
      guest,
      authError,
      connect,
      disconnect,
      skip,
    }),
    [token, user, loading, guest, authError, connect, disconnect, skip],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error("useSession bir SessionProvider içinde kullanılmalıdır.");
  }

  return context;
}
