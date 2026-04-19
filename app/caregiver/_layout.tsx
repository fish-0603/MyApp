import { Stack } from "expo-router";

export default function CaregiverLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#007AFF" },
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
