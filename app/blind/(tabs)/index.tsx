import AsyncStorage from "@react-native-async-storage/async-storage";
import { useIsFocused } from "@react-navigation/native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Linking from "expo-linking";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import * as Speech from "expo-speech";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  NativeModules,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { authFetch } from "../../../utils/api";

// SOS 求救時要直接撥出去，不能只是打開撥號盤讓使用者自己再按一次撥打鍵。
// Android 用原生模組 DirectCallModule（ACTION_CALL）直接撥號；
// iOS 因系統限制無論如何都無法略過使用者確認，只能開啟撥號盤（Linking 的 tel:）。
async function placeEmergencyCall(phoneNumber: string) {
  if (Platform.OS === "android" && NativeModules.DirectCallModule) {
    try {
      await NativeModules.DirectCallModule.call(phoneNumber);
      return;
    } catch (e) {
      console.warn("直接撥號失敗，改為開啟撥號盤:", e);
    }
  }
  Linking.openURL(`tel:${phoneNumber}`);
}

// 💡 動態引入原生模組，並做好防禦
let ExpoSpeechRecognitionModule: any = null;

try {
  const SpeechModule = require("expo-speech-recognition");
  ExpoSpeechRecognitionModule = SpeechModule.ExpoSpeechRecognitionModule;
} catch (e) {
  console.log("⚠️ 當前運行於 Expo Go 環境，原生語音監聽模組已安全跳過。");
}

const ZONE_ZH: Record<string, string> = {
  left: "左邊",
  middle: "中間",
  right: "右邊",
};

