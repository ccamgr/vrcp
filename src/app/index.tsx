import GenericModal from "@/components/layout/GenericModal";
import GenericScreen from "@/components/layout/GenericScreen";
import LoadingIndicator from "@/components/view/LoadingIndicator";
import globalStyles, { spacing } from "@/config/styles";
import texts from "@/config/texts";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@react-navigation/elements";
import { useTheme } from "@react-navigation/native";
import { navigate } from "expo-router/build/global-state/routing";
import { useRef, useState } from "react";
import { Alert, Image, KeyboardAvoidingView, Linking, Text, TextInput, View } from "react-native";


// login screen
export default function Login() {
  const theme = useTheme();
  const auth = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [TFACode, setTFACode] = useState("");

  const [openTFA, setOpenTFA] = useState(false);
  const [modeTFA, setModeTFA] = useState<"totp"|"email">("totp");

  const [isLoadingLogin, setIsLoadingLogin] = useState(false);
  const [isLoadingVerify, setIsLoadingVerify] = useState(false);

  const usernameRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const TFACodeRef = useRef<TextInput>(null);

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
    setIsLoadingLogin(true);
    const res = await auth.login({
      username: username,
      password: password
    });
    if (res === "success") {
      console.log("logged in successfully")
    } else if (res === "tfa-totp") {
      setModeTFA("totp");
      setOpenTFA(true);
    } else if (res === "tfa-email") {
      setModeTFA("email");
      setOpenTFA(true);
    } else {
      Alert.alert("Login failed", "Please check your username and password");
    }
    setIsLoadingLogin(false);
  };

  const handleVerify = async () => {
    if (!/^\d{6}$/.test(TFACode)) {
      Alert.alert("Error", "2FA code must be 6 digits number");
      TFACodeRef.current?.focus();
      return;
    }
    ///
    setIsLoadingVerify(true);
    const res = await auth.verify({
      code: TFACode, // get the code from the input
      mode: modeTFA
    });
    if (res === "success") {
      setOpenTFA(false);
      console.log("2FA verified successfully");
      const res = await auth.login({
        username: username,
        password: password
      });
      if (res === "success") {
        console.log("logged in successfully")
      } else {
        Alert.alert("Login failed", "pls contact support");
      }
    } else if (res === "failed") {
      Alert.alert("2FA verification failed", "Please check your code and try again");
    } else if (res === "disabled") {
      Alert.alert("2FA is disabled, please check your account settings or contact support");
      setOpenTFA(false);
    } else {
      Alert.alert("2FA verification error", "please try again later");
    }
    setIsLoadingVerify(false);
  }

  return (
    <KeyboardAvoidingView style={{flex:1}} behavior="padding">
      <GenericScreen>
        { (isLoadingLogin || isLoadingVerify) && <LoadingIndicator absolute/> }
        <View style={globalStyles.containerCentered}>
          
          <View style={{
            width: "100%", 
            aspectRatio: 1.3,
            padding: spacing.large,
            marginBottom: spacing.large,
            alignItems: 'center',
            justifyContent: 'center',
            // borderColor: 'blue', borderWidth: 1, borderStyle: 'solid'
          }}>
            <Image 
              source={require('@/assets/images/logo.png')} 
              style={{aspectRatio: 1, resizeMode: 'center' }} 
            />
          </View>

          <Text style={[globalStyles.text,{color: theme.colors.text}]}>{texts.welcome}</Text>
          <View style={globalStyles.containerVertical}>
            <TextInput
              ref={usernameRef}
              style={[globalStyles.input, {color: theme.colors.text}]}
              placeholder="Username / Email"
              placeholderTextColor={theme.colors.subText}
              autoComplete="username"
              value={username}
              onChangeText={setUsername}
            />
            <TextInput
              ref={passwordRef}
              style={[globalStyles.input, globalStyles.repeatingitemVertical, {color: theme.colors.text}]}
              placeholder="Password"
              placeholderTextColor={theme.colors.subText}
              secureTextEntry={true}
              autoComplete="password"
              value={password}
              onChangeText={setPassword}
            />
          </View>
          <View style={globalStyles.containerHorizontal}>
            <Button  // button to navigate to sitemap (for debug)
              style={[globalStyles.button]}
              color={theme.colors.primary}
              onPress={() => Linking.openURL("https://vrchat.com/home/register")}
            > 
              Create Account
            </Button>
            <Button
              style={[globalStyles.button, globalStyles.repeatingitemHorizontal, {flex:1}]}
              color={theme.colors.primary}
              onPress={handleLogin}
              variant="filled"
            > 
              Login 
            </Button>
          </View>

          <Button  // button to navigate to sitemap (for debug)
            style={[globalStyles.button, {transform: [{ translateY: 200 }]}]}
            color={theme.colors.primary}
            onPress={() => navigate("/_sitemap")}
          > 
            [ SiteMap ]
          </Button>
        </View>

        {/* 2fa modal */}
        <GenericModal open={openTFA} onClose={() => setOpenTFA(false)}>
          <Text style={[globalStyles.subheader, globalStyles.headerContainer, {color: theme.colors.text}]}>Two-Factor Authentication</Text>
          <Text style={[globalStyles.text, {color: theme.colors.text}]}>
            {modeTFA === "totp" ? "Enter the code from your authenticator app" : "Enter the code sent to your email"}
          </Text>
          <TextInput
            ref={TFACodeRef}
            style={[globalStyles.input, {color: theme.colors.text}]}
            placeholder="Enter code"
            keyboardType="numeric"
            autoComplete="one-time-code"
            placeholderTextColor={theme.colors.subText}
            value={TFACode}
            onChangeText={setTFACode}
          />
          <Button
            style={[globalStyles.button, {marginTop: spacing.medium, width: "100%"}]}
            color={theme.colors.primary}
            onPress={handleVerify}
          >
            Verify
          </Button>
        </GenericModal>

      </GenericScreen>
    </KeyboardAvoidingView>

  );
}

