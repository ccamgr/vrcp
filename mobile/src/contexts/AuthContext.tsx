import { extractErrMsg } from "@/lib/utils";
import { AuthenticationApi } from "@/generated/vrcapi";
import * as SecureStore from "expo-secure-store";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { useVRChat } from "./VRChatContext";
import StorageWrapper from "@/lib/wrappers/storageWrapper";
import axios from "axios";
import {
  clearAccountQueries,
  queryClient,
  TANSTACK_STORAGE_KEY,
} from "@/lib/queryClient";
import { isCurrentAccount, isRequiresTwoFactorAuth } from "@/lib/vrcapiModels";
import { usersRepo } from "@/db/repogitories";

type AuthUser = {
  id?: string;
  icon?: string;
  displayName?: string;
};

interface LoginParam {
  username: string; // email or username
  password: string; // password
  saveSecret?: boolean; // save secret for 2FA
}
interface VerifyParam {
  code: string;
  mode: "totp" | "email";
}

type LoginRes = "success" | "tfa-totp" | "tfa-email" | "error";
type VerifyRes = "success" | "failed" | "disabled" | "error";
type TfaMode = "totp" | "email";

interface AuthContextType {
  user: AuthUser | undefined;
  isLoading: boolean;
  pendingTFA: TfaMode | undefined;
  cancelPendingTFA: () => void;
  login: (param: LoginParam) => Promise<LoginRes>;
  logout: () => Promise<void>;
  verify: (param: VerifyParam) => Promise<VerifyRes>;
  autoLogin: () => Promise<void>;
}

const Context = createContext<AuthContextType | undefined>(undefined);

const useAuth = () => {
  const context = useContext(Context);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};

