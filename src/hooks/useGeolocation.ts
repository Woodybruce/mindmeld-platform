import { useState, useEffect, useCallback } from "react";
import { Capacitor } from "@capacitor/core";

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  error: string | null;
  loading: boolean;
}

const FALLBACK = { latitude: 51.4545, longitude: -0.1081, accuracy: 100 };

export const useGeolocation = (enabled: boolean = false) => {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    error: null,
    loading: false,
  });

  useEffect(() => {
    if (!enabled) return;

    setState((s) => ({ ...s, loading: true }));

    const isNative = Capacitor.isNativePlatform();
    console.log("[Geo] Starting geolocation. isNative:", isNative, "platform:", Capacitor.getPlatform());

    const useFallback = (reason?: string) => {
      console.warn("[Geo] Using fallback. Reason:", reason);
      setState({
        ...FALLBACK,
        error: null,
        loading: false,
      });
    };

    // Timeout: if no position after 12s, use fallback
    const fallbackTimer = setTimeout(() => {
      setState((prev) => {
        if (prev.loading) {
          console.warn("Geolocation timed out, using fallback");
          return { ...FALLBACK, error: null, loading: false };
        }
        return prev;
      });
    }, 12000);


    if (isNative) {
      let watchId: string | undefined;

      const startWatch = async () => {
        try {
          console.log("[Geo] Importing @capacitor/geolocation...");
          const { Geolocation } = await import("@capacitor/geolocation");
          console.log("[Geo] Plugin imported, requesting permissions...");
          const permResult = await Geolocation.requestPermissions();
          console.log("[Geo] Permission result:", JSON.stringify(permResult));
          if (permResult.location === "denied") {
            clearTimeout(fallbackTimer);
            useFallback("Location permission denied");
            return;
          }

          console.log("[Geo] Starting watchPosition...");
          watchId = await Geolocation.watchPosition(
            { enableHighAccuracy: true, timeout: 10000 },
            (position, err) => {
              clearTimeout(fallbackTimer);
              if (err || !position) {
                console.warn("[Geo] watchPosition error:", err?.message);
                useFallback(err?.message);
                return;
              }
              console.log("[Geo] Got position:", position.coords.latitude, position.coords.longitude);
              setState({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                error: null,
                loading: false,
              });
            }
          );
          console.log("[Geo] watchId:", watchId);
        } catch (e: any) {
          console.error("[Geo] startWatch error:", e);
          clearTimeout(fallbackTimer);
          useFallback(e?.message);
        }
      };

      startWatch();

      return () => {
        clearTimeout(fallbackTimer);
        if (watchId) {
          import("@capacitor/geolocation").then(({ Geolocation }) =>
            Geolocation.clearWatch({ id: watchId! })
          );
        }
      };
    } else {
      // Web / Capacitor remote URL fallback
      if (!navigator.geolocation) {
        clearTimeout(fallbackTimer);
        useFallback("Geolocation not supported");
        return;
      }

      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          clearTimeout(fallbackTimer);
          setState({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            error: null,
            loading: false,
          });
        },
        (err) => {
          clearTimeout(fallbackTimer);
          useFallback(err.message);
        },
        { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
      );

      return () => {
        clearTimeout(fallbackTimer);
        navigator.geolocation.clearWatch(watchId);
      };
    }
  }, [enabled]);

  return state;
};

// Simulates a partner moving around near a given position
export const useSimulatedPartner = (
  myLat: number | null,
  myLng: number | null,
  active: boolean
) => {
  const [partnerPos, setPartnerPos] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!active || myLat == null || myLng == null) return;

    // Start partner ~300m away in a random direction
    const angle = Math.random() * Math.PI * 2;
    const offsetLat = Math.cos(angle) * 0.003;
    const offsetLng = Math.sin(angle) * 0.004;
    let lat = myLat + offsetLat;
    let lng = myLng + offsetLng;
    setPartnerPos({ lat, lng });

    // Partner slowly moves toward player
    const interval = setInterval(() => {
      const jitterLat = (Math.random() - 0.5) * 0.0003;
      const jitterLng = (Math.random() - 0.5) * 0.0003;
      lat += jitterLat;
      lng += jitterLng;
      // Drift toward player
      if (myLat != null && myLng != null) {
        lat += (myLat - lat) * 0.02;
        lng += (myLng - lng) * 0.02;
      }
      setPartnerPos({ lat, lng });
    }, 2000);

    return () => clearInterval(interval);
  }, [active, myLat != null, myLng != null]);

  return partnerPos;
};

export const getDistanceMeters = (
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number => {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};
