import { Ionicons } from "@expo/vector-icons";
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

const EMAIL_FORMAT_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function EditEmailScreen() {
  const [currentEmail, setCurrentEmail] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(false);

  // 只有在這個畫面裡按過「更新電子郵件」才顯示驗證區塊——不是看伺服器的 email_verified
  // 判斷；歷史上已存在但還沒驗證的信箱，交給獨立的「驗證電子郵件」畫面處理，這裡不重複顯示
  const [showVerifyBox, setShowVerifyBox] = useState(false);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  // 只有觸發過「更新 email」或「重新寄送」才知道確切過期時間；剛進頁面時不知道就是 null，
  // 不顯示倒數（不代表沒有驗證碼在等，只是這個畫面還沒問過後端）
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
        }
      } catch (error) {
        console.error("無法讀取 Email:", error);
      }
    };
    loadUserData();
  }, []);

  // 換信箱不需要驗證舊信箱——直接輸入新的送出即可，換完之後才需要驗證新信箱
  const handleSaveEmail = async () => {
    const trimmedEmail = newEmail.trim();
    if (!trimmedEmail) return Alert.alert("提示", "請輸入新的電子郵件");
    if (!EMAIL_FORMAT_REGEX.test(trimmedEmail)) return Alert.alert("提示", "電子郵件格式錯誤");

    setLoading(true);
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
        body: JSON.stringify({ userId: user.id, newEmail: trimmedEmail }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "更新 Email 失敗");
      }

      await AsyncStorage.setItem("user", JSON.stringify({ ...user, email: trimmedEmail }));
      setCurrentEmail(trimmedEmail);
      setEmailVerified(false);
      setShowVerifyBox(true);
      setVerifyExpiresAt(data.emailVerificationExpiresAt || null);
      setVerifyCode("");
      setNewEmail("");
      Alert.alert("成功", "電子郵件已成功更改，請在下方輸入驗證碼完成驗證！");
    } catch (error: any) {
      Alert.alert("錯誤", error.message || "更新失敗，請確認電子郵件格式是否正確");
    } finally {
      setLoading(false);
    }
  };

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
      setShowVerifyBox(false);
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
      <Stack.Screen options={{ title: "變更電子郵件" }} />

      <View style={styles.card}>
        <Text
          style={styles.currentText}
          accessible={true}
          accessibilityLabel={`目前電子郵件：${currentEmail || "載入中"}`}
        >
          目前電子郵件：{currentEmail || "載入中..."}
        </Text>
        {currentEmail ? (
          <Text style={[styles.verifyStatusText, emailVerified ? styles.verifiedText : styles.unverifiedText]}>
            {emailVerified ? "✓ 已驗證" : "尚未驗證"}
          </Text>
        ) : null}

        <Text style={styles.label}>新的電子郵件：</Text>
        <TextInput
          style={styles.input}
          value={newEmail}
          onChangeText={setNewEmail}
          placeholder="請輸入新電子郵件"
          placeholderTextColor="#8E8E93"
          keyboardType="email-address"
          autoCapitalize="none"
          accessible={true}
          accessibilityLabel="新電子郵件輸入框"
        />

        <TouchableOpacity
          style={[styles.saveButton, loading && styles.disabledButton]}
          onPress={handleSaveEmail}
          disabled={loading}
          accessible={true}
          accessibilityLabel="更新電子郵件按鈕"
          accessibilityRole="button"
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <View style={styles.buttonContent}>
              <Ionicons name="mail-outline" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.saveButtonText}>更新電子郵件</Text>
            </View>
          )}
        </TouchableOpacity>

        {showVerifyBox ? (
          <View style={styles.verifyBox}>
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
          </View>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: "#F2F2F7", padding: 20 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 20, padding: 20, borderWidth: 1, borderColor: "#E5E5EA" },
  currentText: { fontSize: 14, color: "#6C6C70", marginBottom: 4 },
  verifyStatusText: { fontSize: 13, fontWeight: "600", marginBottom: 16 },
  verifiedText: { color: "#34C759" },
  unverifiedText: { color: "#FF9500" },
  label: { fontSize: 15, fontWeight: "600", color: "#1C1C1E", marginBottom: 8 },
  input: { backgroundColor: "#F2F2F7", fontSize: 16, color: "#000000", paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: "#C7C7CC", marginBottom: 16 },
  saveButton: { backgroundColor: "hsl(0, 0%, 17%)", paddingVertical: 14, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: 8 },
  disabledButton: { backgroundColor: "#A2C8FF" },
  buttonContent: { flexDirection: "row", alignItems: "center" },
  saveButtonText: { fontSize: 16, fontWeight: "bold", color: "#FFFFFF" },
  verifyBox: { backgroundColor: "#F2F2F7", borderRadius: 12, padding: 14, marginTop: 24 },
  verifyCountdownText: { fontSize: 13, color: "#8E8E93", marginBottom: 10 },
  verifyExpiredText: { fontSize: 13, fontWeight: "600", color: "#FF3B30", marginBottom: 10 },
  resendLink: { marginTop: 10, alignItems: "center" },
  resendLinkText: { color: "#007AFF", fontSize: 14 },
});
