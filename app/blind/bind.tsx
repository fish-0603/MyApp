import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

export default function BlindBindScreen() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  // 初始化取得使用者資料
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const data = await AsyncStorage.getItem("user");
        if (data) {
          setUser(JSON.parse(data));
        }
      } catch (error) {
        console.error("讀取使用者資料失敗:", error);
      }
    };
    fetchUser();
  }, []);

  if (!user) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* 設定標題，這裡會覆蓋 _layout 的全域標題設定 */}
      <Stack.Screen options={{ title: "添加聯絡人" }} />

      <View style={styles.innerContainer}>
        <Text style={styles.title}>我的 QR Code</Text>
        <Text style={styles.subtitle}>請將畫面出示給照護者掃描</Text>

        <View style={styles.qrCard}>
          <QRCode
            value={JSON.stringify({
              type: "BIND",
              uid: user.id,
              role: user.role,
              name: user.full_name,
            })}
            size={width * 0.65}
          />
          <Text style={styles.qrName}>{user.full_name}</Text>
        </View>

        {/* 修改：點擊後強制跳轉至聯絡人列表頁並清除導航堆疊 */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.replace("/blind/contacts")}
        >
          <Text style={styles.backBtnText}>取消</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  innerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1C1C1E",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#8E8E93",
    marginBottom: 40,
    textAlign: "center",
  },
  qrCard: {
    padding: 35,
    backgroundColor: "#fff",
    borderRadius: 40,
    alignItems: "center",
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    marginBottom: 60,
  },
  qrName: {
    marginTop: 20,
    fontWeight: "bold",
    fontSize: 28,
    color: "#1C1C1E",
  },
  backBtn: {
    backgroundColor: "#E5E5EA",
    paddingVertical: 20,
    borderRadius: 16,
    width: "100%",
    alignItems: "center",
  },
  backBtnText: { color: "#1C1C1E", fontSize: 18, fontWeight: "bold" },
});
