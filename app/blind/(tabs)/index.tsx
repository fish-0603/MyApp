import { useRouter } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity } from "react-native";

export default function BlindHome() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity
        style={styles.listItem}
        onPress={() => router.push("/blind/camera")}
      >
        <Text style={styles.listText}>開啟實景偵測</Text>
        <Text style={styles.arrow}>〉</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.listItem}
        onPress={() => router.push("/blind/contacts")}
      >
        <Text style={styles.listText}>聯絡人管理</Text>
        <Text style={styles.arrow}>〉</Text>
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
  listIcon: { fontSize: 32, marginRight: 20 },
  listText: { flex: 1, fontSize: 20, fontWeight: "600", color: "#1C1C1E" },
  arrow: { fontSize: 20, color: "#C7C7CC", fontWeight: "bold" },
});
