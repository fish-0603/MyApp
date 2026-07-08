import AsyncStorage from "@react-native-async-storage/async-storage";
import { useIsFocused } from "@react-navigation/native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Linking from "expo-linking";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import * as Speech from "expo-speech";
import React, { useEffect, useRef, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BASE_URL } from "../../../constants/config";

// 💡 動態引入原生模組，並做好防禦
let ExpoSpeechRecognitionModule: any = null;

try {
  const SpeechModule = require("expo-speech-recognition");
  ExpoSpeechRecognitionModule = SpeechModule.ExpoSpeechRecognitionModule;
} catch (e) {
  console.log("⚠️ 當前運行於 Expo Go 環境，原生語音監聽模組已安全跳過。");
}

const labelToChinese: { [key: string]: string } = {
  car: "前方有車輛",
  person: "前方有行人",
  obstacle: "注意，前方有障礙物",
  stair: "注意，前方有階梯",
};

export default function BlindCameraScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
  const [user, setUser] = useState<any>(null);
  const userRef = useRef<any>(null);

  const cameraRef = useRef<any>(null);
  const [infoText, setInfoText] = useState("AI 環境偵測中");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const lastSpokenText = useRef("");

  // 🚨 SOS 觸發前確認倒數
  const SOS_CONFIRM_SECONDS = 5;
  const [sosCountdown, setSosCountdown] = useState<number | null>(null);
  const sosPendingRef = useRef(false);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  // 🎙️ 麥克風權限被拒狀態
  const [micDenied, setMicDenied] = useState(false);
  const micDeniedRef = useRef(false);

  useEffect(() => {
    requestPermission();
  }, []);

  useEffect(() => {
    if (!isFocused) return;
    AsyncStorage.getItem("user").then((data) => {
      if (data) setUser(JSON.parse(data));
    });
  }, [isFocused]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const clearSosCountdown = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    sosPendingRef.current = false;
    setSosCountdown(null);
  };

  const cancelSosConfirmation = () => {
    if (!sosPendingRef.current) return;
    clearSosCountdown();
    Speech.stop();
    Speech.speak("已取消求救", { language: "zh-TW" });
  };

  const beginSosConfirmation = (triggerType: string) => {
    if (sosPendingRef.current) return;
    sosPendingRef.current = true;
    setSosCountdown(SOS_CONFIRM_SECONDS);

    Speech.stop();
    Speech.speak(
      `偵測到求救關鍵字，${SOS_CONFIRM_SECONDS} 秒後將自動撥打緊急電話，如不需要請說取消，或點擊畫面上的取消按鈕`,
      { language: "zh-TW" },
    );

    let remaining = SOS_CONFIRM_SECONDS;
    countdownIntervalRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearSosCountdown();
        handleSOS(triggerType);
        return;
      }
      setSosCountdown(remaining);
    }, 1000);
  };

  // 🛡️ 修正卡點：使用標準 useEffect 動態掛載語音監聽，徹底解決條件式 Hook 報錯
  useEffect(() => {
    if (!isFocused || !ExpoSpeechRecognitionModule) return;

    let cancelled = false;

    // 🎙️ 語音結果回傳處理
    const resultListener = ExpoSpeechRecognitionModule.addListener(
      "result",
      (e: any) => {
        const speechText = e.results[0]?.transcript || "";
        console.log("🎙️ 聽到的聲音：", speechText);

        if (sosPendingRef.current) {
          if (
            speechText.includes("取消") ||
            speechText.includes("不用了") ||
            speechText.includes("停止")
          ) {
            console.log("✅ 偵測到取消求救語音");
            cancelSosConfirmation();
          }
          return;
        }

        if (
          speechText.includes("救命") ||
          speechText.includes("幫我") ||
          speechText.includes("出事了") ||
          speechText.includes("緊急")
        ) {
          console.log("🚨 偵測到語音求救，進入確認倒數！");
          beginSosConfirmation("VOICE_TRIGGER");
        }
      },
    );

    // ⚠️ 權限或裝置錯誤處理
    const errorListener = ExpoSpeechRecognitionModule.addListener(
      "error",
      (e: any) => {
        console.warn("語音監聽錯誤:", e.error, e.message);
        if (e.error === "not-allowed" || e.error === "service-not-allowed") {
          micDeniedRef.current = true;
          setMicDenied(true);
        }
      },
    );

    // 🔄 斷開自動重連機制（權限被拒時不再自動重啟，避免無窮迴圈）
    const endListener = ExpoSpeechRecognitionModule.addListener("end", () => {
      if (isFocused && !micDeniedRef.current) startListening();
    });

    const startListening = async () => {
      try {
        const current = await ExpoSpeechRecognitionModule.getPermissionsAsync();
        let granted = current.granted;

        if (!granted) {
          const result =
            await ExpoSpeechRecognitionModule.requestPermissionsAsync();
          granted = result.granted;
        }

        if (cancelled) return;

        if (granted) {
          micDeniedRef.current = false;
          setMicDenied(false);
          ExpoSpeechRecognitionModule.start({
            lang: "zh-TW",
            interimResults: true,
          });
        } else {
          micDeniedRef.current = true;
          setMicDenied(true);
        }
      } catch (e) {
        console.error("語音啟動失敗:", e);
      }
    };

    startListening();

    // 🗑️ 清除 Effect：當頁面離開或關閉時，完整移除所有事件監聽與停止錄音
    return () => {
      cancelled = true;
      resultListener.remove();
      errorListener.remove();
      endListener.remove();
      if (ExpoSpeechRecognitionModule) ExpoSpeechRecognitionModule.stop();
      clearSosCountdown();
    };
  }, [isFocused]);

  // YOLO 每 3 秒定時抓取畫面
  useEffect(() => {
    if (!permission || !permission.granted || !isFocused) {
      Speech.stop();
      return;
    }

    const interval = setInterval(() => {
      captureAndSend();
    }, 3000);

    return () => {
      clearInterval(interval);
      Speech.stop();
    };
  }, [permission, user, isFocused]);

  const captureAndSend = async () => {
    if (!cameraRef.current || isAnalyzing || !isFocused || sosPendingRef.current)
      return;

    try {
      setIsAnalyzing(true);
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.4,
        shutterSound: false,
      });

      if (!photo || !photo.base64 || !isFocused) return;

      const currentUserId = user?.id || "test_user_123";

      const response = await fetch(`${BASE_URL}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUserId,
          image: photo.base64,
        }),
      });

      if (!response.ok) {
        console.warn("後端連線異常，狀態碼:", response.status);
        return;
      }

      const result = await response.json();
      console.log("AI 偵測結果:", result);

      if (result.success && result.label && isFocused) {
        const chineseObject = labelToChinese[result.label] || "未知物體";
        let message = `提示，${chineseObject}`;

        if (result.distance === "near") {
          message = `危險！${chineseObject}距離非常近`;
        }

        setInfoText(message);

        if (message !== lastSpokenText.current) {
          Speech.stop();
          lastSpokenText.current = message;
          Speech.speak(message, { language: "zh-TW", rate: 1.1 });
        }
      }
    } catch (error) {
      console.error("實景偵測傳輸失敗:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSOS = async (triggerType = "VOICE_TRIGGER") => {
    const activeUserId = userRef.current?.id || "test_user_123";

    try {
      Speech.stop();
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("權限不足", "請允許存取定位功能，以便發送緊急位置");
        return;
      }

      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = location.coords;

      const response = await fetch(`${BASE_URL}/sos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: activeUserId,
          latitude,
          longitude,
          eventType: triggerType,
        }),
      });

      const result = await response.json();
      console.log("SOS 後端回傳結果:", result);

      if (result.success) {
        Alert.alert("🚨 系統提示", `已透過語音求助發送位置通知`);
        Speech.speak("緊急求助已發送，正在為您撥打電話", { language: "zh-TW" });

        if (result.emergencyPhone) {
          Linking.openURL(`tel:${result.emergencyPhone}`);
        } else {
          Linking.openURL("tel:110");
        }
      } else {
        Alert.alert("SOS 失敗", result.message || "發送請求失敗");
      }
    } catch (error) {
      Alert.alert("錯誤", "無法執行 SOS 請求，請檢查網路或 GPS");
    }
  };

  if (!permission || !permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={{ fontSize: 18, marginBottom: 20, textAlign: "center" }}>
          Need camera permission to start discovery
        </Text>
        <TouchableOpacity
          onPress={requestPermission}
          style={styles.btn}
          accessible={true}
          accessibilityLabel="Authorize Camera"
          accessibilityRole="button"
        >
          <Text style={{ color: "#FFF", fontSize: 18, fontWeight: "bold" }}>
            Authorize Camera
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
      />

      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        {/* 返回按鈕 */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          accessible={true}
          accessibilityLabel="Back to previous page"
          accessibilityRole="button"
        >
          <Text style={styles.backText}>⬅ 返回</Text>
        </TouchableOpacity>

        {/* 語音求助引導說明區塊 */}
        {sosCountdown !== null ? (
          <View
            style={styles.voiceContainer}
            pointerEvents="box-none"
            accessible={true}
            accessibilityLiveRegion="assertive"
            accessibilityLabel={`偵測到求救關鍵字，${sosCountdown} 秒後將自動撥打緊急電話，如不需要請點擊取消`}
          >
            <Text style={styles.voiceIcon}>🚨</Text>
            <Text style={styles.voiceTitle}>{sosCountdown} 秒後將撥打緊急電話</Text>
            <Text style={styles.voiceDesc}>不需要請說「取消」，或點擊下方按鈕</Text>
            <TouchableOpacity
              style={styles.cancelSosBtn}
              onPress={cancelSosConfirmation}
              accessible={true}
              accessibilityLabel="取消求救"
              accessibilityRole="button"
            >
              <Text style={styles.cancelSosText}>取消求救</Text>
            </TouchableOpacity>
          </View>
        ) : micDenied ? (
          <View
            style={styles.voiceContainer}
            pointerEvents="box-none"
            accessible={true}
            accessibilityLabel="語音求救功能需要麥克風權限，請至系統設定開啟後返回此頁面。"
          >
            <Text style={styles.voiceIcon}>🔇</Text>
            <Text style={styles.voiceTitle}>語音求救未啟用</Text>
            <Text style={styles.voiceDesc}>需要麥克風權限才能監聽求救語音</Text>
            <TouchableOpacity
              style={styles.cancelSosBtn}
              onPress={() => Linking.openSettings()}
              accessible={true}
              accessibilityLabel="前往系統設定開啟麥克風權限"
              accessibilityRole="button"
            >
              <Text style={styles.cancelSosText}>前往設定開啟權限</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View
            style={styles.voiceContainer}
            pointerEvents="box-none"
            accessible={true}
            accessibilityLabel="語音監聽模式中。遭遇緊急狀況請直接喊出：救命、幫我、出事了、或是緊急，系統將自動定位並聯絡緊急聯絡人。"
          >
            <Text style={styles.voiceIcon}>🎙️</Text>
            <Text style={styles.voiceTitle}>語音守護監聽中</Text>
            <Text style={styles.voiceDesc}>遭遇危險時請直接大喊「救命」</Text>
          </View>
        )}

        {/* AI 狀態提示 */}
        <View
          style={styles.infoBox}
          accessible={true}
          accessibilityLiveRegion="assertive"
        >
          <Text style={styles.infoText}>{infoText}</Text>
          <Text style={styles.voiceHint}>
            {!ExpoSpeechRecognitionModule
              ? "ℹ️ Expo Go 環境下已預先載入無障礙標籤描述"
              : micDenied
                ? "⚠️ 麥克風權限未開啟，語音求救已暫停"
                : "🎙️ 全自動語音即時防護中"}
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F2F2F7",
  },
  btn: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    backgroundColor: "#007AFF",
    borderRadius: 12,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
    padding: 20,
  },
  backBtn: {
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 12,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  backText: { color: "#FFF", fontWeight: "bold" },
  voiceContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  voiceIcon: {
    fontSize: 80,
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  voiceTitle: {
    color: "#FF3B30",
    fontSize: 26,
    fontWeight: "bold",
    marginTop: 15,
    textShadowColor: "rgba(0, 0, 0, 1)",
    textShadowRadius: 6,
  },
  voiceDesc: {
    color: "#FFF",
    fontSize: 16,
    marginTop: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cancelSosBtn: {
    marginTop: 20,
    backgroundColor: "#FF3B30",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  cancelSosText: { color: "#FFF", fontSize: 18, fontWeight: "bold" },
  infoBox: {
    backgroundColor: "rgba(0,0,0,0.8)",
    padding: 20,
    borderRadius: 20,
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  infoText: {
    color: "#34C759",
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
  },
  voiceHint: { color: "#8E8E93", fontSize: 13, marginTop: 5 },
});
