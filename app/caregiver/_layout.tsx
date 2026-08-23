import { Stack } from "expo-router";
import { useEffect } from "react";

import { registerPushToken } from "../../utils/push";

export default function CaregiverLayout() {
  useEffect(() => {
    // 每次進到照護者區塊都重新註冊，涵蓋 token 過期或換裝置的情況
    registerPushToken();
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
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

      {/* 若詳細頁面需要設定按鈕，可在這裡個別加上 headerRight */}
      <Stack.Screen name="map-detail" options={{ title: "位置詳情" }} />
      <Stack.Screen name="bind" options={{ title: "添加視障者好友" }} />
    </Stack>
  );
}
