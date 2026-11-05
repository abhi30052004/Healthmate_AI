import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  authService,
  tokenStorage,
  ApiError,
  type LoginRequest,
  type RegisterRequest,
  type User,
} from "../services/authService";

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isInitializing: boolean;
  sessionError: string | null;
  login: (credentials: LoginRequest) => Promise<User>;
  register: (payload: RegisterRequest) => Promise<User>;
  logout: () => void;
  handleSessionExpired: (customMessage?: string) => void;
  clearSessionError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(() => {
    return typeof window !== "undefined" && !!tokenStorage.get();
  });
  const [sessionError, setSessionError] = useState<string | null>(null);

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

  const login = async (credentials: LoginRequest): Promise<User> => {
    setIsLoading(true);
    setSessionError(null);
    try {
      // Step 1: POST /api/auth/login
      const loginRes = await authService.login(credentials);
      const accessToken = loginRes.access_token;

      // Step 2: Store in sessionStorage (per-tab safe persistence)
      tokenStorage.set(accessToken);
      setToken(accessToken);

      // Step 3: GET /api/auth/me to retrieve full authenticated profile
      const fullProfile = await authService.getMe(accessToken);
      setUser(fullProfile);

      return fullProfile;
    } catch (err) {
      tokenStorage.clear();
      setToken(null);
      setUser(null);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: RegisterRequest): Promise<User> => {
    setIsLoading(true);
    try {
      const newUser = await authService.register(payload);
      return newUser;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    tokenStorage.clear();
    setToken(null);
    setUser(null);
    setSessionError(null);
  };

  const handleSessionExpired = (
    customMessage: string = "Your session has expired. Please sign in again."
  ) => {
    tokenStorage.clear();
    setToken(null);
    setUser(null);
    setSessionError(customMessage);
  };

  const clearSessionError = () => {
    setSessionError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isInitializing,
        sessionError,
        login,
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

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
