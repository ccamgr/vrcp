import { darkTheme, lightTheme } from "@/configs/theme";
import { AuthProvider } from "@/contexts/AuthContext";
import { CacheProvider } from "@/contexts/CacheContext";
import { DataProvider } from "@/contexts/DataContext";
import { DBProvider } from "@/contexts/DBContext";
import { AppMenuProvider } from "@/contexts/AppMenuContext";
import { SettingProvider } from "@/contexts/SettingContext";
import { VRChatProvider } from "@/contexts/VRChatContext";
import { ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Platform, useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMemo } from "react";
import { ToastProvider } from "@/contexts/ToastContext";

import '@/i18n'; // i18n 初期化
import GlobalDrawer from "@/components/layout/GlobalDrawer";
import ConfirmAtFirstDialog from "@/components/features/ConfirmAtFirstDialog";

function RootLayout() {
  return (
    <>
      <Stack initialRouteName="login" screenOptions={{ headerShown: false, gestureEnabled: true }}>
        <Stack.Screen name="maintabs" options={{ headerShown: false }} />
        <Stack.Screen name="details" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="others" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack>
      {/* <ConfirmAtFirstDialog /> */}
    </>
  );
}

export default function Root() {

  const queryClient = new QueryClient();
  const cs = useColorScheme();
  const theme = useMemo(() => cs !== "dark" ? lightTheme : darkTheme, [cs]);

  return (
    <SettingProvider>
      <QueryClientProvider client={queryClient}>
        {/* <DBProvider> */}
        <VRChatProvider>
          <AuthProvider>
            <CacheProvider>
              <DataProvider>
                <SafeAreaProvider>
                  {/* <SafeAreaView style={{ flex: 1 }} edges={["left", "right"]}> */}
                    <GestureHandlerRootView style={{ flex: 1 }}>
                      <ThemeProvider
                        value={theme}
                      >
                        <AppMenuProvider>
                          <ToastProvider>
                            <GlobalDrawer>
                              <RootLayout />
                            </GlobalDrawer>
                            <StatusBar style="auto" />
                          </ToastProvider>
                        </AppMenuProvider>
                      </ThemeProvider>
                    </GestureHandlerRootView>
                  {/* </SafeAreaView> */}
                </SafeAreaProvider>
              </DataProvider>
            </CacheProvider>
          </AuthProvider>
        </VRChatProvider>
        {/* </DBProvider> */}
      </QueryClientProvider>
    </SettingProvider>
  );
}
