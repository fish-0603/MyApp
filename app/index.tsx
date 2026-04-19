import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect } from "react"; // 合併匯入 React 和 useEffect
// 刪除了原本第 4 行的重複 import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function RoleSelection() {
  const router = useRouter();

  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      const userData = await AsyncStorage.getItem("user");
      if (userData) {
        const user = JSON.parse(userData);
        // 如果已經登入過，直接根據角色跳轉
        if (user.role === "blind") {
          router.replace("/blind" as any);
        } else {
          router.replace("/caregiver" as any);
        }
      }
    } catch (e) {
      console.error("讀取登入狀態失敗", e);
    }
  };

  const handleSelectRole = (role: "blind" | "caregiver") => {
    router.push({
      pathname: "/auth/login",
      params: { selectedRole: role },
    } as any);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>歡迎使用智慧導盲系統</Text>
      <Text style={styles.subtitle}>請選擇您的使用身分</Text>

      <TouchableOpacity
        style={[styles.roleBtn, styles.blindBtn]}
        onPress={() => handleSelectRole("blind")}
      >
        <Text style={styles.roleText}>我是視障者</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.roleBtn, styles.caregiverBtn]}
        onPress={() => handleSelectRole("caregiver")}
      >
        <Text style={styles.roleText}>我是照護者 / 家屬</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
    padding: 30,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
    color: "#333",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 50,
    color: "#666",
  },
  roleBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 30,
    borderRadius: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  blindBtn: { backgroundColor: "#34C759" },
  caregiverBtn: { backgroundColor: "#007AFF" },
  roleIcon: { fontSize: 40, marginRight: 20 },
  roleText: { color: "#fff", fontSize: 20, fontWeight: "bold" },
});
