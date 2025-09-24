import BackButtonForHeader from "@/components/layout/BackButtonForHeader";
import { Stack } from "expo-router";
import React from "react";

export default function Layout() {
  return (
    <Stack>
      <Stack.Screen
        name="search"
        options={{ title: "Search", headerLeft: BackButtonForHeader }}
      />
      <Stack.Screen name="user" options={{ headerShown: false }} />
      <Stack.Screen name="group" options={{ headerShown: false }} />
      <Stack.Screen name="world" options={{ headerShown: false }} />
      <Stack.Screen name="avatar" options={{ headerShown: false }} />
    </Stack>
  );
}
