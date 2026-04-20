import AsyncStorage from "@react-native-async-storage/async-storage";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Linking from "expo-linking";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BASE_URL } from "../../../constants/config";

export default function BlindCameraScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    AsyncStorage.getItem("user").then((data) => {
      if (data) setUser(JSON.parse(data));
    });
    requestPermission();
  }, []);

  const handleSOS = async () => {
    if (!user) {
      Alert.alert("提示", "請先完成使用者設定");
      return;
    }

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("權限不足", "請允許存取定位功能，以便發送緊急位置");
        return;
      }

      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = location.coords;

      const response = await fetch(`${BASE_URL}/sos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          latitude,
          longitude,
          eventType: "SOS_BUTTON",
        }),
      });

      const result = await response.json();
      console.log("後端回傳結果:", result);

      if (result.success) {
        Alert.alert("🚨 系統提示", "已發送位置通知給所有聯絡人");
        if (result.emergencyPhone) {
          const phoneUrl = `tel:${result.emergencyPhone}`;
          Linking.openURL(phoneUrl);
        } else {
          Alert.alert("提醒", "未設定緊急聯絡人，請至設定頁面確認");
        }
      } else {
        Alert.alert("SOS 失敗", result.message || "發送請求失敗");
      }
    } catch (error) {
      Alert.alert("錯誤", "無法執行 SOS 請求，請檢查網路連線或 GPS");
    }
  };

  if (!permission || !permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={{ fontSize: 18, marginBottom: 20, textAlign: "center" }}>
          需要相機權限以啟動功能
        </Text>
        <TouchableOpacity
          onPress={requestPermission}
          style={styles.btn}
          accessible={true}
          accessibilityLabel="授權相機權限按鈕"
          accessibilityRole="button"
        >
          <Text style={{ color: "#FFF", fontSize: 18, fontWeight: "bold" }}>
            授權相機
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView style={StyleSheet.absoluteFill} facing="back" />

      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        {/* 返回按鈕 */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          accessible={true}
          accessibilityLabel="返回上一頁"
          accessibilityRole="button"
        >
          <Text style={styles.backText}>⬅ 返回</Text>
        </TouchableOpacity>

        {/* SOS 按鈕：給予高度語意化標籤 */}
        <View style={styles.sosContainer} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.sosBtn}
            onPress={handleSOS}
            accessible={true}
            accessibilityLabel="緊急求助 SOS 按鈕"
            accessibilityHint="點擊後將發送位置給緊急聯絡人並進行撥號"
            accessibilityRole="button"
          >
            <Text style={styles.sosEmoji} accessibilityLabel="SOS">
              🆘
            </Text>
            <Text style={styles.sosText}>緊急求助</Text>
          </TouchableOpacity>
        </View>

        {/* AI 狀態提示：使用 accessibilityLiveRegion 讓螢幕閱讀器自動播報狀態更新 */}
        <View
          style={styles.infoBox}
          accessible={true}
          accessibilityLiveRegion="polite"
        >
          <Text style={styles.infoText}>AI 環境偵測中</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },

  center: {
    flex: 1,

    justifyContent: "center",

    alignItems: "center",

    backgroundColor: "#F2F2F7",
  },

  btn: {
    paddingVertical: 15,

    paddingHorizontal: 30,

    backgroundColor: "#007AFF",

    borderRadius: 12,
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,

    justifyContent: "space-between",

    padding: 20,
  },

  backBtn: {
    backgroundColor: "rgba(0,0,0,0.6)",

    padding: 12,

    borderRadius: 10,

    alignSelf: "flex-start",
  },

  backText: { color: "#FFF", fontWeight: "bold" },

  sosContainer: { flex: 1, justifyContent: "center", alignItems: "center" },

  sosBtn: {
    backgroundColor: "rgba(255, 59, 48, 0.95)",

    width: 240,

    height: 240,

    borderRadius: 120,

    justifyContent: "center",

    alignItems: "center",

    borderWidth: 8,

    borderColor: "#FFF",

    elevation: 10,

    shadowColor: "#000",

    shadowOffset: { width: 0, height: 5 },

    shadowOpacity: 0.3,

    shadowRadius: 10,
  },

  sosEmoji: { fontSize: 70 },

  sosText: { color: "#FFF", fontSize: 28, fontWeight: "bold", marginTop: 10 },

  infoBox: {
    backgroundColor: "rgba(0,0,0,0.8)",

    padding: 20,

    borderRadius: 20,

    alignItems: "center",

    marginBottom: 10,

    borderWidth: 1,

    borderColor: "rgba(255,255,255,0.2)",
  },

  infoText: { color: "#34C759", fontSize: 22, fontWeight: "bold" },
});
