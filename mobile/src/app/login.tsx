import GenericModal from "@/components/layout/GenericModal";
import GenericScreen from "@/components/layout/GenericScreen";
import { Atag } from "@/components/view/Atag";
import LoadingIndicator from "@/components/view/LoadingIndicator";
import { fontSize, navigationBarHeight, spacing } from "@/configs/styles";
import { useAuth } from "@/contexts/AuthContext";
import { MiscellaneousApi } from "@/vrchat/api";
import { useTheme } from "@react-navigation/native";
import { useRef, useState } from "react";
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Clipboard from 'expo-clipboard';
import { useToast } from "@/contexts/ToastContext";
import { useTranslation } from "react-i18next";
import { ButtonEx } from "@/components/CustomElements";
import IconButton from "@/components/view/icon-components/IconButton";
import { constants } from "@/configs/const";

// login screen
export default function Login() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const auth = useAuth();
  const usernameRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const TFACodeRef = useRef<TextInput>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saveSecret, setSaveSecret] = useState(false);
  const [TFACode, setTFACode] = useState("");
  const [modeTFA, setModeTFA] = useState<"totp" | "email">("totp");
  const [openTFA, setOpenTFA] = useState(false);
  const [openLinks, setOpenLinks] = useState(false);


  const handleLogin = async () => {
    if (!username) {
      Alert.alert("Error", t("pages.login.username_empty_error"));
      usernameRef.current?.focus();
      return;
    } else if (!password) {
      Alert.alert("Error", t("pages.login.password_empty_error"));
      passwordRef.current?.focus();
      return;
    }
    ///
    const res = await auth.login({
      username: username,
      password: password,
      saveSecret: saveSecret,
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
      Alert.alert("Login failed", t("pages.login.login_failed_error"));
    }
  };

  const handleVerify = async () => {
    if (!/^\d{6}$/.test(TFACode)) {
      Alert.alert("Error", t("pages.login.tfa_invalid_error"));
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
        Alert.alert("Login failed", t("pages.login.login_failed_error"));
      }
    } else if (res === "failed") {
      Alert.alert(
        "2FA verification failed",
        t("pages.login.tfa_failed_error")
      );
    } else if (res === "disabled") {
      Alert.alert(
        t("pages.login.tfa_disabled_error")
      );
      setOpenTFA(false);
    } else {
      Alert.alert("2FA verification error", "please try again later");
    }
  };

  const handleAutoFillTFA = async () => {
    try {
      const code = await Clipboard.getStringAsync();
      if (/^\d{6}$/.test(code)) {
        setTFACode(code);
        showToast("info", t("pages.login.tfa_pasted"));
      }
    } catch (err) {
      console.log("Auto-fill TFA code failed:", err);
    };
  };

  const logoAnim = useRef(new Animated.Value(0)).current; //
  const [ logoMsg, setLogoMsg ] = useState<string | null>(null);
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
    new MiscellaneousApi().getCurrentOnlineUsers()
      .then((res) => {
        const msg = t("pages.login.online_count_message", { count: res.data });
        setLogoMsg(msg);
        setTimeout(() => setLogoMsg(null), 5000);
      })
      .catch((err) => {
        console.log("Failed to get online users:", err);
      });

  };

  return (

      <GenericScreen>
        {auth.isLoading && <LoadingIndicator absolute />}
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <View style={styles.containerCentered}>
          <Pressable
            style={{
              width: "80%",
              maxHeight: "70%",
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
                resizeMode: "center",
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
                { color: theme.colors.text, marginBottom: spacing.large},
              ]}
            >
              {t("pages.login.welcome")}
            </Text>
            <TextInput
              ref={usernameRef}
              style={[styles.input, { color: theme.colors.text }]}
              placeholder={t("pages.login.username_placeholder")}
              placeholderTextColor={theme.colors.subText}
              autoComplete="username"
              textContentType="username"
              value={username}
              onChangeText={setUsername}
              inputMode="email"
            />
            <View style={[styles.passwordContainer, styles.repeatingitemVertical]}>
              <TextInput
                ref={passwordRef}
                style={[styles.passwordInput, { color: theme.colors.text }]}
                placeholder={t("pages.login.password_placeholder")}
                placeholderTextColor={theme.colors.subText}
                secureTextEntry={!showPassword}
                autoComplete="password"
                textContentType="password"
                value={password}
                onChangeText={setPassword}
              />
              <IconButton
                name={showPassword ? "eye" : "eye-off"}
                size={24}
                color={theme.colors.subText}
                style={{ marginRight: spacing.small }}
                onPress={() => setShowPassword((prev) => !prev)}
              />
            </View>
            <View style={[styles.containerHorizontal, styles.repeatingitemVertical]}>
              <Switch
                value={saveSecret}
                onValueChange={setSaveSecret}
              />
              <Text style={[styles.description, { color: theme.colors.text }]}>
                {t("pages.login.save_credentials")}
              </Text>
            </View>
          </View>
          <View style={styles.containerHorizontal}>
            <ButtonEx // button to navigate to sitemap (for debug)
              style={[styles.button]}
              color={theme.colors.primary}
              onPress={() => setOpenLinks(true)}
            >
              {t("pages.login.button_links")}
            </ButtonEx>
            <ButtonEx
              style={[
                styles.button,
                styles.repeatingitemHorizontal,
                { flex: 1 },
              ]}
              color={theme.colors.primary}
              onPress={handleLogin}
              variant="filled"
            >
              {t("pages.login.button_login")}
            </ButtonEx>
          </View>
        </View>
        </KeyboardAvoidingView>

        <View style={styles.disclaimerContainer}>
          <Text style={{color: theme.colors.subText, fontSize: fontSize.small, textAlign: "center" }}>
            {t("pages.login.disclaimer")}
          </Text>
        </View>

        {/* 2fa modal */}
        <GenericModal
          title="Two-Factor Authentication"
          buttonItems={[
            { title: t("pages.login.button_tfa_close"), onPress: () => setOpenTFA(false)},
            { title: t("pages.login.button_tfa_verify"), onPress: handleVerify, flex: 1 }
          ]}
          open={openTFA}
          onClose={() => setOpenTFA(false)}
        >
          <Text style={[styles.text, { color: theme.colors.text }]}>
            {modeTFA === "totp"
              ? t("pages.login.tfa_modal_text_totp")
              : t("pages.login.tfa_modal_text_email")
            }
          </Text>
          <TextInput
            ref={TFACodeRef}
            style={[styles.input, { color: theme.colors.text }]}
            placeholder={t("pages.login.tfaCode_placeholder")}
            keyboardType="numeric"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            maxLength={6}
            placeholderTextColor={theme.colors.subText}
            value={TFACode}
            onChangeText={setTFACode}
            onFocus={handleAutoFillTFA}
          />
        </GenericModal>

        {/* links to vrchat modal */}
        <GenericModal
          title={t("pages.login.linksModal_title")}
          buttonItems={[{ title: t("pages.login.button_links_close"), onPress: () => setOpenLinks(false), flex: 1 }]}
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
              {t("pages.login.linksModal_text1")}
              <Atag href={constants.externalLinks.vrc_register}>
                {t("pages.login.linksModal_registerLinkText")}
              </Atag>
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
              {t("pages.login.linksModal_text2")}
              <Atag href={constants.externalLinks.vrc_forgot_password}>{t("pages.login.linksModal_passwordLinkText")}</Atag>
              {" / "}
              <Atag href={constants.externalLinks.vrc_forgot_email}>{t("pages.login.linksModal_emailLinkText")}</Atag>
            </Text>
          </View>

        </GenericModal>
      </GenericScreen>
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
    justifyContent: "flex-start",
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
    textAlign: "center",
  },
  text: {
    fontSize: fontSize.medium,
    fontWeight: "normal",
    textAlign: "center",
  },
  description: {
    marginLeft: spacing.medium,
    fontSize: fontSize.small,
    fontWeight: "normal"
  },
  disclaimerContainer: {
    position: "absolute",
    bottom: navigationBarHeight,
    left: spacing.small,
    right: spacing.small,
  },

  // form elements
  input: {
    borderColor: 'gray',
    borderWidth: 1,
    width: '100%',
    padding: spacing.medium,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderColor: 'gray',
    borderWidth: 1,
  },
  passwordInput: {
    flex: 1,
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
