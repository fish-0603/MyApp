import { Ionicons } from "@expo/vector-icons";
import { Href, useRouter } from "expo-router";
import React, { useRef } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function ProfileEditIndexScreen() {
  const router = useRouter();
  const isNavigating = useRef(false);

  const safeNavigate = (path: string) => {
    if (isNavigating.current) return;
    isNavigating.current = true;

    // 用 navigate 代替 push，避免快速點擊時 Native Stack 狀態失步
    router.navigate(path as Href);

    setTimeout(() => {
      isNavigating.current = false;
    }, 600);
  };

  const menuItems = [
    {
      id: "name",
      title: "修改名稱",
      icon: "person-outline",
      path: "/blind/profile-edit/edit-name",
      hint: "點擊以修改您的顯示名稱",
    },
    {
      id: "email",
      title: "變更電子郵件",
      icon: "mail-outline",
      path: "/blind/profile-edit/edit-email",
      hint: "點擊以更新您的電子郵件",
    },
    {
      id: "verify-email",
      title: "驗證電子郵件",
      icon: "shield-checkmark-outline",
      path: "/blind/profile-edit/verify-email",
      hint: "點擊以驗證您目前的電子郵件",
    },
    {
      id: "password",
      title: "變更密碼",
      icon: "key-outline",
      path: "/blind/profile-edit/edit-password",
      hint: "點擊以設定新密碼",
    },
  ];

  return (
    <KeyboardAvoidingView
      style={styles.mainContainer}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.card}>
        {menuItems.map((item, index) => (
          <React.Fragment key={item.id}>
            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => safeNavigate(item.path)}
              activeOpacity={0.7}
              accessible={true}
              accessibilityLabel={item.title}
              accessibilityHint={item.hint}
              accessibilityRole="button"
            >
              <View style={styles.optionLeft}>
                <Ionicons
                  name={item.icon as any}
                  size={20}
                  color="#1C1C1E"
                  style={styles.optionIcon}
                />
                <Text style={styles.optionText}>{item.title}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
            </TouchableOpacity>

            {index < menuItems.length - 1 && <View style={styles.divider} />}
          </React.Fragment>
        ))}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#F2F2F7",
    padding: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  optionIcon: {
    marginRight: 12,
  },
  optionText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1C1C1E",
  },
  divider: {
    height: 1,
    backgroundColor: "#F2F2F7",
  },
});
