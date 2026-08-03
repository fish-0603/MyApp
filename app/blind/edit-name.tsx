import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { authFetch } from "../../utils/api";

export default function EditNameScreen() {
  const [name, setName] = useState("");
  const [nameLoading, setNameLoading] = useState(false);

  const [currentEmail, setCurrentEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [initialLoading, setInitialLoading] = useState(true);

  // 進入頁面時，用本地快取的 "user" 物件先顯示名稱，再向後端拉最新的名稱／Email
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const stored = await AsyncStorage.getItem("user");
        const user = stored ? JSON.parse(stored) : null;
        if (user?.full_name) setName(user.full_name);
        if (!user?.id) {
          setInitialLoading(false);
          return;
        }

        const response = await authFetch(`/user-profile/${user.id}`);
        const text = await response.text();
        if (!text.startsWith("{") && !text.startsWith("[")) {
          console.error("後端未回傳 JSON，請確認後端路由是否正確:", text);
          return;
        }
        const data = JSON.parse(text);

        if (response.ok && data.success && data.user) {
          if (data.user.full_name) setName(data.user.full_name);
          if (data.user.email) setCurrentEmail(data.user.email);
        }
      } catch (error) {
        console.error("無法讀取使用者資料:", error);
      } finally {
        setInitialLoading(false);
      }
    };

    loadUserData();
  }, []);

  // A. 儲存名稱修改
  const handleSaveName = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert("提示", "名稱不能為空白，請輸入有效名稱");
      return;
    }

    setNameLoading(true);
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

      const text = await response.text();
      if (!text.startsWith("{") && !text.startsWith("[")) {
        throw new Error("伺服器回應格式錯誤");
      }
      const data = JSON.parse(text);

      if (!response.ok || !data.success) {
        throw new Error(data.message || "資料庫更新失敗");
      }

      // 資料庫成功更新後，同步更新手機 local 快取的 "user" 物件
      await AsyncStorage.setItem("user", JSON.stringify({ ...user, full_name: trimmedName }));
      Alert.alert("成功", "名稱已成功更改！");
    } catch (error: any) {
      console.error("儲存名稱失敗:", error);
      Alert.alert("錯誤", error.message || "更新失敗，請確認網路連線");
    } finally {
      setNameLoading(false);
    }
  };

  // B. 儲存 Email 變更
  const handleSaveEmail = async () => {
    const trimmedEmail = newEmail.trim();
    if (!trimmedEmail) {
      Alert.alert("提示", "請輸入新的電子郵件");
      return;
    }
    if (!emailPassword) {
      Alert.alert("提示", "請輸入密碼以驗證身分");
      return;
    }

    setEmailLoading(true);
    try {
      const stored = await AsyncStorage.getItem("user");
      const user = stored ? JSON.parse(stored) : null;
      if (!user?.id) {
        Alert.alert("錯誤", "找不到使用者登入資訊，請重新登入");
        return;
      }

      const response = await authFetch(`/update-email`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, newEmail: trimmedEmail, password: emailPassword }),
      });

      const text = await response.text();
      if (!text.startsWith("{") && !text.startsWith("[")) {
        throw new Error("伺服器回應格式錯誤");
      }
      const data = JSON.parse(text);

      if (!response.ok || !data.success) {
        throw new Error(data.message || "密碼驗證失敗或 Email 更新失敗");
      }

      await AsyncStorage.setItem("user", JSON.stringify({ ...user, email: trimmedEmail }));
      setCurrentEmail(trimmedEmail);
      setNewEmail("");
      setEmailPassword("");
      Alert.alert("成功", "電子郵件已成功更改！");
    } catch (error: any) {
      console.error("更新 Email 失敗:", error);
      Alert.alert("錯誤", error.message || "更新失敗，請確認密碼是否正確");
    } finally {
      setEmailLoading(false);
    }
  };

  // C. 儲存密碼變更
  const handleSavePassword = async () => {
    if (!oldPassword || !newPassword || !confirmNewPassword) {
      Alert.alert("提示", "請完整填寫所有密碼欄位");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      Alert.alert("錯誤", "兩次輸入的新密碼不一致");
      return;
    }

    setPasswordLoading(true);
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

      const text = await response.text();
      if (!text.startsWith("{") && !text.startsWith("[")) {
        throw new Error("伺服器回應格式錯誤");
      }
      const data = JSON.parse(text);

      if (!response.ok || !data.success) {
        throw new Error(data.message || "舊密碼不正確或修改失敗");
      }

      setOldPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      Alert.alert("成功", "密碼已順利修改！");
    } catch (error: any) {
      console.error("修改密碼失敗:", error);
      Alert.alert("錯誤", error.message || "修改失敗，請確認舊密碼是否正確");
    } finally {
      setPasswordLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.mainContainer}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
    >
      <Stack.Screen
        options={{
          title: "編輯個人資料",
          headerTitleStyle: { fontSize: 20, fontWeight: "bold" },
          headerBackTitle: "返回",
        }}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={Keyboard.dismiss}
        showsVerticalScrollIndicator={true}
        alwaysBounceVertical={true}
      >
        {/* 卡片 1：修改顯示名稱 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>修改名稱</Text>
          <Text style={styles.label}>顯示名稱：</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="請輸入名字"
            placeholderTextColor="#8E8E93"
            returnKeyType="done"
            onSubmitEditing={handleSaveName}
          />

          <TouchableOpacity
            style={[styles.saveButton, nameLoading && styles.disabledButton]}
            onPress={handleSaveName}
            disabled={nameLoading}
          >
            {nameLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <View style={styles.buttonContent}>
                <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.saveButtonText}>儲存名稱</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* 卡片 2：變更電子郵件 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>變更電子郵件</Text>
          <Text style={styles.currentText}>目前電子郵件：{currentEmail || "未設定"}</Text>

          <Text style={styles.label}>新的電子郵件：</Text>
          <TextInput
            style={styles.input}
            value={newEmail}
            onChangeText={setNewEmail}
            placeholder="請輸入新電子郵件"
            placeholderTextColor="#8E8E93"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>密碼：</Text>
          <TextInput
            style={styles.input}
            value={emailPassword}
            onChangeText={setEmailPassword}
            placeholder="請輸入密碼"
            placeholderTextColor="#8E8E93"
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.saveButton, emailLoading && styles.disabledButton]}
            onPress={handleSaveEmail}
            disabled={emailLoading}
          >
            {emailLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <View style={styles.buttonContent}>
                <Ionicons name="mail-outline" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.saveButtonText}>更新電子郵件</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* 卡片 3：變更密碼 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>變更密碼</Text>

          <Text style={styles.label}>原本的密碼：</Text>
          <TextInput
            style={styles.input}
            value={oldPassword}
            onChangeText={setOldPassword}
            placeholder="請輸入舊密碼"
            placeholderTextColor="#8E8E93"
            secureTextEntry
          />

          <Text style={styles.label}>新密碼：</Text>
          <TextInput
            style={styles.input}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="請輸入新密碼"
            placeholderTextColor="#8E8E93"
            secureTextEntry
          />

          <Text style={styles.label}>再次確認新密碼：</Text>
          <TextInput
            style={styles.input}
            value={confirmNewPassword}
            onChangeText={setConfirmNewPassword}
            placeholder="請再次輸入新密碼"
            placeholderTextColor="#8E8E93"
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.saveButton, passwordLoading && styles.disabledButton]}
            onPress={handleSavePassword}
            disabled={passwordLoading}
          >
            {passwordLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <View style={styles.buttonContent}>
                <Ionicons name="key-outline" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.saveButtonText}>更新密碼</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#F2F2F7",
  },
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7",
  },
  contentContainer: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 60,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F2F2F7",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1C1C1E",
    marginBottom: 14,
  },
  currentText: {
    fontSize: 14,
    color: "#6C6C70",
    marginBottom: 12,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1C1C1E",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F2F2F7",
    fontSize: 16,
    color: "#000000",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#C7C7CC",
    marginBottom: 16,
  },
  saveButton: {
    backgroundColor: "hsl(0, 0%, 17%)",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  disabledButton: {
    backgroundColor: "#A2C8FF",
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
});
