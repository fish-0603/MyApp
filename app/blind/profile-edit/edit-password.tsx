import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useRouter } from "expo-router";
import React, { useState } from "react";
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

export default function EditPasswordScreen() {
  const router = useRouter();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSavePassword = async () => {
    if (!oldPassword) return Alert.alert("提示", "請輸入舊密碼");
    if (!newPassword) return Alert.alert("提示", "請輸入新密碼");
    if (newPassword !== confirmPassword) return Alert.alert("提示", "兩次輸入的新密碼不一致");

    setLoading(true);
    try {
      const stored = await AsyncStorage.getItem("user");
      const user = stored ? JSON.parse(stored) : null;
      if (!user?.id) {
        Alert.alert("錯誤", "找不到使用者登入資訊，請重新登入");
        return;
      }

      const response = await authFetch(`/update-password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, oldPassword, newPassword }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "變更密碼失敗");
      }

      Alert.alert("成功", "密碼已成功更新！", [
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
      Alert.alert("錯誤", error.message || "變更密碼失敗，請確認目前密碼是否正確");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.mainContainer}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <Stack.Screen options={{ title: "變更密碼" }} />

      <View style={styles.card}>
        <Text style={styles.label}>目前密碼：</Text>
        <TextInput
          style={styles.input}
          value={oldPassword}
          onChangeText={setOldPassword}
          placeholder="請輸入目前密碼"
          placeholderTextColor="#8E8E93"
          secureTextEntry
          accessible={true}
          accessibilityLabel="目前密碼輸入框"
        />

        <Text style={styles.label}>新密碼：</Text>
        <TextInput
          style={styles.input}
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="請輸入新密碼"
          placeholderTextColor="#8E8E93"
          secureTextEntry
          accessible={true}
          accessibilityLabel="新密碼輸入框"
        />

        <Text style={styles.label}>確認新密碼：</Text>
        <TextInput
          style={styles.input}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="請再次輸入新密碼"
          placeholderTextColor="#8E8E93"
          secureTextEntry
          accessible={true}
          accessibilityLabel="確認新密碼輸入框"
        />

        <TouchableOpacity
          style={[styles.saveButton, loading && styles.disabledButton]}
          onPress={handleSavePassword}
          disabled={loading}
          accessible={true}
          accessibilityLabel="更新密碼按鈕"
          accessibilityRole="button"
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <View style={styles.buttonContent}>
              <Ionicons name="key-outline" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.saveButtonText}>更新密碼</Text>
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
  label: { fontSize: 15, fontWeight: "600", color: "#1C1C1E", marginBottom: 8 },
  input: { backgroundColor: "#F2F2F7", fontSize: 16, color: "#000000", paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: "#C7C7CC", marginBottom: 16 },
  saveButton: { backgroundColor: "hsl(0, 0%, 17%)", paddingVertical: 14, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: 8 },
  disabledButton: { backgroundColor: "#A2C8FF" },
  buttonContent: { flexDirection: "row", alignItems: "center" },
  saveButtonText: { fontSize: 16, fontWeight: "bold", color: "#FFFFFF" },
});
