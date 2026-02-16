import { useState, useEffect, useCallback } from "react";

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  error: string | null;
  loading: boolean;
}

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
    if (!navigator.geolocation) {
      setState((s) => ({ ...s, error: "Geolocation not supported" }));
      return;
    }

    setState((s) => ({ ...s, loading: true }));

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setState({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          error: null,
          loading: false,
        });
      },
      (err) => {
        // Fallback to a default location so the game is still playable
        console.warn("Geolocation error, using fallback location:", err.message);
        setState({
          latitude: 51.4545,
          longitude: -0.1081,
          accuracy: 100,
          error: null,
          loading: false,
        });
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
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
