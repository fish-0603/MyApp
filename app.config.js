require("dotenv").config();

const appJson = require("./app.json");

// app.json 是靜態基底設定；這裡疊加需要在 build 時從環境變數注入的機密值
// （例如 Google Maps API Key），避免把金鑰直接寫死進版本控制。
/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  ...appJson.expo,
  android: {
    ...appJson.expo.android,
    // Firebase 專案的 Android 設定檔，prebuild 時會複製進 android/app/ 並自動套用
    // com.google.gms.google-services Gradle 外掛程式，讓 expo-notifications 能取得原生 FCM token
    googleServicesFile: "./google-services.json",
    config: {
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_API_KEY,
      },
    },
  },
};
