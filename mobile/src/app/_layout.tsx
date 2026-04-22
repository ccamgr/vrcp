import { darkTheme, lightTheme } from "@/configs/theme";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppMenuProvider } from "@/contexts/AppMenuContext";
import { SettingProvider } from "@/contexts/SettingContext";
import { VRChatProvider } from "@/contexts/VRChatContext";
import { ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Platform, useColorScheme, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { use, useCallback, useEffect, useMemo } from "react";
import { ToastProvider } from "@/contexts/ToastContext";
import * as SplashScreen from 'expo-splash-screen';

import GlobalDrawer from "@/components/layout/GlobalDrawer";
import ConfirmAtFirstDialog from "@/components/features/ConfirmAtFirstDialog";
import { LogProvider } from "@/contexts/LogContext";
import { registerBackgroundTaskAsync } from "@/tasks/taskregister";

import { db, cacheManager } from "@/db";
import migrations from "@/db/migration/migrations";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";

// tanstack
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { persistOptions, queryClient } from "@/lib/queryClient";

import '@/i18n'; // i18n 初期化
import { PipelineProvider } from "@/contexts/PipelineContext";


// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync()

function RootLayout() {

  const auth = useAuth();
  // Run migrations
  const { success, error } = useMigrations(db, migrations);

  useEffect(() => {
    if (!auth.isLoading && success || error) {
      SplashScreen.hideAsync();
    }
  }, [auth.isLoading, success, error]);


  return (
    <View style={{ flex: 1 }}>
      {auth.user ? (
        <Stack initialRouteName="maintabs" screenOptions={{ headerShown: false, gestureEnabled: true }}>
          <Stack.Screen name="maintabs" options={{ headerShown: false }} />
          <Stack.Screen name="details" options={{ headerShown: false }} />
          <Stack.Screen name="settings" options={{ headerShown: false }} />
          <Stack.Screen name="others" options={{ headerShown: false }} />
        </Stack>
      ) : (
        <Stack initialRouteName="index" screenOptions={{ headerShown: false, gestureEnabled: true }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
        </Stack>
      )}
      {/* <ConfirmAtFirstDialog /> */}
    </View>
  );
}

export default function Root() {
  const cs = useColorScheme();
  const theme = useMemo(() => cs !== "dark" ? lightTheme : darkTheme, [cs]);


  useEffect(() => {
    // init tasks
    registerBackgroundTaskAsync();
  }, []);

  return (
    <LogProvider>
      <SettingProvider>
        <VRChatProvider>
          <AuthProvider>
            <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>

              <PipelineProvider>
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
              </PipelineProvider>

            </PersistQueryClientProvider>
          </AuthProvider>
        </VRChatProvider>
      </SettingProvider>
    </LogProvider>
  );
}
