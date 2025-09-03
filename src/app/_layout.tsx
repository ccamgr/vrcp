import { darkTheme, lightTheme } from "@/config/theme";
import { AuthProvider } from "@/contexts/AuthContext";
import { ImageCacheProvider } from "@/contexts/ImageCacheContext";
import { VRChatProvider } from "@/contexts/VRChatContext";
import { ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

function RootLayout() {
  return (
        <Stack initialRouteName="index" >
          <Stack.Screen name="maintab" options={{ headerShown: false }} />
          <Stack.Screen name="other" options={{ headerShown: false }} />
          <Stack.Screen name="index" options={{ headerShown: false }} />
        </Stack>
  );
}

export default function Root() {
  return (
    <VRChatProvider>
      <AuthProvider>
        <ImageCacheProvider>
          <SafeAreaProvider>
            <SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>
              <ThemeProvider value={ useColorScheme() !== 'dark' ? lightTheme : darkTheme }>
                <RootLayout />
                <StatusBar style="auto" />
              </ThemeProvider>
            </SafeAreaView>
          </SafeAreaProvider>
        </ImageCacheProvider>
      </AuthProvider>
    </VRChatProvider>
  );
}
