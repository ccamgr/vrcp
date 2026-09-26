import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { commands, type AuthUser, type LoginResponse } from "../generated/bindings";

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<LoginResponse>;
  verifyTwoFactor: (
    code: string,
    isEmailOtp: boolean,
  ) => Promise<LoginResponse>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const unwrap = <T,>(result: { status: "ok"; data: T } | { status: "error"; error: string }) => {
  if (result.status === "error") {
    throw new Error(result.error);
  }
  return result.data;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const applyLoginResponse = (response: LoginResponse) => {
    if (response.user) {
      setUser(response.user);
    }
    return response;
  };

  const login = async (username: string, password: string) =>
    applyLoginResponse(unwrap(await commands.login(username, password)));

  const verifyTwoFactor = async (code: string, isEmailOtp: boolean) =>
    applyLoginResponse(unwrap(await commands.verify2fa(code, isEmailOtp)));

  const logout = async () => {
    unwrap(await commands.logout());
    setUser(null);
  };

  useEffect(() => {
    let cancelled = false;

    commands
      .checkAuth()
      .then((result) => {
        if (cancelled || result.status === "error") return;
        setUser(result.data.user);
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, verifyTwoFactor, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
