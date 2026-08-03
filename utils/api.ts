import AsyncStorage from "@react-native-async-storage/async-storage";

import { BASE_URL } from "@/constants/config";

// 登入/註冊/Google 登入成功後，後端會在 user 物件裡多帶一個 token 欄位，
// 跟其他使用者資料一起存進 AsyncStorage 的 "user"，這裡讀出來用。
async function getAuthToken(): Promise<string | null> {
  const raw = await AsyncStorage.getItem("user");
  if (!raw) return null;
  try {
    const user = JSON.parse(raw);
    return typeof user?.token === "string" ? user.token : null;
  } catch {
    return null;
  }
}

// 取代直接呼叫 fetch(`${BASE_URL}${path}`, ...)：自動帶上 Authorization header，
// 讓後端能驗證這個請求真的是本人發出的，而不是隨便填一個 userId 就能呼叫。
export async function authFetch(path: string, options: RequestInit = {}) {
  const token = await getAuthToken();
  const headers = new Headers(options.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(`${BASE_URL}${path}`, { ...options, headers });
}
