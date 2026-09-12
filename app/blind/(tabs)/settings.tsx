import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { authFetch } from "../../../utils/api";

export default function BlindSettingsScreen() {
  const router = useRouter();

  const [userName, setUserName] = useState("載入中...");
  const [userAccount, setUserAccount] = useState("");
  const userRole = "視障者";

  // 每次回到畫面時自動刷新使用者資料（例如剛從編輯頁面存檔返回）
  useFocusEffect(
    useCallback(() => {
      const loadUserData = async () => {
        try {
          const data = await AsyncStorage.getItem("user");
          if (data) {
            const user = JSON.parse(data);
            setUserName(user.full_name || "");
            setUserAccount(user.username || "");
          }
        } catch (error) {
          console.error("讀取身分資料失敗:", error);
        }
      };

      loadUserData();
    }, [])
  );

  const handleLogout = () => {
    Alert.alert("確認", "確定要登出系統嗎？", [
      { text: "取消", style: "cancel" },
      {
        text: "登出",
        style: "destructive",
        onPress: async () => {
          // 讓伺服器端也失效這個 token；讀取 token 必須在 AsyncStorage.clear() 之前完成，
          // 失敗也不擋登出流程
          try {
            await authFetch("/logout", { method: "POST" });
          } catch {
            // 連不上伺服器也沒關係，本機還是要正常登出
          }
          await AsyncStorage.clear();
          router.replace("/");
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* 身分顯示卡片 */}
      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person" size={32} color="#000000" />
        </View>

        <View style={styles.profileInfo}>
          <Text
            style={styles.userName}
            numberOfLines={1}
            accessible={true}
            accessibilityLabel={`顯示名稱：${userName}`}
          >
            {userName}
          </Text>

          <Text
            style={styles.userAccount}
            accessible={true}
            accessibilityLabel={`帳號：${userAccount || "無"}`}
          >
            {userAccount ? `帳號：${userAccount}` : ""}
          </Text>

          <View
            style={styles.roleBadge}
            accessible={true}
            accessibilityLabel={`身分：${userRole}`}
          >
            <Ionicons name="eye-outline" size={14} color="#000000" style={{ marginRight: 4 }} />
            <Text style={styles.roleText}>{userRole}</Text>
          </View>
        </View>
      </View>

      {/* 編輯個人資料按鈕 */}
      <TouchableOpacity
        style={styles.editProfileButton}
        onPress={() => router.push("/blind/profile-edit")}
        accessible={true}
        accessibilityLabel="編輯個人資料"
        accessibilityHint="點擊後開啟編輯個人資料選單"
        accessibilityRole="button"
      >
        <Ionicons name="create-outline" size={22} color="rgb(0, 0, 0)" style={{ marginRight: 8 }} />
        <Text style={styles.editProfileText}>編輯個人資料</Text>
      </TouchableOpacity>

      {/* 常見問題按鈕 */}
      <TouchableOpacity
        style={styles.settingItem}
        onPress={() => router.push("/blind/faq")}
        accessible={true}
        accessibilityLabel="常見問題與說明"
        accessibilityHint="點擊開啟常見問題與說明頁面"
        accessibilityRole="button"
      >
        <Ionicons name="help-circle-outline" size={22} color="rgb(0, 0, 0)" style={{ marginRight: 8 }} />
        <Text style={styles.settingText}>常見問題與說明</Text>
      </TouchableOpacity>

      {/* 登出按鈕 */}
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
        accessible={true}
        accessibilityLabel="登出系統"
        accessibilityHint="點擊後將彈出確認視窗並清除登入狀態"
        accessibilityRole="button"
      >
        <Ionicons name="log-out-outline" size={22} color="#FF3B30" style={{ marginRight: 8 }} />
        <Text style={styles.logoutText}>登出系統</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 30,
    backgroundColor: "#F2F2F7",
  },

  // 身分顯示卡片樣式（跟照護者端同款）
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#E5E5EA",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
    justifyContent: "center",
  },
  userName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1C1C1E",
    marginBottom: 2,
  },
  userAccount: {
    fontSize: 13,
    color: "#8E8E93",
    marginBottom: 8,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#E5E5EA",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000000",
  },

  // 編輯個人資料按鈕樣式（照護者端同款獨立卡片）
  editProfileButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF",
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  editProfileText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000000",
  },

  // 常見問題按鈕樣式
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF",
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  settingText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000000",
  },

  // 登出按鈕樣式
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF",
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  logoutText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FF3B30",
  },
});
