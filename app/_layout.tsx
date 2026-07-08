import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { Stack } from "expo-router";
import React, { useEffect } from "react";
import { GOOGLE_WEB_CLIENT_ID } from "../constants/config";

export default function Layout() {
  useEffect(() => {
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      offlineAccess: false,
    });
  }, []);

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "rgb(0, 0, 0)" },
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
      <Stack.Screen
        name="auth/complete-profile"
        options={{ title: "補齊資料", headerBackVisible: false }}
      />

      {/* 盲人與照顧者端完全下放權限 */}
      <Stack.Screen name="blind" options={{ headerShown: false }} />
      <Stack.Screen name="caregiver" options={{ headerShown: false }} />
    </Stack>
  );
}
