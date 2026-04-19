import AsyncStorage from "@react-native-async-storage/async-storage";
import { Tabs, useRouter } from "expo-router";
import { Alert, Text, TouchableOpacity } from "react-native";

export default function BlindTabLayout() {
  const router = useRouter();

  const SettingButton = () => (
    <TouchableOpacity
      onPress={() => {
        Alert.alert("設定", "確定要登出嗎？", [
          { text: "取消", style: "cancel" },
          {
            text: "登出",
            style: "destructive",
            onPress: async () => {
              await AsyncStorage.clear();
              router.replace("/");
            },
          },
        ]);
      }}
      style={{ marginRight: 15 }}
    >
      <Text style={{ fontSize: 22 }}>⚙️</Text>
    </TouchableOpacity>
  );

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: "#007AFF" },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "bold" },
        headerTitleAlign: "center",
        tabBarActiveTintColor: "#007AFF",
        tabBarInactiveTintColor: "#8E8E93",
        tabBarLabelStyle: { fontSize: 14, fontWeight: "600", marginBottom: 10 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "首頁",
          headerRight: SettingButton,
          tabBarIcon: () => null,
        }}
      />
      <Tabs.Screen
        name="camera"
        options={{ title: "實景偵測", tabBarIcon: () => null }}
      />
      <Tabs.Screen
        name="contacts"
        options={{ title: "聯絡人", tabBarIcon: () => null }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: "設定", tabBarIcon: () => null }}
      />
    </Tabs>
  );
}
