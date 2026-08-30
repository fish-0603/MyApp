import { useEffect, useState } from "react";

function secondsUntil(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
  return diff > 0 ? diff : 0;
}

// 回傳距離 expiresAt（ISO 字串）還剩幾秒，每秒更新一次；expiresAt 是 null 代表目前沒有
// 已知的過期時間（例如還沒觸發過寄送），這時回傳 null，畫面不顯示倒數
export function useCountdown(expiresAt: string | null): number | null {
  const [remaining, setRemaining] = useState<number | null>(() => secondsUntil(expiresAt));

  useEffect(() => {
    setRemaining(secondsUntil(expiresAt));
    if (!expiresAt) return;
    const interval = setInterval(() => {
      setRemaining(secondsUntil(expiresAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return remaining;
}

export function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
