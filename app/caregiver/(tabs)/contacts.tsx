import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BASE_URL } from "../../../constants/config";

interface Contact {
  id: number;
  username: string;
  connection_id: number;
  role: string;
}

export default function CaregiverContactScreen() {
  const router = useRouter();
  const [monitoredClients, setMonitoredClients] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  // 每次進入頁面自動刷新好友列表
  const loadMonitoredClients = useCallback(async () => {
    setLoading(true);
    try {
      const data = await AsyncStorage.getItem("user");
      if (!data) return;
      const user = JSON.parse(data);
      const res = await fetch(`${BASE_URL}/contacts/${user.id}`);
      const result = await res.json();
      if (result.success) {
        setMonitoredClients(result.contacts);
      }
    } catch (e) {
      console.error("連線失敗:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadMonitoredClients();
    }, [loadMonitoredClients]),
  );

  const handleDelete = (connectionId: number, name: string) => {
    Alert.alert("刪除好友", `確定要刪除與「${name}」的綁定嗎？`, [
      { text: "取消", style: "cancel" },
      {
        text: "確定刪除",
        style: "destructive",
        onPress: async () => {
          try {
            const res = await fetch(`${BASE_URL}/reject-bind`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ connectionId }),
            });
            const result = await res.json();
            if (result.success) {
              setMonitoredClients((prev) =>
                prev.filter((c) => c.connection_id !== connectionId),
              );
            }
          } catch (e) {
            Alert.alert("錯誤", "無法刪除好友");
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push("/caregiver/bind")}
        >
          <Text style={styles.addBtnText}>+ 添加視障者好友</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>好友清單</Text>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="rgb(0, 0, 0)"
          style={{ marginTop: 50 }}
        />
      ) : (
        <FlatList
          data={monitoredClients}
          keyExtractor={(item) => item.connection_id.toString()}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.infoSection}>
                <Text style={styles.nameText}>{item.username}</Text>
              </View>

              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDelete(item.connection_id, item.username)}
              >
                <Text style={styles.deleteBtnText}>刪除</Text>
              </TouchableOpacity>
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>目前尚無綁定對象</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F2F7", paddingHorizontal: 20 },
  headerRow: { marginVertical: 20 },
  addBtn: {
    backgroundColor: "rgb(0, 0, 0)",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  addBtnText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1C1C1E",
    marginBottom: 15,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
    alignItems: "center",
  },
  infoSection: { flex: 1 },
  nameText: { fontSize: 18, fontWeight: "bold", color: "#1C1C1E" },
  roleTag: { fontSize: 13, color: "#8E8E93", marginTop: 4 },
  deleteBtn: {
    backgroundColor: "#FFE5E5",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  deleteBtnText: { color: "#FF3B30", fontWeight: "600", fontSize: 14 },
  emptyContainer: { alignItems: "center", marginTop: 80 },
  emptyText: { color: "#8E8E93", fontSize: 16 },
});