const AuthProvider: React.FC<{ children?: ReactNode }> = ({ children }) => {
  const vrc = useVRChat();
  const [user, setUser] = useState<AuthUser | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [pendingTFA, setPendingTFA] = useState<TfaMode | undefined>(undefined);

  const clearAccountCache = async () => {
    await Promise.all([
      clearAccountQueries(),
      queryClient.cancelQueries({ queryKey: ["vrc", "state"] }),
      queryClient.cancelQueries({ queryKey: ["vrc", "db", "user"] }),
    ]);
    queryClient.removeQueries({ queryKey: ["vrc", "state"] });
    queryClient.removeQueries({ queryKey: ["vrc", "db", "user"] });
    await Promise.all([
      StorageWrapper.removeItemAsync(TANSTACK_STORAGE_KEY),
      usersRepo.clearAll(),
    ]);
  };

  const clearStoredAuthentication = async () => {
    const results = await Promise.allSettled([
      StorageWrapper.removeItemAsync("auth_user_id"),
      StorageWrapper.removeItemAsync("auth_user_displayName"),
      StorageWrapper.removeItemAsync("auth_user_icon"),
      SecureStore.deleteItemAsync("auth_authCookie"),
      SecureStore.deleteItemAsync("auth_2faCookie"),
      SecureStore.deleteItemAsync("auth_secret_username"),
      SecureStore.deleteItemAsync("auth_secret_password"),
    ]);
    const failures = results.filter((result) => result.status === "rejected");
    if (failures.length > 0) {
      console.error("Failed to clear some local authentication data", failures);
    }
    setPendingTFA(undefined);
  };

  const cancelPendingTFA = () => {
    setPendingTFA(undefined);
  };

  const login = async (param: LoginParam): Promise<LoginRes> => {
    setIsLoading(true);
    const conf = vrc.configureAPI({
      username: param.username,
      password: param.password,
    });
    const api = new AuthenticationApi(conf); // because of too slow of setState, use returned value
    try {
      await api.logout(); // 前のセッションがライブラリに残ってる場合があるので、ログアウトしてからログインする
    } catch (e) {
      console.log("already logged out");
    }
    try {
      const res = await api.getCurrentUser();
      if (isRequiresTwoFactorAuth(res.data)) {
        const allowedTFA = res.data.requiresTwoFactorAuth;
        if (allowedTFA.includes("totp") || allowedTFA.includes("otp")) {
          setPendingTFA("totp");
          setIsLoading(false);
          return "tfa-totp";
        }
        if (allowedTFA.includes("emailOtp")) {
          setPendingTFA("email");
          setIsLoading(false);
          return "tfa-email";
        }
        setIsLoading(false);
        return "error";
      }

      if (isCurrentAccount(res.data)) {
        const currentAccount = res.data;
        console.log("Login successful");
        const authCookie = extractAuthCookie(res.headers?.["set-cookie"]?.[0]);
        const tfaCookie = extract2faCookie(res.headers?.["set-cookie"]?.[0]);

        try {
          await clearAccountCache();
          await StorageWrapper.multiSet([
            ["auth_user_id", currentAccount.id],
            ["auth_user_displayName", currentAccount.displayName ?? ""],
            ["auth_user_icon", currentAccount.iconUrl ?? ""],
          ]);

          if (param.saveSecret) {
            await Promise.all([
              SecureStore.setItemAsync("auth_secret_username", param.username),
              SecureStore.setItemAsync("auth_secret_password", param.password),
            ]);
          } else {
            await Promise.all([
              SecureStore.deleteItemAsync("auth_secret_username"),
              SecureStore.deleteItemAsync("auth_secret_password"),
            ]);
          }

          await Promise.all([
            authCookie
              ? SecureStore.setItemAsync("auth_authCookie", authCookie)
              : Promise.resolve(),
            tfaCookie
              ? SecureStore.setItemAsync("auth_2faCookie", tfaCookie)
              : Promise.resolve(),
          ]);
        } catch (error) {
          console.error(
            "Failed to persist authentication data",
            extractErrMsg(error),
          );
          vrc.unConfigure();
          setUser(undefined);
          setIsLoading(false);
          return "error";
        }

        if (authCookie) {
          vrc.configurePipeline(authCookie); // set auth cookie to pipeline
        }

        setUser({
          id: currentAccount.id,
          displayName: currentAccount.displayName ?? "",
          icon: currentAccount.iconUrl ?? "",
        });
        setPendingTFA(undefined);
        console.log(
          `login as ${currentAccount.displayName}: ${currentAccount.id}`,
        );

        setIsLoading(false);
        return "success";
      } else {
        setIsLoading(false);
        return "error";
      }
    } catch (e) {
      console.log("Login failed", extractErrMsg(e));
      setIsLoading(false);
      return "error";
    }
  };

  const verify = async ({ code, mode }: VerifyParam): Promise<VerifyRes> => {
    const api = new AuthenticationApi(vrc.config);
    setIsLoading(true);
    try {
      if (mode == "totp") {
        const res = await api.verify2FA({ twoFactorAuthCode: { code } });
        if (res.data.verified) {
          setIsLoading(false);
          return "success";
        } else if (!res.data.enabled) {
          setIsLoading(false);
          return "disabled"; // TFA is disabled
        } else {
          setIsLoading(false);
          return "failed";
        }
      } else if (mode == "email") {
        const res = await api.verify2FA({ twoFactorAuthCode: { code } });
        if (res.data.verified) {
          const tfaCookie = extract2faCookie(res.headers?.["set-cookie"]?.[0]);
          if (tfaCookie) {
            SecureStore.setItemAsync("auth_2faCookie", tfaCookie);
          }
          setIsLoading(false);
          return "success";
        } else if (!res.data.enabled) {
          setIsLoading(false);
          return "disabled"; // TFA is disabled
        } else {
          setIsLoading(false);
          return "failed";
        }
      }
      setIsLoading(false);
      return "error";
    } catch (e) {
      console.log("2FA verification failed", extractErrMsg(e));
      setIsLoading(false);
      return "error";
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      try {
        await vrc.authenticationApi.logout();
      } catch (error) {
        console.error("Logout request failed", error);
      }
      vrc.unConfigure();
      try {
        await clearAccountCache();
      } catch (error) {
        console.error("Failed to clear account cache", error);
      }
      await clearStoredAuthentication();
      console.log("Logged out successfully");
    } catch (error) {
      console.error("Failed to clear local authentication data", error);
    } finally {
      setUser(undefined);
      setIsLoading(false);
    }
  };

  const autoLogin = async () => {
    setIsLoading(true);
    try {
      const secret = await Promise.all([
        SecureStore.getItemAsync("auth_secret_username"),
        SecureStore.getItemAsync("auth_secret_password"),
      ]);
      if (!secret[0] || !secret[1]) {
        console.log("No secret found for auto login");
        setIsLoading(false);
        return;
      }
      const conf = vrc.configureAPI({
        username: secret[0] || undefined,
        password: secret[1] || undefined,
      }); // configure VRChat client with past data
      const api = new AuthenticationApi(conf); // because of too slow of setState, use returned value
      const storedData = await Promise.all([
        StorageWrapper.getItemAsync("auth_user_id"),
        StorageWrapper.getItemAsync("auth_user_displayName"),
        StorageWrapper.getItemAsync("auth_user_icon"),

        SecureStore.getItemAsync("auth_authCookie"),
        SecureStore.getItemAsync("auth_2faCookie"),
      ]);
      const storedUser = {
        id: storedData[0] || undefined,
        displayName: storedData[1] || undefined,
        icon: storedData[2] || undefined,
      };
      if (storedUser.id) {
        let verified = false;
        try {
          verified = (await api.verifyAuthToken()).data.ok;
        } catch (e: unknown) {
          if (axios.isAxiosError(e) && !e.response) {
            console.log("Network error while verifying the auth token.");
            setUser(undefined);
            setIsLoading(false);
            return;
          }
          console.log("Token verification failed, will attempt re-login...");
        }

        if (verified) {
          const currentUserRes = await api.getCurrentUser();
          if (isRequiresTwoFactorAuth(currentUserRes.data)) {
            const mode = currentUserRes.data.requiresTwoFactorAuth.includes(
              "emailOtp",
            )
              ? "email"
              : "totp";
            setPendingTFA(mode);
            setUser(undefined);
            setIsLoading(false);
            return;
          }
          if (!isCurrentAccount(currentUserRes.data)) {
            await clearAccountCache();
            await clearStoredAuthentication();
            setUser(undefined);
            setIsLoading(false);
            return;
          }

          const currentAccount = currentUserRes.data;
          if (storedUser.id !== currentAccount.id) {
            await clearAccountCache();
          }
          await StorageWrapper.multiSet([
            ["auth_user_id", currentAccount.id],
            ["auth_user_displayName", currentAccount.displayName ?? ""],
            ["auth_user_icon", currentAccount.iconUrl ?? ""],
          ]);
          const authCookie = storedData[3];
          if (authCookie) {
            vrc.configurePipeline(authCookie); // set auth cookie to pipeline
          }
          setUser({
            id: currentAccount.id,
            displayName: currentAccount.displayName ?? "",
            icon: currentAccount.iconUrl ?? "",
          });
          console.log(
            `logged in as ${currentAccount.displayName}: ${currentAccount.id}`,
          );
          setIsLoading(false);
          return;
        } else {
          console.log("token expired or invalid, attempting re-login.");
          if (secret[0] && secret[1]) {
            const loginRes = await login({
              username: secret[0],
              password: secret[1],
              saveSecret: true,
            });
            if (loginRes === "success") {
              console.log("Re-login successful.");
              return; // login() handles state update
            }
            console.log(
              "Re-login required user interaction or failed:",
              loginRes,
            );
            if (loginRes === "error") {
              await clearAccountCache();
              await clearStoredAuthentication();
            }
          }
        }
      }
      // api.logout(); // clear session in library just in case
      setUser(undefined); // clear user data if not logged in
      setIsLoading(false);
    } catch (e) {
      console.log("Error loading auth data:", extractErrMsg(e));
      if (axios.isAxiosError(e) && !e.response) {
        console.log(
          "Network error at top level, assuming user is logged in if we have stored user.",
        );
      } else {
        setUser(undefined);
      }
      setIsLoading(false);
    }
  };

  useEffect(() => {
    autoLogin();
  }, []);

  return (
    <Context.Provider
      value={{
        user,
        login,
        logout,
        verify,
        autoLogin,
        isLoading,
        pendingTFA,
        cancelPendingTFA,
      }}
    >
      {children}
    </Context.Provider>
  );
};

// なんかフォーマットが変になるので、関数化しておく
const extractAuthCookie = (string: string | undefined): string | undefined => {
  const match = string?.match(/auth=([^;]+)/);
  return match ? match[1] : undefined;
};
const extract2faCookie = (string: string | undefined): string | undefined => {
  const match = string?.match(/twoFactorAuth=([^;]+)/);
  return match ? match[1] : undefined;
};

export { AuthProvider, useAuth };
