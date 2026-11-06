import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  authService,
  tokenStorage,
  ApiError,
  type LoginRequest,
  type LoginResponse,
  type RegisterRequest,
  type User,
} from "../services/authService";

/** Window event dispatched by the query layer whenever the API answers 401. */
export const SESSION_EXPIRED_EVENT = "healthmate:session-expired";

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isInitializing: boolean;
  sessionError: string | null;
  login: (credentials: LoginRequest) => Promise<User>;
  /** Adopt a login response obtained elsewhere (e.g. by the login form). */
  setSession: (res: LoginResponse) => Promise<User>;
  register: (payload: RegisterRequest) => Promise<User>;
  logout: () => void;
  handleSessionExpired: (customMessage?: string) => void;
  clearSessionError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Renew the token once 75% of its lifetime has elapsed (only while the tab is open). */
const REFRESH_AT_FRACTION = 0.75;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(() => {
    return typeof window !== "undefined" && !!tokenStorage.get();
  });
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [expiresInSec, setExpiresInSec] = useState<number>(15 * 60);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSession = useCallback((message: string | null) => {
    tokenStorage.clear();
    setToken(null);
    setUser(null);
    setSessionError(message);
  }, []);

  // Restore authenticated session on initial mount without flash of unauthenticated UI
  useEffect(() => {
    let mounted = true;

    async function restoreSession() {
      const savedToken = tokenStorage.get();
      if (!savedToken) {
        if (mounted) setIsInitializing(false);
        return;
      }

      try {
        const profile = await authService.getMe(savedToken);
        if (mounted) {
          setToken(savedToken);
          setUser(profile);
          setSessionError(null);
        }
      } catch (err: unknown) {
        tokenStorage.clear();
        if (mounted) {
          setToken(null);
          setUser(null);
          if (err instanceof ApiError && err.status === 401) {
            setSessionError("Your session has expired. Please sign in again.");
          }
        }
      } finally {
        if (mounted) {
          setIsInitializing(false);
        }
      }
    }

    restoreSession();
    return () => {
      mounted = false;
    };
  }, []);

  // Sliding renewal: keep an active session alive; an expired/revoked one ends cleanly.
  useEffect(() => {
    if (!token) return undefined;
    refreshTimer.current = setTimeout(
      async () => {
        try {
          const res = await authService.refresh(token);
          tokenStorage.set(res.access_token);
          setExpiresInSec(res.expires_in);
          setToken(res.access_token);
        } catch (err) {
          if (err instanceof ApiError && err.status === 401) {
            clearSession("Your session has expired. Please sign in again.");
          }
        }
      },
      Math.max(30, expiresInSec * REFRESH_AT_FRACTION) * 1000
    );
    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, [token, expiresInSec, clearSession]);

  // Any API 401 (from queries or mutations) ends the session.
  useEffect(() => {
    const onExpired = () => clearSession("Your session has expired. Please sign in again.");
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [clearSession]);

  const setSession = useCallback(async (res: LoginResponse): Promise<User> => {
    tokenStorage.set(res.access_token);
    setExpiresInSec(res.expires_in);
    setToken(res.access_token);
    setSessionError(null);
    const fullProfile = await authService.getMe(res.access_token);
    setUser(fullProfile);
    return fullProfile;
  }, []);

  const login = async (credentials: LoginRequest): Promise<User> => {
    setIsLoading(true);
    setSessionError(null);
    try {
      const loginRes = await authService.login(credentials);
      return await setSession(loginRes);
    } catch (err) {
      clearSession(null);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: RegisterRequest): Promise<User> => {
    setIsLoading(true);
    try {
      return await authService.register(payload);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => clearSession(null);

  const handleSessionExpired = (
    customMessage: string = "Your session has expired. Please sign in again."
  ) => clearSession(customMessage);

  const clearSessionError = () => setSessionError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isInitializing,
        sessionError,
        login,
        setSession,
        register,
        logout,
        handleSessionExpired,
        clearSessionError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/** Like useAuth but returns undefined outside an AuthProvider (for shared UI used in tests/previews). */
export function useOptionalAuth(): AuthContextType | undefined {
  return useContext(AuthContext);
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
