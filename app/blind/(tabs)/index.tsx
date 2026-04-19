import { useRouter } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity } from "react-native";

export default function BlindHome() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 實景偵測按鈕 */}
      <TouchableOpacity
        style={styles.listItem}
        onPress={() => router.push("/blind/camera")}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel="開啟實景偵測"
        accessibilityHint="點擊後將啟動相機進行 AI 環境偵測"
      >
        <Text style={styles.listText}>開啟實景偵測</Text>
        <Text style={styles.arrow} accessibilityLabel="下一步">
          〉
        </Text>
      </TouchableOpacity>

      {/* 聯絡人管理按鈕 */}
      <TouchableOpacity
        style={styles.listItem}
        onPress={() => router.push("/blind/contacts")}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel="聯絡人管理"
        accessibilityHint="點擊後將進入緊急聯絡人管理頁面"
      >
        <Text style={styles.listText}>聯絡人管理</Text>
        <Text style={styles.arrow} accessibilityLabel="下一步">
          〉
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F2F7" },
  content: { padding: 20, paddingTop: 40 },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 25,
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  listText: { flex: 1, fontSize: 20, fontWeight: "600", color: "#1C1C1E" },
  arrow: { fontSize: 20, color: "#C7C7CC", fontWeight: "bold" },
});
