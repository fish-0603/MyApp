import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { Stack } from "expo-router";
import * as Notifications from "expo-notifications";
import React, { useEffect } from "react";
import { GOOGLE_WEB_CLIENT_ID } from "../constants/config";

// 預設 App 開著（前景）時系統不會跳橫幅通知，只會靜靜觸發監聽器；
// SOS 通知這種要「馬上被看到」的情境，前景也要跟背景一樣跳出來+響鈴
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

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
