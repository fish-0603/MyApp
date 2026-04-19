import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
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

export default function ContactListScreen() {
  const router = useRouter();
  const [contacts, setContacts] = useState<any[]>([]);
  const [userId, setUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const data = await AsyncStorage.getItem("user");
      if (!data) return;

      const user = JSON.parse(data);
      setUserId(user.id);

      const url = `${BASE_URL}/contacts/${user.id}`;
      const res = await fetch(url);
      const text = await res.text();

      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}");
      const cleanJson = text.substring(jsonStart, jsonEnd + 1);

      const result = JSON.parse(cleanJson);
      if (result.success) {
        setContacts(result.contacts);
      }
    } catch (e) {
      console.error("載入失敗:", e);
      Alert.alert("連線錯誤", "無法解析伺服器回應");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContacts();
  }, []);

  const emergencyPerson = contacts.find((c) => c.is_emergency);

  const handleDeleteContact = (connectionId: number, name: string) => {
    Alert.alert("刪除聯絡人", `確定要解除與「${name}」的綁定關係嗎？`, [
      { text: "取消", style: "cancel" },
      {
        text: "確定刪除",
        style: "destructive",
        onPress: async () => {
          const res = await fetch(`${BASE_URL}/reject-bind`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ connectionId }),
          });
          if ((await res.json()).success) loadContacts();
        },
      },
    ]);
  };

  const handleSetEmergency = (connectionId: number, name: string) => {
    if (emergencyPerson) {
      Alert.alert(
        "提醒",
        `請先取消目前緊急聯絡人「${emergencyPerson.username}」`,
      );
      return;
    }
    Alert.alert("確認設定", `是否確定將「${name}」設為緊急聯絡人？`, [
      { text: "取消", style: "cancel" },
      {
        text: "確定設定",
        onPress: async () => {
          const res = await fetch(`${BASE_URL}/set-emergency`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ blindId: userId, connectionId }),
          });
          if ((await res.json()).success) {
            loadContacts();
            Alert.alert("成功", "設定完成");
          }
        },
      },
    ]);
  };

  const handleRemoveEmergency = (connectionId: number) => {
    Alert.alert("取消設定", "確定要取消此緊急聯絡人嗎？", [
      { text: "保留", style: "cancel" },
      {
        text: "確定取消",
        style: "destructive",
        onPress: async () => {
          const res = await fetch(`${BASE_URL}/set-emergency`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ blindId: userId, connectionId: -1 }),
          });
          if ((await res.json()).success) loadContacts();
        },
      },
    ]);
  };

  const ContactRow = ({
    item,
    isEmergency = false,
  }: {
    item: any;
    isEmergency?: boolean;
  }) => (
    <View
      style={[styles.card, isEmergency && styles.emergencyCard]}
      accessible={true}
    >
      <View style={styles.nameSection}>
        <Text style={styles.nameText}>{item.username}</Text>
        <Text style={styles.phoneText}>{item.phone}</Text>
      </View>
      <View style={styles.actionSection}>
        {isEmergency ? (
          <TouchableOpacity
            style={styles.removeBtn}
            onPress={() => handleRemoveEmergency(item.connection_id)}
            accessibilityRole="button"
            accessibilityLabel={`取消緊急聯絡人，${item.username}`}
          >
            <Text style={styles.removeBtnText}>取消緊急</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              style={styles.setBtn}
              onPress={() =>
                handleSetEmergency(item.connection_id, item.username)
              }
              accessibilityRole="button"
              accessibilityLabel={`將 ${item.username} 設為緊急聯絡人`}
            >
              <Text style={styles.setBtnText}>設為緊急</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() =>
                handleDeleteContact(item.connection_id, item.username)
              }
              accessibilityRole="button"
              accessibilityLabel={`刪除聯絡人，${item.username}`}
            >
              <Text style={styles.deleteBtnText}>刪除</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push("/blind/bind")}
          accessibilityRole="button"
          accessibilityLabel="添加新聯絡人"
        >
          <Text style={styles.addBtnText}>添加聯絡人</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#007AFF"
          style={{ marginTop: 50 }}
        />
      ) : (
        <FlatList
          data={contacts.filter((c) => !c.is_emergency)}
          keyExtractor={(item: any) => item.id.toString()}
          ListHeaderComponent={
            <View>
              <Text style={styles.sectionTitle} accessibilityRole="header">
                🔴 當前緊急聯絡人
              </Text>
              {emergencyPerson ? (
                <ContactRow item={emergencyPerson} isEmergency={true} />
              ) : (
                <View
                  style={styles.emptyCard}
                  accessible={true}
                  accessibilityLabel="目前無緊急聯絡人"
                >
                  <Text style={styles.emptyText}>尚未設定</Text>
                </View>
              )}
              <Text
                style={[styles.sectionTitle, { marginTop: 25 }]}
                accessibilityRole="header"
              >
                👥 所有聯絡人名單
              </Text>
            </View>
          }
          renderItem={({ item }) => <ContactRow item={item} />}
          ListEmptyComponent={
            <Text style={styles.emptySubText}>目前沒有好友</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F2F7", paddingHorizontal: 16 },
  headerRow: { marginVertical: 16 },
  addBtn: {
    backgroundColor: "#007AFF",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
  },
  addBtnText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1C1C1E",
    marginBottom: 12,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    alignItems: "center",
    justifyContent: "space-between",
  },
  emergencyCard: {
    borderWidth: 2,
    borderColor: "#FF3B30",
    backgroundColor: "#FFF5F5",
  },
  nameSection: { flex: 1 },
  nameText: { fontSize: 17, fontWeight: "600", color: "#1C1C1E" },
  phoneText: { fontSize: 14, color: "#8E8E93", marginTop: 2 },
  actionSection: { flexDirection: "row", alignItems: "center" },
  setBtn: {
    backgroundColor: "#E5E5EA",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginRight: 8,
  },
  setBtnText: { color: "#007AFF", fontSize: 14, fontWeight: "600" },
  removeBtn: {
    backgroundColor: "#FF3B30",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  removeBtnText: { color: "#FFF", fontSize: 14, fontWeight: "600" },
  deleteBtn: {
    backgroundColor: "#FF3B30",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  deleteBtnText: { color: "#FFF", fontSize: 14, fontWeight: "600" },
  emptyCard: {
    padding: 20,
    backgroundColor: "#FFF",
    borderRadius: 12,
    alignItems: "center",
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "#C7C7CC",
  },
  emptyText: { color: "#8E8E93" },
  emptySubText: { textAlign: "center", color: "#C7C7CC", marginTop: 40 },
});
