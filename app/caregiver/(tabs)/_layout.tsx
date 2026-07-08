import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Tabs, useRouter } from "expo-router";
import { Alert, Text, TouchableOpacity } from "react-native";

export default function CaregiverTabLayout() {
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
        headerStyle: { backgroundColor: "rgb(0, 0, 0)" },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "bold" },
        headerTitleAlign: "center",
        tabBarActiveTintColor: "hsl(0, 0%, 17%)",
        tabBarInactiveTintColor: "#8E8E93",
        tabBarStyle: { height: 85, paddingBottom: 10 },
        tabBarLabelStyle: { fontSize: 14, fontWeight: "600", marginTop: 6 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "首頁",
          headerRight: SettingButton,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="contacts"
        options={{
          title: "好友清單",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="alert-history"
        options={{
          title: "緊急事件紀錄",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="warning" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "設定",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
