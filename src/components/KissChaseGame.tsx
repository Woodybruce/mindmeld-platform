import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import { motion, AnimatePresence } from "framer-motion";
import { Timer, Navigation, Heart, X } from "lucide-react";
import { useGeolocation, useSimulatedPartner, getDistanceMeters } from "@/hooks/useGeolocation";
import { useRealtimeLocation } from "@/hooks/useRealtimeLocation";
import "leaflet/dist/leaflet.css";

// Fix leaflet default icon issue
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const playerIcon = new L.DivIcon({
  html: `<div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#c9553d,#a3412f);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:16px;">🏃</div>`,
  className: "",
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const partnerIcon = new L.DivIcon({
  html: `<div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#e8a87c,#d4845e);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:16px;">💋</div>`,
  className: "",
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const CATCH_RADIUS = 25; // meters

function MapFollower({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom(), { animate: true });
  }, [lat, lng]);
  return null;
}

interface KissChaseGameProps {
  reward: string;
  timeMinutes: number;
  onCatch: () => void;
  onTimeUp: () => void;
  onQuit: () => void;
}

const KissChaseGame = ({ reward, timeMinutes, onCatch, onTimeUp, onQuit }: KissChaseGameProps) => {
  const geo = useGeolocation(true);

  // Timeout: if location takes >10s, use fallback coordinates
  const [geoTimedOut, setGeoTimedOut] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setGeoTimedOut(true), 10000);
    if (geo.latitude) clearTimeout(timer);
    return () => clearTimeout(timer);
  }, [geo.latitude]);

  const effectiveLat = geo.latitude || (geoTimedOut ? 51.4545 : null);
  const effectiveLng = geo.longitude || (geoTimedOut ? -0.0975 : null);

  // Real-time partner location via broadcast
  const { partnerPos: realtimePartner, hasPartner } = useRealtimeLocation(effectiveLat, effectiveLng, !!effectiveLat);
  // Fallback: simulated partner if no linked partner
  const simulatedPartner = useSimulatedPartner(effectiveLat ?? 0, effectiveLng ?? 0, !!effectiveLat && !hasPartner);
  const partnerPos = hasPartner
    ? (realtimePartner ? { lat: realtimePartner.lat, lng: realtimePartner.lng } : null)
    : simulatedPartner;

  const [timeLeft, setTimeLeft] = useState(timeMinutes * 60);
  const [distance, setDistance] = useState<number | null>(null);
  const [waitingForPartner, setWaitingForPartner] = useState(hasPartner);
  const caught = useRef(false);

  // Clear waiting state when partner position arrives
  useEffect(() => {
    if (partnerPos && waitingForPartner) setWaitingForPartner(false);
  }, [partnerPos, waitingForPartner]);

  // Timer
  useEffect(() => {
    if (timeLeft <= 0) {
      onTimeUp();
      return;
    }
    const t = setInterval(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [timeLeft]);

  // Distance check
  useEffect(() => {
    if (effectiveLat && effectiveLng && partnerPos) {
      const d = getDistanceMeters(effectiveLat, effectiveLng, partnerPos.lat, partnerPos.lng);
      setDistance(d);
      if (d <= CATCH_RADIUS && !caught.current) {
        caught.current = true;
        onCatch();
      }
    }
  }, [effectiveLat, effectiveLng, partnerPos]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const urgency = timeLeft < 60 ? "text-destructive" : timeLeft < 180 ? "text-us-gold" : "text-foreground";

  if (!effectiveLat || !effectiveLng) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-6">
        <div className="flex items-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            className="w-16 h-16 rounded-full border-4 border-us-coral border-t-transparent"
          />
          <p className="ml-4 text-muted-foreground">Waiting for partner…</p>
        </div>
        <button
          onClick={onQuit}
          className="mt-4 px-6 py-3 rounded-xl bg-secondary text-secondary-foreground font-medium"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (hasPartner && waitingForPartner) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-6 text-center">
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="text-5xl"
        >
          💋
        </motion.div>
        <h2 className="font-display text-xl font-bold">Waiting for partner…</h2>
        <p className="text-muted-foreground text-sm max-w-xs">
          Your partner needs to open Kiss Chase too so you can see each other's real location!
        </p>
        <button
          onClick={onQuit}
          className="mt-4 px-6 py-3 rounded-xl bg-secondary text-secondary-foreground font-medium"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (geo.error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
        <Navigation className="w-12 h-12 text-muted-foreground mb-4" />
        <h2 className="font-display text-xl font-bold mb-2">Location Access Needed</h2>
        <p className="text-muted-foreground text-sm mb-4">{geo.error}</p>
        <p className="text-xs text-muted-foreground">Please enable location in your browser settings and try again.</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-full relative max-w-lg mx-auto">
      {/* Map */}
      <MapContainer
        center={[effectiveLat!, effectiveLng!]}
        zoom={16}
        className="h-full w-full z-0"
        zoomControl={false}
      >
        <TileLayer
          attribution=""
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        <MapFollower lat={effectiveLat!} lng={effectiveLng!} />

        {/* Player */}
        <Marker position={[effectiveLat!, effectiveLng!]} icon={playerIcon}>
          <Popup>You are here</Popup>
        </Marker>
        <Circle center={[effectiveLat!, effectiveLng!]} radius={CATCH_RADIUS} pathOptions={{ color: "#c9553d", fillColor: "#c9553d", fillOpacity: 0.1, weight: 1 }} />

        {/* Partner */}
        {partnerPos && (
          <>
            <Marker position={[partnerPos.lat, partnerPos.lng]} icon={partnerIcon}>
              <Popup>Your partner 💋</Popup>
            </Marker>
            <Circle center={[partnerPos.lat, partnerPos.lng]} radius={10} pathOptions={{ color: "#e8a87c", fillColor: "#e8a87c", fillOpacity: 0.2, weight: 1 }} />
          </>
        )}
      </MapContainer>

      {/* HUD overlay */}
      <div className="absolute top-0 left-0 right-0 z-[1000] safe-area-top">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <button onClick={onQuit} className="w-10 h-10 rounded-full bg-background/90 backdrop-blur-xl flex items-center justify-center shadow-lg">
            <X className="w-5 h-5 text-foreground" />
          </button>
          <div className="bg-background/90 backdrop-blur-xl rounded-full px-5 py-2 shadow-lg flex items-center gap-2">
            <Timer className={`w-4 h-4 ${urgency}`} />
            <span className={`font-mono text-lg font-bold ${urgency}`}>{formatTime(timeLeft)}</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-background/90 backdrop-blur-xl flex items-center justify-center shadow-lg">
            <Heart className="w-5 h-5 text-us-coral" />
          </div>
        </div>
      </div>

      {/* Distance indicator */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="absolute bottom-6 left-4 right-4 z-[1000]"
      >
        <div className="bg-background/95 backdrop-blur-xl rounded-2xl p-4 shadow-xl border border-border/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Distance to partner</p>
              <p className="text-2xl font-bold text-foreground font-mono">
                {distance != null ? (
                  distance < 100
                    ? `${Math.round(distance)}m`
                    : `${(distance / 1000).toFixed(1)}km`
                ) : "---"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Catch radius</p>
              <p className="text-sm font-semibold text-us-coral">{CATCH_RADIUS}m</p>
            </div>
          </div>
          {distance != null && distance < 100 && (
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 1 }}
              className="mt-2 text-center text-sm font-semibold text-us-coral"
            >
              🔥 Getting close! Keep going!
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default KissChaseGame;
