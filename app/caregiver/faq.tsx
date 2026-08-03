import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import React, { useState } from "react";
import {
    LayoutAnimation,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    UIManager,
    View,
} from "react-native";

// 支援 Android 手風琴動畫效果
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// 照護端常見問題內容
const CARE_GIVER_FAQS = [
  {
    id: "1",
    question: "1. 如何綁定好友？",
    answer:
      "請在好友清單頁面點擊「添加視障者好友」，掃描對方 QRCode 發送請求，即可完成雙向綁定。",
  },
  {
    id: "2",
    question: "2. 接收不到通知？",
    answer:
      "請檢查並確認以下手機設定：\n\n1. 系統通知權限：請至手機「設定」>「應用程式」> 本 App，確認已開啟「允許通知」。\n2. 電池最佳化：請關閉本 App 的電池最佳化限制，避免手機在背景暫停運作。\n3. 網路環境：請確保手機行動網路或 Wi-Fi 連線正常。",
  },
  {
    id: "3",
    question: "3. 一個帳號可以綁定多位視障者嗎？",
    answer: "可以。您可以在好友清單頁面同時新增多位視障親友；視障者端也可以同時綁定多位家屬照護者。"
  }
];

export default function CaregiverFAQScreen() {
  // 💡 紀錄目前開啓的問題 ID，為 null 時代表全部收合
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    // 觸發流暢的展開/收合動畫
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    // 如果點擊已展開的問題，則設為 null (收合)；否則切換為點擊的問題 ID (展開該問題，並自動收合其他的)
    setExpandedId((prevId) => (prevId === id ? null : id));
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "常見問題與說明",
          headerTitleStyle: { fontSize: 20, fontWeight: "bold" },
          headerBackTitle: "返回",
        }}
      />

      <ScrollView contentContainerStyle={styles.contentContainer}>
        <Text style={styles.headerTitle}>常見問題與說明</Text>

        {CARE_GIVER_FAQS.map((item) => {
          const isExpanded = expandedId === item.id;

          return (
            <View key={item.id} style={styles.card}>
              {/* 問題點擊標題 */}
              <TouchableOpacity
                style={styles.questionHeader}
                onPress={() => toggleExpand(item.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.questionText}>{item.question}</Text>
                <Ionicons
                  name={isExpanded ? "chevron-up" : "chevron-down"}
                  size={22}
                  color="#6C6C70"
                />
              </TouchableOpacity>

              {/* 下拉答案內容 (單獨展開) */}
              {isExpanded && (
                <View style={styles.answerContainer}>
                  <Text style={styles.answerText}>{item.answer}</Text>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7",
  },
  contentContainer: {
    padding: 20,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6C6C70",
    marginBottom: 12,
    marginLeft: 4,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    overflow: "hidden",
  },
  questionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 18,
    backgroundColor: "#FFFFFF",
  },
  questionText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1C1C1E",
    flex: 1,
    marginRight: 10,
  },
  answerContainer: {
    paddingHorizontal: 18,
    paddingBottom: 18,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F2F2F7",
    backgroundColor: "#FAFAFC",
  },
  answerText: {
    fontSize: 16,
    color: "#3A3A3C",
    lineHeight: 24,
  },
});