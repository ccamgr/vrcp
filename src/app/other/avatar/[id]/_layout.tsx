import BackButtonForHeader from "@/components/layout/BackButtonForHeader";
import { Stack } from "expo-router";
import React from "react";

export default function Layout() {
  return (
    <Stack initialRouteName="index">
      <Stack.Screen
        name="index"
        options={{ title: "Acatar", headerLeft: BackButtonForHeader }}
      />
    </Stack>
  );
}
