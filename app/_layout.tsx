import { Stack } from "expo-router";
import React from "react";

export default function Layout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#007AFF" },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "bold" },
        headerTitleAlign: "center",
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="auth/login"
        options={{ title: "登入", headerBackVisible: false }}
      />
      <Stack.Screen
        name="auth/register"
        options={{ title: "註冊", headerBackVisible: true }}
      />

      {/* 盲人與照顧者端完全下放權限 */}
      <Stack.Screen name="blind" options={{ headerShown: false }} />
      <Stack.Screen name="caregiver" options={{ headerShown: false }} />
    </Stack>
  );
}
