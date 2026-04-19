import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React from "react";
import { Alert, Button, StyleSheet, View } from "react-native";

export default function BlindSettingsScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Button
        title="登出系統"
        color="#FF3B30"
        onPress={() => {
          Alert.alert("確認", "確定要登出嗎？", [
            { text: "取消" },
            {
              text: "登出",
              onPress: async () => {
                await AsyncStorage.clear();
                router.replace("/");
              },
            },
          ]);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20 },
});
