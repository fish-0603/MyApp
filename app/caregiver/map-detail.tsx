import * as Location from "expo-location";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";

export default function MapDetailScreen() {
  // 接收從 alert-history 傳遞過來的參數
  const { name, lat, lng, time } = useLocalSearchParams();
  const [address, setAddress] = useState("地址解析中...");

  const latitude = parseFloat(lat as string);
  const longitude = parseFloat(lng as string);

  useEffect(() => {
    // 進行反向地址解析
    Location.reverseGeocodeAsync({ latitude, longitude }).then((res) => {
      if (res && res[0]) {
        const item = res[0];
        setAddress(
          `${item.city || ""}${item.district || ""}${item.street || ""}`,
        );
      } else {
        setAddress("無法取得地址資訊");
      }
    });
  }, [latitude, longitude]);

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      {/* 頂部資訊區塊 */}
      <View style={styles.infoBox}>
        <Text style={styles.title}>{name}</Text>
        <Text style={styles.subText}>🕒 時間：{time}</Text>
        <Text style={styles.subText}>📍 地址：{address}</Text>
      </View>

      {/* 地圖顯示區塊 */}
      <View style={styles.mapWrapper}>
        <MapView
          style={styles.map}
          initialRegion={{
            latitude,
            longitude,
            latitudeDelta: 0.003,
            longitudeDelta: 0.003,
          }}
        >
          <Marker coordinate={{ latitude, longitude }} title={name as string} />
        </MapView>
      </View>

      {/* 導航按鈕 */}
      <TouchableOpacity
        style={styles.navBtn}
        onPress={() =>
          Linking.openURL(
            Platform.select({
              ios: `maps:0,0?q=${latitude},${longitude}`,
              android: `geo:0,0?q=${latitude},${longitude}`,
            })!,
          )
        }
      >
        <Text style={styles.navBtnText}>開啟導航前往</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  infoBox: {
    padding: 20,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#1C1C1E",
  },
  subText: {
    fontSize: 16,
    color: "#3A3A3C",
    marginTop: 4,
  },
  mapWrapper: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  navBtn: {
    backgroundColor: "rgb(0, 0, 0)",
    padding: 20,
    alignItems: "center",
    margin: 20,
    borderRadius: 12,
  },
  navBtnText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 18,
  },
});
