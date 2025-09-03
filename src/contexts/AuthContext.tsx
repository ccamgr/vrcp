import { AuthenticationApi } from "@/api/vrchat";
import { extractErrMsg } from "@/lib/extractErrMsg";
import { router } from "expo-router";
import Storage from 'expo-sqlite/kv-store';
import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import useVRChat from "./VRChatContext";

type AuthUser = {
  id?: string;
  icon?: string;
  displayName?: string;
}


interface LoginParam {
  username: string; // email or username
  password: string; // password
}
interface VerifyParam {
  code: string;
  mode: "totp" | "email";
}

type LoginRes = "success" | "tfa-totp" | "tfa-email" | "error";
type VerifyRes = "success" | "failed" | "disabled" | "error";

interface AuthContextType {
  user: AuthUser | undefined;
  login: (param: LoginParam)=>Promise<LoginRes>;
  logout: ()=>void;
  verify: (param: VerifyParam)=>Promise<VerifyRes>;
}

const Context = createContext<AuthContextType | undefined>(undefined)

const useAuth = () => {
  const context = useContext(Context)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

const AuthProvider: React.FC<{ children?: ReactNode }> = ({children}) => {
  const vrc = useVRChat();
  const [user, setUser] = useState<AuthUser | undefined>(undefined)

  const login = async (param: LoginParam): Promise<LoginRes> => {
    const conf = vrc.configure({
      username: param.username,
      password: param.password
    });
    const api = new AuthenticationApi(conf) // because of too slow of setState, use returned value
    try {
      await api.logout() // 前のセッションがライブラリに残ってる場合があるので、ログアウトしてからログインする
    } catch (e) {
      console.log("already logged out")
    }
    try {
      const res = await api.getCurrentUser();
      const requiredTFA = Object(res.data).hasOwnProperty("requiresTwoFactorAuth");
      if (requiredTFA) {
        // two factor auth
        const allowedTFA = Object(res.data).requiresTwoFactorAuth as string[];
        if (allowedTFA.includes("totp") || allowedTFA.includes("otp")) {
          return "tfa-totp"; // return for TOTP 2FA
        } else if (allowedTFA.includes("emailOtp")) {
          return "tfa-email"; // return for Email 2FA
        } else {
          return "error"; // no supported 2FA method
        }
      } else if (res.data.id) {
        // save user data to storage
        Storage.setItem("auth_user_id", res.data.id);
        Storage.setItem("auth_user_displayName", res.data.displayName);
        Storage.setItem("auth_user_icon", res.data.userIcon);

        // [ToDo] use SecureStore of expo
        if (res.headers?.["set-cookie"]?.[0]) {
          Storage.setItem("auth_authCookie", res.headers?.["set-cookie"]?.[0]); 
        }

        setUser({
          id: res.data.id,
          displayName: res.data.displayName,
          icon: res.data.userIcon,
        })
        console.log(`login as ${res.data.displayName}: ${res.data.id}`)
        router.replace("/maintab/home"); // navigate to tabs if user is logged in

        return "success";
      } else {
        return "error";
      }
    } catch (e) {
      console.error("Login failed", extractErrMsg(e));
      return "error";
    }
  }

  const verify = async ({code, mode}: VerifyParam): Promise<VerifyRes> => {
    const api = new AuthenticationApi(vrc.config);
    try {
      if (mode == "totp") {
        const res = await api.verify2FA({code});
        if (res.data.verified) {
          return "success";
        } else if (!res.data.enabled) {
          return "disabled"; // TFA is disabled
        } else {
          return "failed";
        }
      } else if (mode == "email") {
        const res = await api.verify2FA({code});
        if (res.data.verified) {
          if (res.headers?.["set-cookie"]?.[0]) {
            Storage.setItem("auth_2faCookie", res.headers?.["set-cookie"]?.[0]); 
          }
          return "success";
        } else if (!res.data.enabled) {
          return "disabled"; // TFA is disabled
        } else {
          return "failed";
        }
      }
      return "error";
    } catch (e) {
      console.error(e);
      return "error";
    }
  };

  const logout = async () => {
    try {
      await vrc.authenticationApi.logout()
    } catch (e) {
      console.error("Logout failed", e);
    }
    // logout logic
    Storage.removeItem("auth_user_id")
    Storage.removeItem("auth_user_displayName")
    Storage.removeItem("auth_user_icon")

    // [ToDo] use SecureStore of expo
    Storage.removeItem("auth_authCookie")
    Storage.removeItem("auth_2faCookie") 
    setUser(undefined)
    router.replace("/"); // navigate to index after logout
  }


  useEffect(() => {
    const fetchData = async () => {
      const conf = vrc.configure({}); // configure VRChat client with past data
      const api = new AuthenticationApi(conf); // because of too slow of setState, use returned value
      const storedData = await Promise.all([
        Storage.getItem("auth_user_id"),
        Storage.getItem("auth_user_displayName"),
        Storage.getItem("auth_user_icon"),
      ]);
      const storedUser = {
        id: storedData[0] || undefined,
        displayName: storedData[1] || undefined,
        icon: storedData[2] || undefined,
      };
      if (storedUser.id) {  
        const verified = (await api.verifyAuthToken()).data.ok
        if (verified) {
          setUser(storedUser); 
          console.log(`login as ${storedUser.displayName}: ${storedUser.id}`)
          router.replace("/maintab/home"); // navigate to tabs if user is logged in
          return;
        } else {
          console.log("token expired.");
        }
      }
      api.logout()
      setUser(undefined); // clear user data if not logged in
      // router.replace("/"); // navigate to login if user is not logged in
    };
    
    fetchData()
  }, [])

  return (
    <Context.Provider value={{user, login, logout, verify}}>
      {children}
    </Context.Provider>
  )
} 



export default useAuth
export { AuthProvider };

