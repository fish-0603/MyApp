import Constants from "expo-constants";

// 開發模式下，手機是透過 Expo dev server 連到這台電腦的，
// hostUri 裡就帶著這台電腦目前的區網 IP，換網路也不用手動改。
// （只在 `expo start` 開發模式下有效；正式打包後 hostUri 會是 undefined，
//   要換成真正的後端網址。）
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
export const BASE_URL = `http://${COMPUTER_IP}:3000`;

export const GOOGLE_WEB_CLIENT_ID =
  "523214137199-saffmigi07t6tm5u5g476807sj13aqls.apps.googleusercontent.com";
