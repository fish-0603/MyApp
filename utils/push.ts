import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { authFetch } from "./api";

// 目前只有在 Firebase Console 註冊了 Android App（google-services.json 也只有 Android 的設定），
// iOS 還沒有對應的 APNs/Firebase 設定，呼叫 getDevicePushTokenAsync 會失敗，故先跳過
export async function registerPushToken() {
  if (Platform.OS !== "android") return;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") return;

    // 拿原生 FCM token（不是 Expo push token），對應後端用 firebase-admin 直接發送的格式
    const { data: fcmToken } = await Notifications.getDevicePushTokenAsync();
    if (!fcmToken) return;

    await authFetch("/push-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fcmToken }),
    });
  } catch (err) {
    console.error("推播 token 註冊失敗:", err);
  }
}
