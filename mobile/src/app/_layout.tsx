import { darkTheme, lightTheme } from "@/configs/theme";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppMenuProvider } from "@/contexts/AppMenuContext";
import { SettingProvider } from "@/contexts/SettingContext";
import { VRChatProvider } from "@/contexts/VRChatContext";
import { ThemeProvider } from "@react-navigation/native";
import { router, Stack, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  ActivityIndicator,
  Platform,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useMemo, useState } from "react";
import { ToastProvider } from "@/contexts/ToastContext";
import * as SplashScreen from "expo-splash-screen";

import GlobalDrawer from "@/components/layout/GlobalDrawer";
import ConfirmAtFirstDialog from "@/components/features/ConfirmAtFirstDialog";
import { registerBackgroundTaskAsync } from "@/tasks";

import { db } from "@/db";
import migrations from "@/db/migration/migrations";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";

// tanstack
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { persistOptions, queryClient } from "@/lib/queryClient";

import "@/i18n"; // i18n 初期化
import { PipelineProvider } from "@/contexts/PipelineContext";
import { routeToHome, routeToIndex } from "@/lib/route";

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

function RootLayout() {
  const auth = useAuth();
  const pathname = usePathname();
  // Run migrations
  const { success, error } = useMigrations(db, migrations);
  const isReady = !auth.isLoading && success;

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    if (success) {
      console.log("Local database migrations completed.");
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      console.error("Failed to initialize the local database", error);
    }
  }, [error]);

  useEffect(() => {
    if (!success) return;
    registerBackgroundTaskAsync();
  }, [success]);

  useEffect(() => {
    // Wait until initialization is complete
    if (!isReady) return;

    // Check if the user is currently on the login screen (index)
    const isAuthScreen = pathname === "/";

    if (auth.user && isAuthScreen) {
      // Logged in but on the login screen -> Redirect to maintabs
      routeToHome();
    } else if (!auth.user && !isAuthScreen) {
      // Not logged in but trying to access inside the app -> Redirect to login
      routeToIndex();
    }
  }, [auth.user, isReady, pathname]);

  if (error) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text>Unable to initialize the local database.</Text>
        <Text selectable>{error.message}</Text>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
        <Text>Initializing local database...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack
        initialRouteName="index"
        screenOptions={{ headerShown: false, gestureEnabled: true }}
      >
        <Stack.Screen name="maintabs" options={{ headerShown: false }} />
        <Stack.Screen name="details" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="others" options={{ headerShown: false }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack>
      {/* <ConfirmAtFirstDialog /> */}
    </View>
  );
}

export default function Root() {
  const cs = useColorScheme();
  const theme = useMemo(() => (cs !== "dark" ? lightTheme : darkTheme), [cs]);

  return (
    <SettingProvider>
      <VRChatProvider>
        <AuthProvider>
          <PersistQueryClientProvider
            client={queryClient}
            persistOptions={persistOptions}
          >
            <PipelineProvider>
              <SafeAreaProvider>
                {/* <SafeAreaView style={{ flex: 1 }} edges={["left", "right"]}> */}
                <GestureHandlerRootView style={{ flex: 1 }}>
                  <ThemeProvider value={theme}>
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
  );
}
