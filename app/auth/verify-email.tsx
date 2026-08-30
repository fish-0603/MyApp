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
import { formatCountdown, useCountdown } from "../../utils/useCountdown";

// email 是註冊時的選填欄位，這個畫面只是提醒驗證、不是強制關卡，
// 所以一定要有「稍後再說」可以跳過，不能卡住使用者進不去 App
export default function VerifyEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(
    (params.expiresAt as string) || null
  );
  const remainingSeconds = useCountdown(expiresAt);
  const isExpired = remainingSeconds === 0;

  const goHome = async () => {
    const stored = await AsyncStorage.getItem("user");
    const user = stored ? JSON.parse(stored) : null;
    router.replace(user?.role === "caregiver" ? "/caregiver" : "/blind");
  };

  const handleVerify = async () => {
    if (!code.trim()) {
      Alert.alert("提醒", "請輸入驗證碼");
      return;
    }
    setLoading(true);
    try {
      const res = await authFetch(`/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const result = await res.json();
      if (result.success) {
        Alert.alert("驗證成功", "電子郵件已完成驗證");
        await goHome();
      } else {
        Alert.alert("驗證失敗", result.message);
      }
    } catch (e) {
      Alert.alert("錯誤", "連線伺服器失敗");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      const res = await authFetch(`/resend-verification-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const result = await res.json();
      if (result.success) {
        setExpiresAt(result.emailVerificationExpiresAt || null);
        setCode("");
        Alert.alert("已重新寄送", "請至信箱查看新的驗證碼");
      } else {
        Alert.alert("寄送失敗", result.message);
      }
    } catch (e) {
      Alert.alert("錯誤", "連線伺服器失敗");
    } finally {
      setResending(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>驗證電子郵件</Text>
      <Text style={styles.subtitle}>
        驗證碼已寄至 {params.email || "您的信箱"}，請輸入信中的 6 碼驗證碼
      </Text>

      {remainingSeconds !== null ? (
        <Text style={isExpired ? styles.expiredText : styles.countdownText}>
          {isExpired
            ? "驗證碼已過期，請重新寄送"
            : `驗證碼將於 ${formatCountdown(remainingSeconds)} 後失效`}
        </Text>
      ) : null}

      <TextInput
        style={styles.input}
        placeholder="6 碼驗證碼"
        placeholderTextColor="#999"
        keyboardType="number-pad"
        maxLength={6}
        value={code}
        onChangeText={setCode}
        editable={!isExpired}
        accessible={true}
        accessibilityLabel="驗證碼"
      />

      <TouchableOpacity
        style={[styles.submitBtn, isExpired && styles.disabledBtn]}
        onPress={handleVerify}
        disabled={loading || isExpired}
        accessible={true}
        accessibilityLabel="送出驗證"
        accessibilityRole="button"
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>確認驗證</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleResend}
        disabled={resending}
        accessible={true}
        accessibilityLabel="重新寄送驗證碼"
        accessibilityRole="button"
      >
        <Text style={styles.linkText}>
          {resending ? "寄送中..." : "沒收到驗證碼？重新寄送"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={goHome}
        accessible={true}
        accessibilityLabel="稍後再說"
        accessibilityRole="button"
      >
        <Text style={styles.skipText}>稍後再說</Text>
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
    marginBottom: 12,
  },
  countdownText: {
    fontSize: 14,
    textAlign: "center",
    color: "#999",
    marginBottom: 18,
  },
  expiredText: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    color: "#FF3B30",
    marginBottom: 18,
  },
  input: {
    backgroundColor: "#f9f9f9",
    color: "#000",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#eee",
    textAlign: "center",
    fontSize: 20,
    letterSpacing: 8,
  },
  submitBtn: {
    backgroundColor: "#333",
    padding: 18,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  disabledBtn: { backgroundColor: "#B0B0B0" },
  linkText: {
    color: "#007AFF",
    textAlign: "center",
    marginTop: 20,
    fontSize: 15,
  },
  skipText: {
    color: "#999",
    textAlign: "center",
    marginTop: 16,
    fontSize: 14,
  },
});
