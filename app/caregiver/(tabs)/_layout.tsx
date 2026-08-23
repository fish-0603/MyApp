import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function CaregiverTabLayout() {
  // 寫死的 tabBarStyle 會蓋掉 bottom-tabs 自動計算的安全區域 padding，
  // 沒有另外加回 insets.bottom 的話，在有系統手勢列/三鍵導覽列的手機上，
  // tab bar 下緣（含文字）會被系統導覽列的半透明遮罩蓋住，視覺上就像文字變灰色，
  // 跟文字本身顏色設定無關
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: "rgb(0, 0, 0)" },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "bold" },
        headerTitleAlign: "center",
        tabBarActiveTintColor: "hsl(0, 0%, 17%)",
        tabBarInactiveTintColor: "#8E8E93",
        tabBarStyle: { height: 65 + insets.bottom, paddingBottom: 8 + insets.bottom, paddingTop: 8 },
        // 圖示下方文字統一用黑色，跟 icon 是否 active 無關（active/inactive 的差異只透過 icon 顏色呈現）
        tabBarLabel: ({ children }) => (
          <Text style={{ fontSize: 14, fontWeight: "600", marginTop: 6, color: "#000000" }}>
            {children}
          </Text>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "首頁",
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
