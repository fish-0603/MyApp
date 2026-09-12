import { Stack } from "expo-router";
import React from "react";

export default function BlindProfileEditLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "rgb(0, 0, 0)" },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "bold" },
        headerTitleAlign: "center",
        headerShown: true,
        // 內層停用 Native 轉場動畫，避免快速連點時與外層 Stack 動畫重疊產生白屏
        animation: "none",
        freezeOnBlur: true,
      }}
    >
      <Stack.Screen name="index" options={{ title: "編輯個人資料" }} />
      <Stack.Screen name="edit-name" options={{ title: "修改名稱" }} />
      <Stack.Screen name="edit-email" options={{ title: "變更電子郵件" }} />
      <Stack.Screen name="verify-email" options={{ title: "驗證電子郵件" }} />
      <Stack.Screen name="edit-password" options={{ title: "變更密碼" }} />
    </Stack>
  );
}
