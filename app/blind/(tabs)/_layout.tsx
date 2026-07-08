import { Ionicons } from "@expo/vector-icons";

import { Tabs } from "expo-router";

export default function BlindTabLayout() {
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
          title: "實景偵測",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="camera" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="contacts"
        options={{
          title: "聯絡人",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
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
