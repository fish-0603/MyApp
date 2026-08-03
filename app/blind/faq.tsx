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

// 支援 Android 手風琴展開動畫效果
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// 盲人端常見問題內容
const BLIND_FAQS = [
  {
    id: "1",
    question: "1. 如何綁定好友？",
    answer:
      "請再聯絡人頁面點擊「添加聯絡人」，將您的個人 QRCode 給照護者掃描，即可完成綁定。",
  },
  {
    id: "2",
    question: "2. 無法傳送通知？",
    answer:
      "請確認您的手機已連接行動網路或 Wi-Fi。若網路正常但無法發送，請檢查手機「設定」>「應用程式」> 本 App，確認已開啟通知權限。",
  },
  {
    id: "3",
    question: "3. 實景偵測(相機)無法使用？",
    answer:
      "請至手機的「設定」>「隱私權與安全性」/「應用程式」> 找到本 App，確認已允許「相機權限」。若權限已開啟仍無法使用，請試著重新開啟 App或重新啟動權限。",
  },
];

export default function BlindFAQScreen() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
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

        {BLIND_FAQS.map((item) => {
          const isExpanded = expandedId === item.id;

          return (
            <View key={item.id} style={styles.card}>
              {/* 問題點擊標題 */}
              <TouchableOpacity
                style={styles.questionHeader}
                onPress={() => toggleExpand(item.id)}
                activeOpacity={0.7}
                accessible={true}
                accessibilityRole="button"
                accessibilityState={{ expanded: isExpanded }}
                accessibilityHint={isExpanded ? "點擊以收合回答" : "點擊以展開回答"}
              >
                <Text style={styles.questionText}>{item.question}</Text>
                <Ionicons
                  name={isExpanded ? "chevron-up" : "chevron-down"}
                  size={22}
                  color="#8E8E93"
                />
              </TouchableOpacity>

              {/* 下拉答案內容 */}
              {isExpanded && (
                <View style={styles.answerContainer}>
                  <Text
                    style={styles.answerText}
                    accessible={true}
                    accessibilityRole="text"
                  >
                    {item.answer}
                  </Text>
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
    paddingBottom: 40,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#8E8E93",
    marginBottom: 12,
    marginLeft: 4,
  },
  // 照護端同款柔和陰影與圓角卡片風格
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
    overflow: "hidden",
  },
  questionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
  },
  questionText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1C1C1E",
    flex: 1,
    marginRight: 10,
  },
  answerContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F2F2F7",
    backgroundColor: "#FFFFFF",
  },
  answerText: {
    fontSize: 16,
    fontWeight: "normal",
    color: "#3A3A3C",
    lineHeight: 24,
  },
});