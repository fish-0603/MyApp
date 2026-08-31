import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { authFetch } from "../../../utils/api";

interface AlertEvent {
  id: number;
  name: string;
  event: string;
  time: string;
  latitude: string;
  longitude: string;
}

// 獨立組件：地址解析 (優化效能)
function AddressText({ lat, lng }: { lat: string; lng: string }) {
  const [address, setAddress] = useState("地址讀取中...");

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const result = await Location.reverseGeocodeAsync({
          latitude: parseFloat(lat),
          longitude: parseFloat(lng),
        });
        if (isMounted && result.length > 0) {
          const item = result[0];
          setAddress(
            `${item.city || ""}${item.district || ""}${item.street || ""}`,
          );
        } else if (isMounted) {
          setAddress("位置不明");
        }
      } catch (e) {
        if (isMounted) setAddress("無法解析地址");
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [lat, lng]);

  return <Text style={styles.detail}>📍 位置：{address}</Text>;
}

export default function AlertHistoryScreen() {
  const router = useRouter();
  const [history, setHistory] = useState<AlertEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadHistory = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const userData = await AsyncStorage.getItem("user");
      if (!userData) return;

      const user = JSON.parse(userData);
      const res = await authFetch(`/sos-history/${user.id}`);

      // 檢查 HTTP 狀態碼，防止 HTML 錯誤頁面導致 JSON 解析崩潰
      if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);

      const result = await res.json();
      console.log("後端回傳的資料:", result);
      if (result.success) {
        setHistory(result.requests || []);
      }
    } catch (e) {
      console.error("載入失敗：", e);
      Alert.alert("讀取失敗", "無法連線至歷史紀錄伺服器");
    } finally {
      if (isRefresh) setRefreshing(false);
      else setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const renderEventInfo = (code: string) => {
    // 非 VOICE_TRIGGER 都算 AI 自動偵測（NO_TERRAIN_DETECTED/BLACK_SCREEN_DETECTED/舊資料的
    // FALL_DETECTION），對照護者來說是哪個訊號觸發的不重要，統一顯示同一個標籤
    if (code === "VOICE_TRIGGER")
      return { label: "🔴 語音主動觸發", color: "#FF3B30" };
    return { label: "⚠️ 影像識別可能跌倒", color: "#FF9500" };
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>緊急事件紀錄</Text>
      {loading ? (
        <ActivityIndicator
          size="large"
          color="#FF3B30"
          style={{ marginTop: 50 }}
        />
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadHistory(true)}
            />
          }
          renderItem={({ item }) => {
            const eventInfo = renderEventInfo(item.event);
            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() =>
                  router.push({
                    pathname: "/caregiver/map-detail",
                    params: {
                      name: item.name,
                      lat: item.latitude,
                      lng: item.longitude,
                      time: item.time,
                    },
                  })
                }
              >
                <View style={styles.cardContent}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.name, { color: eventInfo.color }]}>
                      {item.name}
                    </Text>
                    <Text style={styles.eventLabel}>{eventInfo.label}</Text>
                    <Text style={styles.detail}>
                      🕒 時間：
                      {new Date(item.time).toLocaleString("zh-TW", {
                        hour12: false,
                      })}
                    </Text>
                    <AddressText lat={item.latitude} lng={item.longitude} />
                  </View>
                  <Text style={styles.arrow}>〉</Text>
                </View>
                <View style={styles.mapHint}>
                  <Text style={styles.mapHintText}>點擊查看事發地點地圖</Text>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>目前尚無求助紀錄</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  /* 樣式維持不變 */
  container: { flex: 1, backgroundColor: "#F2F2F7", paddingHorizontal: 20 },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginVertical: 20,
    color: "#1C1C1E",
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: "hidden",
  },
  cardContent: {
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: { fontSize: 18, fontWeight: "bold" },
  eventLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 4,
    marginBottom: 8,
  },
  detail: { color: "#3A3A3C", marginTop: 4, fontSize: 14 },
  arrow: { fontSize: 18, color: "#C7C7CC", fontWeight: "bold", marginLeft: 10 },
  mapHint: {
    backgroundColor: "#dddddd",
    paddingVertical: 6,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "hsl(0, 0%, 84%)",
  },
  mapHintText: { fontSize: 12, color: "rgb(0, 0, 0)", fontWeight: "600" },
  emptyText: {
    textAlign: "center",
    color: "#8E8E93",
    marginTop: 100,
    fontSize: 16,
  },
});
