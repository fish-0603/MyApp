import AsyncStorage from "@react-native-async-storage/async-storage";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Linking from "expo-linking";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
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
    if (!user) return;
    try {
      let location = await Location.getCurrentPositionAsync({});

      const response = await fetch(`${BASE_URL}/sos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          eventType: "BUTTON_SOS", // 已改為按鈕觸發
        }),
      });

      const result = await response.json();

      if (result.success && result.emergencyPhone) {
        if (Platform.OS === "android") {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.CALL_PHONE,
          );
          if (granted === PermissionsAndroid.RESULTS.GRANTED) {
            Linking.sendIntent("android.intent.action.CALL", [
              { key: "data", value: `tel:${result.emergencyPhone}` },
            ]);
          } else {
            Linking.openURL(`tel:${result.emergencyPhone}`);
          }
        } else {
          Linking.openURL(`tel:${result.emergencyPhone}`);
        }
      } else {
        Alert.alert("🚨 SOS", "已送出通知，但未設定聯絡人");
      }
    } catch (error) {
      Alert.alert("錯誤", "無法執行 SOS 請求，請檢查網路");
    }
  };

  if (!permission || !permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={{ fontSize: 18 }}>需要相機權限</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.btn}>
          <Text style={{ color: "#FFF" }}>開啟授權</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView style={StyleSheet.absoluteFill} facing="back" />
      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>⬅ 返回</Text>
        </TouchableOpacity>

        {/* SOS 大按鈕 */}
        <View style={styles.sosContainer}>
          <TouchableOpacity style={styles.sosBtn} onPress={handleSOS}>
            <Text style={styles.sosEmoji}>🆘</Text>
            <Text style={styles.sosText}>緊急求助</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  btn: {
    padding: 15,
    backgroundColor: "#007AFF",
    borderRadius: 10,
    marginTop: 20,
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
    width: 200,
    height: 200,
    borderRadius: 100,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 5,
    borderColor: "#FFF",
  },
  sosEmoji: { fontSize: 60 },
  sosText: { color: "#FFF", fontSize: 24, fontWeight: "bold", marginTop: 5 },
});
