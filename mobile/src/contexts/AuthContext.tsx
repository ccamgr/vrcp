import { extractErrMsg } from "@/libs/utils";
import { AuthenticationApi } from "@/generated/api";
import { router } from "expo-router";
import Storage from "expo-sqlite/kv-store";
import * as SecureStore from "expo-secure-store";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useVRChat } from "./VRChatContext";
import { routeToHome, routeToIndex } from "@/libs/route";

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

interface AuthContextType {
  user: AuthUser | undefined;
  isLoading: boolean;
  login: (param: LoginParam) => Promise<LoginRes>;
  logout: () => void;
  verify: (param: VerifyParam) => Promise<VerifyRes>;
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
  const [ isLoading, setIsLoading ] = useState<boolean>(true);

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
      const requiredTFA = Object(res.data).hasOwnProperty(
        "requiresTwoFactorAuth"
      );
      if (requiredTFA) {
        // two factor auth
        const allowedTFA = Object(res.data).requiresTwoFactorAuth as string[];
        if (allowedTFA.includes("totp") || allowedTFA.includes("otp")) {
          setIsLoading(false);
          return "tfa-totp"; // return for TOTP 2FA
        } else if (allowedTFA.includes("emailOtp")) {
          setIsLoading(false);
          return "tfa-email"; // return for Email 2FA
        } else {
          setIsLoading(false);
          return "error"; // no supported 2FA method
        }
      } else if (res.data.id) {
        console.log("Login successful");
        // save user data to storage
        Storage.setItem("auth_user_id", res.data.id);
        Storage.setItem("auth_user_displayName", res.data.displayName);
        Storage.setItem("auth_user_icon", res.data.userIcon);

        if (param.saveSecret) {
          SecureStore.setItemAsync("auth_secret_username", param.username);
          SecureStore.setItemAsync("auth_secret_password", param.password );
        } else {
          SecureStore.deleteItemAsync("auth_secret_username");
          SecureStore.deleteItemAsync("auth_secret_password");
        }

        const authCookie = extractAuthCookie(res.headers?.["set-cookie"]?.[0]);
        const tfaCookie = extract2faCookie(res.headers?.["set-cookie"]?.[0]);
        if (authCookie) SecureStore.setItemAsync("auth_authCookie", authCookie);
        if (tfaCookie) SecureStore.setItemAsync("auth_2faCookie", tfaCookie);

        if (authCookie) {
          vrc.configurePipeline(authCookie); // set auth cookie to pipeline
        }

        setUser({
          id: res.data.id,
          displayName: res.data.displayName,
          icon: res.data.userIcon,
        });
        console.log(`login as ${res.data.displayName}: ${res.data.id}`);
        routeToHome(); // navigate to tabs if user is logged in

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
            // [ToDo] use SecureStore of expo
            Storage.setItem("auth_2faCookie", tfaCookie);
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
      await vrc.authenticationApi.logout();
    } catch (e) {
      console.error("Logout failed", e);
    }
    vrc.unConfigure();
    // logout logic
    Storage.removeItem("auth_user_id");
    Storage.removeItem("auth_user_displayName");
    Storage.removeItem("auth_user_icon");

    // [ToDo] use SecureStore of expo
    SecureStore.deleteItemAsync("auth_authCookie");
    SecureStore.deleteItemAsync("auth_2faCookie");
    setUser(undefined);
    setIsLoading(false);
    routeToIndex(); // navigate to index after logout
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const secret = await Promise.all([
          SecureStore.getItemAsync("auth_secret_username"),
          SecureStore.getItemAsync("auth_secret_password"),
        ]);
        const conf = vrc.configureAPI({
          username: secret[0] || undefined,
          password: secret[1] || undefined,
        }); // configure VRChat client with past data
        const api = new AuthenticationApi(conf); // because of too slow of setState, use returned value
        const storedData = await Promise.all([
          Storage.getItem("auth_user_id"),
          Storage.getItem("auth_user_displayName"),
          Storage.getItem("auth_user_icon"),

          SecureStore.getItemAsync("auth_authCookie"),
          SecureStore.getItemAsync("auth_2faCookie"),
        ]);
        const storedUser = {
          id: storedData[0] || undefined,
          displayName: storedData[1] || undefined,
          icon: storedData[2] || undefined,
        };
        if (storedUser.id) {
          const verified = (await api.verifyAuthToken()).data.ok;

          if (verified) {
            const authCookie = storedData[3];
            if (authCookie) {
              vrc.configurePipeline(authCookie); // set auth cookie to pipeline
            }
            setUser(storedUser);
            console.log(`login as ${storedUser.displayName}: ${storedUser.id}`);
            routeToHome(); // navigate to tabs if user is logged in
            setIsLoading(false);
            return;
          } else {
            console.log("token expired.");
          }
        }
        api.logout();
        setUser(undefined); // clear user data if not logged in
        setIsLoading(false);
      } catch (e) {
        console.log("Error loading auth data:", extractErrMsg(e));
        setUser(undefined);
        setIsLoading(false);
      }
    };

    fetchData()
  }, []);

  return (
    <Context.Provider value={{ user, login, logout, verify, isLoading }}>
      {children}
    </Context.Provider>
  );
};

// なんかフォーマットが変になるので、関数化しておく
const extractAuthCookie = (string: string | undefined): string | undefined => {
  const match = string?.match(/auth=([^;]+);/);
  return match ? match[1] : undefined;
};
const extract2faCookie = (string: string | undefined): string | undefined => {
  const match = string?.match(/twoFactorAuth=([^;]+);/);
  return match ? match[1] : undefined;
};

export { AuthProvider, useAuth };
