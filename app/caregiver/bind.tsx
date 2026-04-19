import AsyncStorage from "@react-native-async-storage/async-storage";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { BASE_URL } from "../../constants/config";

const { width } = Dimensions.get("window");

export default function CaregiverBindScreen() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);
  const [scanAnim] = useState(new Animated.Value(0));

  // 1. 初始化取得使用者資料
  useEffect(() => {
    AsyncStorage.getItem("user").then(
      (data) => data && setUser(JSON.parse(data)),
    );
  }, []);

  // 2. 自動請求權限並開啟相機
  useEffect(() => {
    const initCamera = async () => {
      const { granted } = await requestPermission();
      if (granted) {
        setIsScanning(true);
      } else {
        Alert.alert("權限錯誤", "請在系統設定中開啟相機權限", [
          {
            text: "確定",
            onPress: () => router.replace("/caregiver/(tabs)/contacts"),
          },
        ]);
      }
    };
    initCamera();
  }, []);

  // 3. 掃描雷射動畫
  useEffect(() => {
    if (isScanning) {
      Animated.loop(
        Animated.timing(scanAnim, {
          toValue: 1,
          duration: 2500,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ).start();
    } else {
      scanAnim.setValue(0);
    }
  }, [isScanning]);

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    setIsScanning(false);
    try {
      const qrData = JSON.parse(data);
      if (qrData.type !== "BIND") {
        Alert.alert("錯誤", "無效的 QR Code", [
          { text: "重試", onPress: () => setIsScanning(true) },
        ]);
        return;
      }
      const res = await fetch(`${BASE_URL}/api/bind-direct`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ myId: user.id, targetId: qrData.uid }),
      });
      const result = await res.json();
      if (result.success) {
        Alert.alert("成功", `已成功與 ${qrData.name || "對方"} 完成綁定`);
        router.replace("/caregiver/(tabs)/contacts");
      } else {
        Alert.alert("提示", result.message, [
          {
            text: "確定",
            onPress: () => router.replace("/caregiver/(tabs)/contacts"),
          },
        ]);
      }
    } catch (e) {
      Alert.alert("解析失敗", "無法辨識此 QR Code 的內容", [
        { text: "重試", onPress: () => setIsScanning(true) },
      ]);
    }
  };

  return (
    <View style={styles.container}>
      {isScanning && (
        <View style={StyleSheet.absoluteFill}>
          <CameraView
            style={StyleSheet.absoluteFill}
            onBarcodeScanned={handleBarcodeScanned}
          />

          <View style={styles.overlayContainer}>
            <View style={styles.maskSide} />
            <View style={styles.maskCenterRow}>
              <View style={styles.maskSide} />
              <View style={styles.scanBox}>
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
                <Animated.View
                  style={[
                    styles.laserLine,
                    {
                      transform: [
                        {
                          translateY: scanAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, width * 0.7],
                          }),
                        },
                      ],
                    },
                  ]}
                />
              </View>
              <View style={styles.maskSide} />
            </View>
            <View
              style={[
                styles.maskSide,
                { alignItems: "center", paddingTop: 40 },
              ]}
            >
              <Text style={styles.scanHintText}>正在尋找 QR Code...</Text>
              <TouchableOpacity
                style={styles.enhancedCloseBtn}
                onPress={() => router.replace("/caregiver/(tabs)/contacts")}
              >
                <Text style={styles.enhancedCloseBtnText}>取消掃描</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  overlayContainer: { flex: 1, backgroundColor: "transparent" },
  maskSide: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)" },
  maskCenterRow: { flexDirection: "row", height: width * 0.7 },
  scanBox: {
    width: width * 0.7,
    height: width * 0.7,
    backgroundColor: "transparent",
    overflow: "hidden",
  },
  corner: {
    position: "absolute",
    width: 30,
    height: 30,
    borderColor: "#34C759",
    borderWidth: 6,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderBottomWidth: 0,
    borderRightWidth: 0,
    borderTopLeftRadius: 18,
  },
  topRight: {
    top: 0,
    right: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopRightRadius: 18,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomLeftRadius: 18,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderBottomRightRadius: 18,
  },
  laserLine: {
    width: "100%",
    height: 4,
    backgroundColor: "#34C759",
    shadowColor: "#34C759",
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 8,
  },
  scanHintText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: 1,
  },
  enhancedCloseBtn: {
    marginTop: 50,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingVertical: 14,
    paddingHorizontal: 45,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },
  enhancedCloseBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
