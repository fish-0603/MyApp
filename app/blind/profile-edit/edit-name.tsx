import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { authFetch } from "../../../utils/api";

export default function EditNameScreen() {
  const router = useRouter();
  const [currentName, setCurrentName] = useState("");
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const stored = await AsyncStorage.getItem("user");
        const user = stored ? JSON.parse(stored) : null;
        if (user?.full_name) setCurrentName(user.full_name);
      } catch (error) {
        console.error("無法讀取名稱:", error);
      }
    };
    loadUserData();
  }, []);

  const handleSaveName = async () => {
    const trimmedName = newName.trim();
    if (!trimmedName) return Alert.alert("提示", "請輸入新的名稱");

    setLoading(true);
    try {
      const stored = await AsyncStorage.getItem("user");
      const user = stored ? JSON.parse(stored) : null;
      if (!user?.id) {
        Alert.alert("錯誤", "找不到使用者登入資訊，請重新登入");
        return;
      }

      const response = await authFetch(`/update-name`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, name: trimmedName }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "更新名稱失敗");
      }

      await AsyncStorage.setItem("user", JSON.stringify({ ...user, full_name: trimmedName }));
      setCurrentName(trimmedName);
      setNewName("");

      Alert.alert("成功", "顯示名稱已成功更改！", [
        {
          text: "確定",
          onPress: () => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/blind/profile-edit");
            }
          },
        },
      ]);
    } catch (error: any) {
      console.error("修改名稱失敗詳情:", error);
      Alert.alert("錯誤", error.message || "更新失敗，請確認網路或 API 設定");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.mainContainer}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <Stack.Screen options={{ title: "修改名稱" }} />

      <View style={styles.card}>
        <Text
          style={styles.currentText}
          accessible={true}
          accessibilityLabel={`目前顯示名稱：${currentName || "載入中"}`}
        >
          目前顯示名稱：{currentName || "載入中..."}
        </Text>

        <Text style={styles.label}>新的顯示名稱：</Text>
        <TextInput
          style={styles.input}
          value={newName}
          onChangeText={setNewName}
          placeholder="請輸入新名稱"
          placeholderTextColor="#8E8E93"
          accessible={true}
          accessibilityLabel="新名稱輸入框"
        />

        <TouchableOpacity
          style={[styles.saveButton, loading && styles.disabledButton]}
          onPress={handleSaveName}
          disabled={loading}
          accessible={true}
          accessibilityLabel="更新名稱按鈕"
          accessibilityRole="button"
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <View style={styles.buttonContent}>
              <Ionicons name="person-outline" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.saveButtonText}>更新名稱</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: "#F2F2F7", padding: 20 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 20, padding: 20, borderWidth: 1, borderColor: "#E5E5EA" },
  currentText: { fontSize: 14, color: "#6C6C70", marginBottom: 16 },
  label: { fontSize: 15, fontWeight: "600", color: "#1C1C1E", marginBottom: 8 },
  input: { backgroundColor: "#F2F2F7", fontSize: 16, color: "#000000", paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: "#C7C7CC", marginBottom: 16 },
  saveButton: { backgroundColor: "hsl(0, 0%, 17%)", paddingVertical: 14, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: 8 },
  disabledButton: { backgroundColor: "#A2C8FF" },
  buttonContent: { flexDirection: "row", alignItems: "center" },
  saveButtonText: { fontSize: 16, fontWeight: "bold", color: "#FFFFFF" },
});
