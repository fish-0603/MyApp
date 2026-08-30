import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { authFetch } from "../../utils/api";

export default function CompleteProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [fullName, setFullName] = useState(
    (params.suggestedName as string) || "",
  );
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState(
    params.selectedRole === "caregiver" ? "caregiver" : "blind",
  );
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!fullName.trim()) {
      Alert.alert("提醒", "請輸入暱稱");
      return;
    }
    const phoneRegex = /^09\d{8}$/;
    if (!phoneRegex.test(phone)) {
      Alert.alert("錯誤", "電話格式錯誤 (需為 09xxxxxxxx)");
      return;
    }

    setLoading(true);
    try {
      const res = await authFetch(`/auth/complete-google-profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken: params.idToken,
          full_name: fullName,
          phone,
          role,
        }),
      });
      const result = await res.json();
      if (result.success) {
        await AsyncStorage.setItem("user", JSON.stringify(result.user));
        router.replace(result.user.role === "caregiver" ? "/caregiver" : "/blind");
      } else {
        Alert.alert("建立帳號失敗", result.message);
      }
    } catch (e) {
      Alert.alert("錯誤", "連線伺服器失敗");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>補齊帳號資料</Text>
      <Text style={styles.subtitle}>
        這是您第一次使用 Google 登入，請確認以下資料
      </Text>

      <Text style={styles.label}>您的身分</Text>
      <View style={styles.roleRow}>
        <TouchableOpacity
          style={[styles.roleBtn, role === "blind" && styles.blindActive]}
          onPress={() => setRole("blind")}
          accessible={true}
          accessibilityRole="radio"
          accessibilityLabel="身分選擇，視障者"
          accessibilityState={{ selected: role === "blind" }}
        >
          <Text style={[styles.roleText, role === "blind" && styles.activeText]}>
            視障者
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.roleBtn,
            role === "caregiver" && styles.caregiverActive,
          ]}
          onPress={() => setRole("caregiver")}
          accessible={true}
          accessibilityRole="radio"
          accessibilityLabel="身分選擇，照護者或家屬"
          accessibilityState={{ selected: role === "caregiver" }}
        >
          <Text
            style={[
              styles.roleText,
              role === "caregiver" && styles.activeText,
            ]}
          >
            照護者/家屬
          </Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.input}
        placeholder="暱稱 *"
        placeholderTextColor="#999"
        value={fullName}
        onChangeText={setFullName}
        accessible={true}
        accessibilityLabel="暱稱"
      />
      <TextInput
        style={styles.input}
        placeholder="連絡電話 *"
        placeholderTextColor="#999"
        keyboardType="phone-pad"
        onChangeText={setPhone}
        accessible={true}
        accessibilityLabel="連絡電話"
        accessibilityHint="格式為 09 開頭的 10 位數字"
      />

      <TouchableOpacity
        style={styles.submitBtn}
        onPress={handleSubmit}
        disabled={loading}
        accessible={true}
        accessibilityLabel="完成建立帳號"
        accessibilityRole="button"
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>完成建立帳號</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 25, backgroundColor: "#fff", flexGrow: 1 },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 30,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    color: "#666",
    marginTop: 10,
    marginBottom: 30,
  },
  label: { fontSize: 16, fontWeight: "600", marginBottom: 10 },
  roleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  roleBtn: {
    flex: 0.48,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
  },
  blindActive: { backgroundColor: "hsl(0, 0%, 0%)", borderColor: "#34C759" },
  caregiverActive: { backgroundColor: "rgb(0, 0, 0)", borderColor: "#007AFF" },
  roleText: { fontSize: 16, fontWeight: "bold", color: "#666" },
  activeText: { color: "#fff" },
  input: {
    backgroundColor: "#f9f9f9",
    color: "#000",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#eee",
  },
  submitBtn: {
    backgroundColor: "#333",
    padding: 18,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
