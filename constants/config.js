import Constants from "expo-constants";

// 開發模式下，手機是透過 Expo dev server 連到這台電腦的，
// hostUri 裡就帶著這台電腦目前的區網 IP，換網路也不用手動改。
// （只在 `expo start` 開發模式下有效。）
function resolveComputerIP() {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    Constants.expoGoConfig?.debuggerHost;
  if (hostUri) {
    return hostUri.split(":")[0];
  }
  return "localhost";
}

export const COMPUTER_IP = resolveComputerIP();

// 正式後端網址：由 EXPO_PUBLIC_ 開頭的環境變數在 build 時注入。
// 開發模式下沒設定就退回自動偵測的區網 IP；正式打包若沒設定，
// 不再悄悄退回 localhost（打包後裝置連不上會很難查），改成印出明確錯誤。
function resolveBaseUrl() {
  const prodUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (__DEV__) {
    return prodUrl || `http://${COMPUTER_IP}:3000`;
  }
  if (!prodUrl) {
    console.error(
      "[config] 未設定 EXPO_PUBLIC_API_BASE_URL，正式版無法連線到後端！" +
        "請在打包前於 .env 設定此環境變數（見 .env.example）。"
    );
    return "";
  }
  return prodUrl;
}

export const BASE_URL = resolveBaseUrl();

export const GOOGLE_WEB_CLIENT_ID =
  "523214137199-saffmigi07t6tm5u5g476807sj13aqls.apps.googleusercontent.com";
