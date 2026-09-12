import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack } from "expo-router";
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
import { formatCountdown, useCountdown } from "../../../utils/useCountdown";

// 給不想改信箱、只是想驗證目前這組信箱的人用。跟 edit-email 換信箱後的驗證共用同一套
// /verify-email、/resend-verification-email API，差別只在這裡不提供改信箱的欄位。
export default function VerifyEmailScreen() {
  const [currentEmail, setCurrentEmail] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const [verifyCode, setVerifyCode] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  // /user-profile 會一併回傳目前還沒過期的驗證碼到期時間（沒有就是 null），
  // 讓這頁一進來就能顯示倒數，不用等按「重新寄送」才知道
  const [verifyExpiresAt, setVerifyExpiresAt] = useState<string | null>(null);
  const verifyRemainingSeconds = useCountdown(verifyExpiresAt);
  const verifyIsExpired = verifyRemainingSeconds === 0;

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const stored = await AsyncStorage.getItem("user");
        const user = stored ? JSON.parse(stored) : null;
        if (!user?.id) return;
        const response = await authFetch(`/user-profile/${user.id}`);
        const data = await response.json();
        if (response.ok && data.success && data.user) {
          if (data.user.email) setCurrentEmail(data.user.email);
          setEmailVerified(!!data.user.email_verified);
          setVerifyExpiresAt(data.emailVerificationExpiresAt || null);
        }
      } catch (error) {
        console.error("無法讀取 Email:", error);
      } finally {
        setInitialLoading(false);
      }
    };
    loadUserData();
  }, []);

  const handleVerifyEmail = async () => {
    if (!verifyCode.trim()) return Alert.alert("提示", "請輸入驗證碼");
    setVerifyLoading(true);
    try {
      const response = await authFetch(`/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: verifyCode.trim() }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "驗證失敗");
      }
      setEmailVerified(true);
      setVerifyCode("");
      setVerifyExpiresAt(null);
      Alert.alert("成功", "電子郵件已完成驗證！");
    } catch (error: any) {
      Alert.alert("錯誤", error.message || "驗證失敗，請確認驗證碼是否正確");
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResendLoading(true);
    try {
      const response = await authFetch(`/resend-verification-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "寄送失敗");
      }
      setVerifyExpiresAt(data.emailVerificationExpiresAt || null);
      setVerifyCode("");
      Alert.alert("已重新寄送", "請至信箱查看新的驗證碼");
    } catch (error: any) {
      Alert.alert("錯誤", error.message || "寄送失敗，請稍後再試");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.mainContainer}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <Stack.Screen options={{ title: "驗證電子郵件" }} />

      <View style={styles.card}>
        <Text
          style={styles.currentText}
          accessible={true}
          accessibilityLabel={`目前電子郵件：${currentEmail || "載入中"}`}
        >
          目前電子郵件：{currentEmail || "載入中..."}
        </Text>

        {initialLoading ? null : currentEmail && emailVerified ? (
          <Text style={styles.verifiedMessage}>✓ 這個信箱已經完成驗證，不需要再次驗證。</Text>
        ) : currentEmail ? (
          <>
            <Text style={styles.unverifiedText}>尚未驗證</Text>

            {verifyRemainingSeconds !== null ? (
              <Text style={verifyIsExpired ? styles.verifyExpiredText : styles.verifyCountdownText}>
                {verifyIsExpired
                  ? "驗證碼已過期，請重新寄送"
                  : `驗證碼將於 ${formatCountdown(verifyRemainingSeconds)} 後失效`}
              </Text>
            ) : null}

            <Text style={styles.label}>輸入驗證碼：</Text>
            <TextInput
              style={styles.input}
              value={verifyCode}
              onChangeText={setVerifyCode}
              placeholder="6 碼驗證碼"
              placeholderTextColor="#8E8E93"
              keyboardType="number-pad"
              maxLength={6}
              editable={!verifyIsExpired}
              accessible={true}
              accessibilityLabel="驗證碼輸入框"
            />

            <TouchableOpacity
              style={[styles.saveButton, (verifyLoading || verifyIsExpired) && styles.disabledButton]}
              onPress={handleVerifyEmail}
              disabled={verifyLoading || verifyIsExpired}
              accessible={true}
              accessibilityLabel="確認驗證按鈕"
              accessibilityRole="button"
            >
              {verifyLoading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveButtonText}>確認驗證</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleResendVerification}
              disabled={resendLoading}
              style={styles.resendLink}
              accessible={true}
              accessibilityLabel="重新寄送驗證碼按鈕"
              accessibilityRole="button"
            >
              <Text style={styles.resendLinkText}>{resendLoading ? "寄送中..." : "沒收到驗證碼？重新寄送"}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={styles.unverifiedText}>此帳號尚未設定電子郵件，請先至「變更電子郵件」新增。</Text>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: "#F2F2F7", padding: 20 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 20, padding: 20, borderWidth: 1, borderColor: "#E5E5EA" },
  currentText: { fontSize: 14, color: "#6C6C70", marginBottom: 4 },
  verifiedMessage: { fontSize: 14, fontWeight: "600", color: "#34C759" },
  unverifiedText: { fontSize: 13, fontWeight: "600", color: "#FF9500", marginBottom: 16 },
  verifyCountdownText: { fontSize: 13, color: "#8E8E93", marginBottom: 16 },
  verifyExpiredText: { fontSize: 13, fontWeight: "600", color: "#FF3B30", marginBottom: 16 },
  label: { fontSize: 15, fontWeight: "600", color: "#1C1C1E", marginBottom: 8 },
  input: { backgroundColor: "#F2F2F7", fontSize: 16, color: "#000000", paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: "#C7C7CC", marginBottom: 16 },
  saveButton: { backgroundColor: "hsl(0, 0%, 17%)", paddingVertical: 14, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: 8 },
  disabledButton: { backgroundColor: "#A2C8FF" },
  saveButtonText: { fontSize: 16, fontWeight: "bold", color: "#FFFFFF" },
  resendLink: { marginTop: 14, alignItems: "center" },
  resendLinkText: { color: "#007AFF", fontSize: 14 },
});
