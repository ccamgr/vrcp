import GenericModal from "@/components/layout/GenericModal";
import GenericScreen from "@/components/layout/GenericScreen";
import { Atag } from "@/components/view/Atag";
import LoadingIndicator from "@/components/view/LoadingIndicator";
import { fontSize, spacing } from "@/configs/styles";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@react-navigation/elements";
import { useTheme } from "@react-navigation/native";
import Constants from "expo-constants";
import { navigate } from "expo-router/build/global-state/routing";
import { useRef, useState } from "react";
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

// login screen
export default function Login() {
  const theme = useTheme();
  const auth = useAuth();
  const usernameRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const TFACodeRef = useRef<TextInput>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [TFACode, setTFACode] = useState("");
  const [modeTFA, setModeTFA] = useState<"totp" | "email">("totp");
  const [openTFA, setOpenTFA] = useState(false);
  const [openLinks, setOpenLinks] = useState(false);

  const handleLogin = async () => {
    if (!username) {
      Alert.alert("Error", "Username is required");
      usernameRef.current?.focus();
      return;
    } else if (!password) {
      Alert.alert("Error", "Password is required");
      passwordRef.current?.focus();
      return;
    }
    ///
    const res = await auth.login({
      username: username,
      password: password,
    });
    if (res === "success") {
      console.log("logged in successfully");
    } else if (res === "tfa-totp") {
      setModeTFA("totp");
      setOpenTFA(true);
    } else if (res === "tfa-email") {
      setModeTFA("email");
      setOpenTFA(true);
    } else {
      Alert.alert("Login failed", "Please check your username and password");
    }
  };

  const handleVerify = async () => {
    if (!/^\d{6}$/.test(TFACode)) {
      Alert.alert("Error", "2FA code must be 6 digits number");
      TFACodeRef.current?.focus();
      return;
    }
    ///
    const res = await auth.verify({
      code: TFACode, // get the code from the input
      mode: modeTFA,
    });
    if (res === "success") {
      setOpenTFA(false);
      console.log("2FA verified successfully");
      const res = await auth.login({
        username: username,
        password: password,
      });
      if (res === "success") {
        console.log("logged in successfully");
      } else {
        Alert.alert("Login failed", "pls contact support");
      }
    } else if (res === "failed") {
      Alert.alert(
        "2FA verification failed",
        "Please check your code and try again"
      );
    } else if (res === "disabled") {
      Alert.alert(
        "2FA is disabled, please check your account settings or contact support"
      );
      setOpenTFA(false);
    } else {
      Alert.alert("2FA verification error", "please try again later");
    }
  };

  const logoAnim = useRef(new Animated.Value(0)).current; //
  const onPressInLogo = () => {
    Animated.timing(logoAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };
  const onPressOutLogo = () => {
    Animated.timing(logoAnim, {
      toValue: 0,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };
  const onLongPressLogo = () => {
    if (Constants.expoConfig?.extra?.vrcmm.buildProfile === "development") {
      navigate("/_sitemap"); // navigate to sitemap on logo press (for debug)
    } else {
      // [ToDO] funny easter egg?
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <GenericScreen>
        {auth.isLoading && <LoadingIndicator absolute />}
        <View style={styles.containerCentered}>
          <Pressable
            style={{
              width: "80%",
              aspectRatio: 1.2,
              marginBottom: spacing.large,
              alignItems: "center",
              justifyContent: "center",
              // borderColor: 'blue', borderWidth: 1, borderStyle: 'solid'
            }}
            onPressIn={onPressInLogo}
            onPressOut={onPressOutLogo}
            onLongPress={onLongPressLogo} // navigate to sitemap on logo press (for debug)
            delayLongPress={1000}
          >
            <Animated.Image
              source={require("@/assets/images/logo.png")}
              style={{
                height: "100%",
                aspectRatio: 1, 
                resizeMode: "cover",
                transform: [
                  {
                    scale: logoAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 0.95],
                    }),
                  },
                ],
              }}
            />
          </Pressable>

          <View style={styles.containerVertical}>
            <Text
              style={[
                styles.header,
                { color: theme.colors.text, marginBottom: spacing.large },
              ]}
            >
              Login with your VRChat account
            </Text>
            <TextInput
              ref={usernameRef}
              style={[styles.input, { color: theme.colors.text }]}
              placeholder="Username / Email"
              placeholderTextColor={theme.colors.subText}
              autoComplete="username"
              textContentType="username"
              value={username}
              onChangeText={setUsername}
              inputMode="email"
            />
            <TextInput
              ref={passwordRef}
              style={[
                styles.input,
                styles.repeatingitemVertical,
                { color: theme.colors.text },
              ]}
              placeholder="Password"
              placeholderTextColor={theme.colors.subText}
              secureTextEntry={true}
              autoComplete="password"
              textContentType="password"
              value={password}
              onChangeText={setPassword}
            />
          </View>
          <View style={styles.containerHorizontal}>
            <Button // button to navigate to sitemap (for debug)
              style={[styles.button]}
              color={theme.colors.primary}
              onPress={() => setOpenLinks(true)}
            >
              {/* [ Sitemap ] */}
              Can't login?
            </Button>
            <Button
              style={[
                styles.button,
                styles.repeatingitemHorizontal,
                { flex: 1 },
              ]}
              color={theme.colors.primary}
              onPress={handleLogin}
              variant="filled"
            >
              Login
            </Button>
          </View>
        </View>

        {/* 2fa modal */}
        <GenericModal
          title="Two-Factor Authentication"
          buttonItems={[
            { title: "Close", onPress: () => setOpenTFA(false)},
            { title: "Verify", onPress: handleVerify, flex: 1 }
          ]}
          open={openTFA}
          onClose={() => setOpenTFA(false)}
        >
          <Text style={[styles.text, { color: theme.colors.text }]}>
            {modeTFA === "totp"
              ? "Enter the code from your authenticator app"
              : "Enter the code sent to your email"}
          </Text>
          <TextInput
            ref={TFACodeRef}
            style={[styles.input, { color: theme.colors.text }]}
            placeholder="Enter code"
            keyboardType="numeric"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            maxLength={6}
            placeholderTextColor={theme.colors.subText}
            value={TFACode}
            onChangeText={setTFACode}
          />
        </GenericModal>

        {/* links to vrchat modal */}
        <GenericModal
          title="is there any problem?"
          buttonItems={[{ title: "Close", onPress: () => setOpenLinks(false), flex: 1 }]}
          open={openLinks}
          onClose={() => setOpenLinks(false)}
        >
          <View
            style={[
              styles.containerVertical,
              { padding: spacing.medium },
            ]}
          >
            <Text
              style={[
                styles.text,
                {
                  color: theme.colors.text,
                  fontSize: fontSize.medium,
                  marginBottom: spacing.small,
                },
              ]}
            >
              New to VRChat?{" "}
              <Atag href="https://vrchat.com/home/register">
                Create an account
              </Atag>{" "}
              !
            </Text>
            <Text
              style={[
                styles.text,
                {
                  color: theme.colors.text,
                  fontSize: fontSize.medium,
                  marginBottom: spacing.small,
                },
              ]}
            >
              Forgot{" "}
              <Atag href="https://vrchat.com/home/password">password</Atag> or{" "}
              <Atag href="https://vrchat.com/home/forgot-email">email</Atag> ?
            </Text>
          </View>

        </GenericModal>
      </GenericScreen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // container styles
  container: {
    padding: spacing.small,
  },
  containerCentered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.small,
  },
  containerVertical: {
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    width: '100%',
    padding: spacing.small,
  },
  containerHorizontal: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width: '100%',
    padding: spacing.small,
  },
  headerContainer: {
    width: '100%',
    padding: spacing.small,
    textAlign: "center",
    // borderColor: 'blue', borderWidth: 1, borderStyle: 'solid',
  },
  //text Styles
  header: {
    fontSize: fontSize.medium,
    fontWeight: "bold",
  },
  text: {
    fontSize: fontSize.medium,
    fontWeight: "normal"
  },
  description: {
    fontSize: fontSize.small,
    fontWeight: "normal"
  },

  // form elements
  input: {
    borderColor: 'gray',
    borderWidth: 1,
    width: '100%',
    padding: spacing.medium,
  },
  button: {
    // padding: spacing.medium,
    borderRadius: 5,
  },


  // repeating items except for the first one
  repeatingitemVertical: {
    marginTop: spacing.small,
  },
  repeatingitemHorizontal: {
    marginLeft: spacing.small,
  },
})