import { darkTheme, lightTheme } from "@/configs/theme";
import { AuthProvider } from "@/contexts/AuthContext";
import { CacheProvider } from "@/contexts/CacheContext";
import { DataProvider } from "@/contexts/DataContext";
import { DBProvider } from "@/contexts/DBContext";
import { SettingProvider } from "@/contexts/SettingContext";
import { VRChatProvider } from "@/contexts/VRChatContext";
import { ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

function RootLayout() {
  return (
    <Stack initialRouteName="index" screenOptions={{ headerShown: false, gestureEnabled: true }}>
      <Stack.Screen name="maintab" options={{ headerShown: false }} />
      <Stack.Screen name="modals" options={{ headerShown: false }} />
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="tmp" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function Root() {
  return (
    <SettingProvider>
      <DBProvider>
      <VRChatProvider>
        <AuthProvider>
          <CacheProvider>
            <DataProvider>
              <SafeAreaProvider>
                <SafeAreaView style={{ flex: 1 }} edges={["left", "right"]}>
                  <ThemeProvider
                    value={useColorScheme() !== "dark" ? lightTheme : darkTheme}
                  >
                    <RootLayout />
                    <StatusBar style="auto" />
                  </ThemeProvider>
                </SafeAreaView>
              </SafeAreaProvider>
            </DataProvider>
          </CacheProvider>
        </AuthProvider>
      </VRChatProvider>
      </DBProvider>
    </SettingProvider>
  );
}
