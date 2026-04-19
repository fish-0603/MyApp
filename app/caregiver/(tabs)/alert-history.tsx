import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BASE_URL } from "../../../constants/config";

interface AlertEvent {
  id: number;
  name: string;
  event: string;
  time: string;
  latitude: string;
  longitude: string;
}

// 子組件：地址解析 (維持原邏輯)
function AddressText({ lat, lng }: { lat: string; lng: string }) {
  const [address, setAddress] = useState("地址讀取中...");

  useEffect(() => {
    (async () => {
      try {
        const result = await Location.reverseGeocodeAsync({
          latitude: parseFloat(lat),
          longitude: parseFloat(lng),
        });
        if (result.length > 0) {
          const item = result[0];
          setAddress(
            `${item.city || ""}${item.district || ""}${item.street || ""}`,
          );
        } else {
          setAddress("位置不明");
        }
      } catch (e) {
        setAddress("無法解析地址");
      }
    })();
  }, [lat, lng]);

  return <Text style={styles.detail}>📍 位置：{address}</Text>;
}

export default function AlertHistoryScreen() {
  const router = useRouter();
  const [history, setHistory] = useState<AlertEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHistory = async () => {
      const userData = await AsyncStorage.getItem("user");
      if (userData) {
        const user = JSON.parse(userData);
        try {
          const res = await fetch(`${BASE_URL}/sos-history/${user.id}`);
          const result = await res.json();
          if (result.success) {
            setHistory(result.requests);
          }
        } catch (e) {
          console.log("連線失敗：", e);
        }
      }
      setLoading(false);
    };
    loadHistory();
  }, []);

  const renderEventInfo = (eventCode: string) => {
    if (eventCode === "SOS_BUTTON") {
      return { label: "🔴 手動求助 (按鈕觸發)", color: "#FF3B30" };
    } else if (eventCode === "FALL_DETECTION") {
      return { label: "⚠️ 偵測跌倒 (模型識別)", color: "#FF9500" };
    }
    return { label: eventCode, color: "#666" };
  };

  const formatTime = (timeStr: string) => {
    const date = new Date(timeStr);
    return date.toLocaleString("zh-TW", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
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
          renderItem={({ item }) => {
            const eventInfo = renderEventInfo(item.event);
            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() =>
                  router.push({
                    pathname: "/caregiver/map-detail", // 導向最外層 Stack 頁面
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
                      🕒 時間：{formatTime(item.time)}
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
    backgroundColor: "#F0F9FF",
    paddingVertical: 6,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#E1F5FE",
  },
  mapHintText: { fontSize: 12, color: "#007AFF", fontWeight: "600" },
  emptyText: {
    textAlign: "center",
    color: "#8E8E93",
    marginTop: 100,
    fontSize: 16,
  },
});