export default function BlindCameraScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
  const [user, setUser] = useState<any>(null);
  const userRef = useRef<any>(null);

  const cameraRef = useRef<any>(null);
  const [infoText, setInfoText] = useState("AI 環境偵測中");
  // setInterval 綁定的 captureAndSend 是舊 render 留下的閉包，若改用 state 判斷是否正在分析中，
  // 讀到的永遠是效果建立當下那個值、不會隨後續 render 更新，防止重疊呼叫形同虛設，
  // 所以改用 ref（跟 sosPendingRef 一樣的做法）確保讀到的一定是最新狀態
  const isAnalyzingRef = useRef(false);
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

  // 進場檢查（緊急聯絡人是否綁定＋三項權限）是否已跑完並把播報講完；
  // 拍照分析迴圈跟語音監聽都要等這個變 true 才開始，避免跟進場播報搶著出聲/搶著監聽
  const [entryChecksDone, setEntryChecksDone] = useState(false);
  // 進場檢查發現缺少的權限中文名稱清單，非空時畫面顯示可重試橫幅
  const [permissionWarning, setPermissionWarning] = useState<string[]>([]);
  // 進場檢查發現尚未綁定緊急聯絡人
  const [contactWarning, setContactWarning] = useState(false);
  // 讓畫面上的「重新開啟權限」按鈕可以呼叫到進場檢查 effect 裡定義的重跑函式
  const retryEntryChecksRef = useRef<() => void>(() => {});

  // 原本 5 秒一次對移動中的使用者太慢，先抓 2 秒當起點，之後依實測調整
  const CAPTURE_INTERVAL_MS = 2000;
  // 照片序號，方便在 Node/Python log 對照是哪一張照片產生的結果
  const frameIdRef = useRef(0);
  // 辨識結果從拍照到回來超過這個秒數就不播報（不影響下面的自動求救計數）
  const RESULT_TTL_SECONDS = 2.0;

  // 環境異常自動求救：兩種訊號各自連續達到這個次數（≈60 秒，隨拍照間隔動態換算）才觸發求救倒數；
  // 全黑畫面優先判斷，避免同一次全黑同時被兩邊計數
  const AUTO_SOS_STREAK_NEEDED = Math.round(60000 / CAPTURE_INTERVAL_MS);
  // 連續一分鐘沒偵測到斑馬線／路緣／草地／馬路／人行道
  const noTerrainStreakRef = useRef(0);
  // 連續一分鐘畫面幾乎全黑（手機掉進口袋、螢幕貼地）
  const blackFrameStreakRef = useRef(0);

  // 每次「進入」畫面（focus，不只是第一次掛載）都要重跑一輪進場檢查：
  //   1) 是否已綁定緊急聯絡人 2) 相機／麥克風／定位三項權限是否都已開啟
  // 用語音（不是畫面文字，視障者看不到）依序播報缺少的項目；全部就緒的話播報可以喊哪些
  // 關鍵字觸發語音求救。播報全部結束後才把 entryChecksDone 設 true——拍照分析迴圈跟語音
  // 監聽都要等這個變 true 才開始，避免跟這裡的進場播報同時搶著出聲/搶著監聽。
  //
  // 權限缺少時不導去系統設定 App（那樣要離開 app），改成只用 request 系列函式重新跳出
  // 系統權限請求彈窗（彈窗蓋在 app 上，不會切到設定 App），並在畫面上顯示可重按的橫幅。
  useEffect(() => {
    if (!isFocused) return;
    let cancelled = false;

    // 重新進入畫面：清掉上一輪殘留的播報內容/倒數/跌倒計數，這一輪的檢查結果出來前
    // 先把「已就緒」狀態收回，拍照分析跟語音監聽會因此自動暫停，等這輪檢查播報完再恢復
    Speech.stop();
    setInfoText("AI 環境偵測中");
    lastSpokenText.current = "";
    noTerrainStreakRef.current = 0;
    blackFrameStreakRef.current = 0;
    clearSosCountdown();
    setEntryChecksDone(false);
    setPermissionWarning([]);
    setContactWarning(false);

    const requestAllPermissions = async () => {
      // 1. 相機：AI 障礙偵測必須
      const cameraResult = permission?.granted ? permission : await requestPermission();

      // 2. 麥克風：語音求救必須。直接用 request（不是只查詢現況），讓系統彈窗在這裡就跳出來
      let micGranted = true;
      if (ExpoSpeechRecognitionModule) {
        const micResult = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        micGranted = !!micResult.granted;
      }

      // 3. 定位：SOS 傳送位置必須，提前在這裡要，不要等真正求救那一刻才要，
      //    不然緊急狀況中還要停下來選允許/拒絕
      const locationStatus = await Location.requestForegroundPermissionsAsync();
      const locationGranted = locationStatus.status === "granted";

      // Android 直接撥號用的權限，不是必要功能（沒有的話會 fallback 開啟撥號盤），
      // 所以不列入下面的必要權限警告清單
      if (Platform.OS === "android") {
        PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CALL_PHONE).catch(() => {});
      }

      return [
        !cameraResult?.granted && "相機",
        !micGranted && "麥克風",
        !locationGranted && "定位",
      ].filter((s): s is string => !!s);
    };

    // 是否已綁定緊急聯絡人，跟 contacts.tsx 的 emergencyPerson 判斷方式一致
    // （contacts 陣列裡有沒有 is_emergency === true 的項目）
    const checkEmergencyContactBound = async () => {
      try {
        const raw = await AsyncStorage.getItem("user");
        if (!raw) return false;
        const storedUser = JSON.parse(raw);
        if (!storedUser?.id) return false;
        const res = await authFetch(`/contacts/${storedUser.id}`);
        const result = await res.json();
        if (!result.success) return false;
        return (result.contacts || []).some((c: any) => c.is_emergency);
      } catch (e) {
        console.error("檢查緊急聯絡人失敗:", e);
        return false;
      }
    };

    const runEntryChecks = async () => {
      // 也涵蓋畫面上「重新開啟權限」按鈕手動重跑的情況：先停掉可能還在播的舊語音，
      // 並把「已就緒」收回，讓拍照分析／語音監聽先暫停，等這輪重新檢查播報完再恢復
      Speech.stop();
      setEntryChecksDone(false);

      const [contactBound, missing] = await Promise.all([
        checkEmergencyContactBound(),
        requestAllPermissions(),
      ]);

      if (cancelled) return;

      setContactWarning(!contactBound);
      setPermissionWarning(missing);

      const messages: string[] = [];
      if (!contactBound) {
        messages.push(
          "您尚未綁定緊急聯絡人，緊急求救服務將無法順利啟動，請至聯絡人頁面新增並設定緊急聯絡人。",
        );
      }
      if (missing.length > 0) {
        messages.push(
          `「${missing.join("、")}」權限尚未開啟，AI 障礙偵測、語音求救、緊急定位可能無法正常運作，請在剛才系統彈出的權限請求中選擇允許，或點擊畫面上的按鈕重新開啟。`,
        );
      }
      if (contactBound && missing.length === 0) {
        messages.push(
          "所有必要權限已開啟，AI 障礙偵測與語音求救已啟動。遭遇危險時，請直接喊出救命、幫我、出事了、或緊急，系統將自動為您定位並撥打緊急電話。",
        );
      }

      // cancelled 代表畫面在播報途中已經離開/卸載，這時候不該再把「已就緒」打開
      const finish = () => {
        if (cancelled) return;
        setEntryChecksDone(true);
      };

      if (messages.length === 0) {
        finish();
        return;
      }

      // 依序播完每一段，等上一段真正播完才播下一段
      const speakNext = (index: number) => {
        if (cancelled) return;
        if (index >= messages.length) {
          finish();
          return;
        }
        Speech.speak(messages[index], {
          language: "zh-TW",
          onDone: () => speakNext(index + 1),
          onError: () => speakNext(index + 1),
          onStopped: finish,
        });
      };
      speakNext(0);
    };

    // 讓畫面上的「重新開啟權限」按鈕可以直接重跑這整輪檢查
    retryEntryChecksRef.current = () => {
      runEntryChecks();
    };

    runEntryChecks();

    return () => {
      cancelled = true;
    };
  }, [isFocused]);

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
  // 要等 entryChecksDone（進場檢查＋播報都跑完）才開始監聽，避免跟進場播報搶著出聲/搶著監聽
  useEffect(() => {
    if (!isFocused || !entryChecksDone) return;

    if (!ExpoSpeechRecognitionModule) {
      // Expo Go 環境沒有原生語音監聽模組，但跌倒偵測仍可能觸發 SOS 倒數（跟語音求救共用同一套流程），
      // 離開畫面時還是要清掉倒數計時器，不然計時器會在畫面卸載後繼續跑完並自動撥打緊急電話
      return () => {
        clearSosCountdown();
      };
    }

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

    // 🔄 斷開自動重連機制（權限被拒時不自動重啟，避免無窮迴圈）
    const endListener = ExpoSpeechRecognitionModule.addListener("end", () => {
      if (isFocused && !micDeniedRef.current) {
        startListening();
      }
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
  }, [isFocused, entryChecksDone]);

  // YOLO 定時抓取畫面，一樣要等 entryChecksDone 才開始
  useEffect(() => {
    if (!permission || !permission.granted || !isFocused || !entryChecksDone) {
      Speech.stop();
      return;
    }

    const interval = setInterval(() => {
      captureAndSend();
    }, CAPTURE_INTERVAL_MS);

    return () => {
      clearInterval(interval);
      Speech.stop();
    };
  }, [permission, user, isFocused, entryChecksDone]);

  const captureAndSend = async () => {
    if (
      !cameraRef.current ||
      isAnalyzingRef.current ||
      !isFocused ||
      sosPendingRef.current
    )
      return;

    try {
      isAnalyzingRef.current = true;
      // quality 從 0.4 調高到 0.6：實測車/機車/腳踏車常常漏偵測，壓縮太多可能是原因之一。
      // 副作用是照片變大、上傳要多花一點時間，如果網路狀況不好導致明顯變慢，可以再調回去
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.6,
        shutterSound: false,
      });

      if (!photo || !photo.base64 || !isFocused) return;

      const currentUserId = user?.id || "test_user_123";

      const frameId = ++frameIdRef.current;
      const captureTime = Date.now() / 1000;

      const response = await authFetch(`/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUserId,
          image: photo.base64,
          frameId,
          captureTime,
        }),
      });

      if (!response.ok) {
        console.warn("後端連線異常，狀態碼:", response.status);
        return;
      }

      const result = await response.json();
      console.log("AI 偵測結果:", result);

      const resultAge = Date.now() / 1000 - captureTime;
      const isStaleResult = resultAge > RESULT_TTL_SECONDS;
      if (isStaleResult) {
        console.log(`⏱️ 辨識結果已過期（${resultAge.toFixed(2)}s），略過這次播報`);
      }

      // 全黑畫面優先判斷：畫面全黑時地面環境自然也偵測不到，直接清空另一邊的計數避免重複算
      if (result.isBlackFrame) {
        blackFrameStreakRef.current += 1;
        noTerrainStreakRef.current = 0;
        if (blackFrameStreakRef.current >= AUTO_SOS_STREAK_NEEDED) {
          blackFrameStreakRef.current = 0;
          beginSosConfirmation("BLACK_SCREEN_DETECTED");
          return;
        }
      } else {
        blackFrameStreakRef.current = 0;

        if (!result.terrainDetected) {
          noTerrainStreakRef.current += 1;
          if (noTerrainStreakRef.current >= AUTO_SOS_STREAK_NEEDED) {
            noTerrainStreakRef.current = 0;
            beginSosConfirmation("NO_TERRAIN_DETECTED");
            return;
          }
        } else {
          noTerrainStreakRef.current = 0;
        }
      }

      if (
        !isStaleResult &&
        result.success &&
        isFocused &&
        (result.label || result.crosswalkInMiddle || result.terrainMessage)
      ) {
        // 依序播報，兩段互斥、同一輪只會播其中一段：
        // 1) 斑馬線沒有明顯在正前方（中間區）時，播距離最近的障礙物（人/機車/汽車/腳踏車/
        //    消防栓/變電箱，不分遠近都可能被選中）＋建議行走方向；沒有偵測到物體時，改用人行道方向建議
        // 2) 斑馬線在正前方時，過馬路是當下最優先的事，不再播一般障礙物提示，改播「前方有斑馬線，
        //    現在是什麼燈號」或「前方斑馬線上有什麼障礙物」，最後都會給通行/等待建議
        let objectMessage: string | null = null;
        if (!result.crosswalkInMiddle) {
          if (result.label) {
            // Python 端已回傳翻譯好的中文物體名稱（如「車」「行人」），這裡直接使用，不再查字典
            const chineseObject = result.label;
            const zoneZh = ZONE_ZH[result.zone] ?? "前方";
            const recommendedZoneZh = ZONE_ZH[result.recommendedZone];

            objectMessage = recommendedZoneZh
              ? `${zoneZh}有${chineseObject}，建議往${recommendedZoneZh}移動`
              : `${zoneZh}有${chineseObject}`;
          } else if (result.terrainMessage) {
            // 後端已經確認這次沒有 YOLO 物體才會回傳人行道方向建議，直接播即可
            objectMessage = result.terrainMessage;
          }
        }

        let crossingMessage: string | null = null;
        if (result.crosswalkInMiddle) {
          if (result.trafficLight) {
            const advice = result.trafficLight === "紅燈" ? "請等待" : "請通行";
            crossingMessage = `前方有斑馬線，現在是${result.trafficLight}，${advice}`;
          } else if (result.crosswalkObstacle) {
            crossingMessage = `前方斑馬線上有${result.crosswalkObstacle}，請等待`;
          } else {
            crossingMessage = "前方是斑馬線，請通行";
          }
        }

        const segments = [objectMessage, crossingMessage].filter(
          (s): s is string => s !== null,
        );
        const message = segments.join("。");
        setInfoText(message);

        if (message !== lastSpokenText.current) {
          // 不呼叫 Speech.stop()：讓新的播報排隊等目前正在播的內容說完再開始，
          // 不會把上一次辨識結果的語音講到一半就剪斷
          lastSpokenText.current = message;

          // 依序播完每一段，等上一段真正播完（onDone）才開始下一段，不會同時搶著播或被剪斷
          const speakSegment = (index: number) => {
            if (index >= segments.length) return;
            Speech.speak(segments[index], {
              language: "zh-TW",
              rate: 1.1,
              onDone: () => speakSegment(index + 1),
            });
          };
          speakSegment(0);
        }
      }
    } catch (error) {
      console.error("實景偵測傳輸失敗:", error);
    } finally {
      isAnalyzingRef.current = false;
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

      const response = await authFetch(`/sos`, {
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
          placeEmergencyCall(result.emergencyPhone);
        } else {
          placeEmergencyCall("110");
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
            accessibilityLabel={`偵測到求救關鍵字，${sosCountdown} 秒後將自動撥打緊急電話，如不需要請點擊取消`}
          >
            <Text style={styles.voiceIcon}>🚨</Text>
            <Text style={styles.voiceTitle}>
              {sosCountdown} 秒後將撥打緊急電話
            </Text>
            <Text style={styles.voiceDesc}>
              不需要請說「取消」，或點擊下方按鈕
            </Text>
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
        ) : permissionWarning.length > 0 ? (
          <View
            style={styles.voiceContainer}
            pointerEvents="box-none"
            accessible={true}
            accessibilityLabel={`「${permissionWarning.join("、")}」權限尚未開啟，AI 障礙偵測、語音求救、緊急定位可能無法正常運作，請點擊下方按鈕重新開啟權限。`}
          >
            <Text style={styles.voiceIcon}>⚠️</Text>
            <Text style={styles.voiceTitle}>權限尚未完整開啟</Text>
            <Text style={styles.voiceDesc}>缺少：{permissionWarning.join("、")}</Text>
            <TouchableOpacity
              style={styles.cancelSosBtn}
              onPress={() => retryEntryChecksRef.current()}
              accessible={true}
              accessibilityLabel="重新開啟權限"
              accessibilityRole="button"
            >
              <Text style={styles.cancelSosText}>重新開啟權限</Text>
            </TouchableOpacity>
          </View>
        ) : micDenied ? (
          <View
            style={styles.voiceContainer}
            pointerEvents="box-none"
            accessible={true}
            accessibilityLabel="語音求救功能需要麥克風權限，請點擊下方按鈕重新開啟。"
          >
            <Text style={styles.voiceIcon}>🔇</Text>
            <Text style={styles.voiceTitle}>語音求救未啟用</Text>
            <Text style={styles.voiceDesc}>需要麥克風權限才能監聽求救語音</Text>
            <TouchableOpacity
              style={styles.cancelSosBtn}
              onPress={() => retryEntryChecksRef.current()}
              accessible={true}
              accessibilityLabel="重新開啟麥克風權限"
              accessibilityRole="button"
            >
              <Text style={styles.cancelSosText}>重新開啟權限</Text>
            </TouchableOpacity>
          </View>
        ) : contactWarning ? (
          <View
            style={styles.voiceContainer}
            pointerEvents="box-none"
            accessible={true}
            accessibilityLabel="尚未綁定緊急聯絡人，緊急求救服務將無法順利啟動，請點擊下方按鈕前往設定。"
          >
            <Text style={styles.voiceIcon}>👤</Text>
            <Text style={styles.voiceTitle}>尚未綁定緊急聯絡人</Text>
            <Text style={styles.voiceDesc}>緊急求救服務將無法順利啟動</Text>
            <TouchableOpacity
              style={styles.cancelSosBtn}
              onPress={() => router.push("/blind/(tabs)/contacts")}
              accessible={true}
              accessibilityLabel="前往設定緊急聯絡人"
              accessibilityRole="button"
            >
              <Text style={styles.cancelSosText}>前往設定聯絡人</Text>
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

        {/* AI 狀態提示：內容已經由 Speech.speak 主動念出來了，這裡不設 accessibilityLiveRegion，
            避免螢幕閱讀器（TalkBack/VoiceOver）針對同一段文字又自動重複念一次，跟 App 自己的 TTS 打架 */}
        <View style={styles.infoBox} accessible={true}>
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
