import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { BASE_URL } from "../../constants/config";

export default function RegisterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [form, setForm] = useState({
    full_name: "",
    username: "",
    password: "",
    confirmPassword: "",
    phone: "",
    email: "",
    role: (params.selectedRole as string) || "blind",
  });

  const validate = () => {
    const { full_name, username, password, confirmPassword, phone } = form;
    let emptyFields = [];
    if (!full_name.trim()) emptyFields.push("暱稱");
    if (!username.trim()) emptyFields.push("帳號");
    if (!password) emptyFields.push("密碼");
    if (!confirmPassword) emptyFields.push("確認密碼");
    if (!phone.trim()) emptyFields.push("連絡電話");
    if (emptyFields.length > 0) {
      Alert.alert("提醒", `以下欄位尚未填寫：\n${emptyFields.join("、")}`);
      return false;
    }
    const usernameRegex = /^[a-zA-Z0-9]{1,20}$/;
    if (!usernameRegex.test(username)) {
      Alert.alert("錯誤", "帳號僅限英文與數字，且需在 20 字元內");
      return false;
    }
    const passwordRegex = /^(?=.*[A-Z])[a-zA-Z0-9]{1,20}$/;
    if (!passwordRegex.test(password)) {
      Alert.alert("錯誤", "密碼需含英文數字及至少一個大寫字母，且在 20 字元內");
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert("錯誤", "密碼與確認密碼不一致");
      return false;
    }
    const phoneRegex = /^09\d{8}$/;
    if (!phoneRegex.test(phone)) {
      Alert.alert("錯誤", "電話格式錯誤 (需為 09xxxxxxxx)");
      return false;
    }
    return true;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    try {
      const res = await fetch(`${BASE_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await res.json();
      if (result.success) {
        Alert.alert("註冊成功", "帳號已建立，正在為您進入系統...");
        await AsyncStorage.setItem("user", JSON.stringify(result.user));
        router.replace(
          result.user.role === "caregiver" ? "/caregiver" : "/blind",
        );
      } else {
        Alert.alert("註冊失敗", result.message);
      }
    } catch (e) {
      Alert.alert("錯誤", "連線伺服器失敗");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>建立新帳號</Text>

      <Text style={styles.label}>您的身分</Text>
      <View style={styles.roleRow}>
        <TouchableOpacity
          style={[styles.roleBtn, form.role === "blind" && styles.blindActive]}
          onPress={() => setForm({ ...form, role: "blind" })}
          accessible={true}
          accessibilityRole="radio"
          accessibilityLabel="身分選擇，視障者"
          accessibilityState={{ selected: form.role === "blind" }}
        >
          <Text
            style={[
              styles.roleText,
              form.role === "blind" && styles.activeText,
            ]}
          >
            視障者
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.roleBtn,
            form.role === "caregiver" && styles.caregiverActive,
          ]}
          onPress={() => setForm({ ...form, role: "caregiver" })}
          accessible={true}
          accessibilityRole="radio"
          accessibilityLabel="身分選擇，照護者或家屬"
          accessibilityState={{ selected: form.role === "caregiver" }}
        >
          <Text
            style={[
              styles.roleText,
              form.role === "caregiver" && styles.activeText,
            ]}
          >
            照護者/家屬
          </Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.input}
        placeholder="暱稱 *"
        onChangeText={(v) => setForm({ ...form, full_name: v })}
        accessible={true}
        accessibilityLabel="暱稱"
      />
      <TextInput
        style={styles.input}
        placeholder="登入帳號 *"
        autoCapitalize="none"
        onChangeText={(v) => setForm({ ...form, username: v })}
        accessible={true}
        accessibilityLabel="登入帳號"
        accessibilityHint="僅限英文與數字"
      />
      <TextInput
        style={styles.input}
        placeholder="設定密碼 *"
        secureTextEntry
        onChangeText={(v) => setForm({ ...form, password: v })}
        accessible={true}
        accessibilityLabel="密碼"
        accessibilityHint="需包含至少一個大寫字母"
      />
      <TextInput
        style={styles.input}
        placeholder="確認密碼 *"
        secureTextEntry
        onChangeText={(v) => setForm({ ...form, confirmPassword: v })}
        accessible={true}
        accessibilityLabel="確認密碼"
      />
      <TextInput
        style={styles.input}
        placeholder="連絡電話 *"
        keyboardType="phone-pad"
        onChangeText={(v) => setForm({ ...form, phone: v })}
        accessible={true}
        accessibilityLabel="連絡電話"
        accessibilityHint="格式為 09 開頭的 10 位數字"
      />
      <TextInput
        style={styles.input}
        placeholder="信箱 (選填)"
        keyboardType="email-address"
        onChangeText={(v) => setForm({ ...form, email: v })}
        accessible={true}
        accessibilityLabel="電子信箱"
      />

      <TouchableOpacity
        style={styles.submitBtn}
        onPress={handleRegister}
        accessible={true}
        accessibilityLabel="送出註冊"
        accessibilityRole="button"
      >
        <Text style={styles.submitText}>確認註冊</Text>
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
    marginVertical: 30,
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
