import { useState } from "react";
import { X, MapPin, Loader2, Navigation, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface LocationComposerProps {
  open: boolean;
  onClose: () => void;
  onSend: (data: { lat: number; lng: number; name: string; live?: boolean; duration?: number }) => void;
}

const LIVE_DURATIONS = [
  { label: "15 min", value: 15 },
  { label: "1 hour", value: 60 },
  { label: "8 hours", value: 480 },
];

const LocationComposer = ({ open, onClose, onSend }: LocationComposerProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [locationName, setLocationName] = useState("My Location");
  const [tab, setTab] = useState<"current" | "live">("current");
  const [liveDuration, setLiveDuration] = useState(15);

  const getLocation = (callback: (pos: GeolocationPosition) => void) => {
    setLoading(true);
    setError("");

    if (!navigator.geolocation) {
      setLoading(false);
      setError("Location is not supported on this device");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLoading(false);
        callback(pos);
      },
      (err) => {
        setLoading(false);
        if (err.code === 1) {
          setError("Location permission denied. Please allow location access in your browser settings and try again.");
        } else if (err.code === 2) {
          setError("Unable to determine your location. Please try again.");
        } else {
          setError("Location request timed out. Please try again.");
        }
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const shareCurrentLocation = () => {
    getLocation((pos) => {
      onSend({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        name: locationName.trim() || "My Location",
      });
      setLocationName("My Location");
      onClose();
    });
  };

  const shareLiveLocation = () => {
    getLocation((pos) => {
      onSend({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        name: "Live Location",
        live: true,
        duration: liveDuration,
      });
      onClose();
    });
  };

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-end justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="w-full max-w-lg bg-card rounded-t-3xl p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-foreground font-body">Share Location</h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-secondary">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-secondary/60 rounded-xl">
          <button
            onClick={() => { setTab("current"); setError(""); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[13px] font-semibold transition-all ${
              tab === "current" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            <MapPin className="w-3.5 h-3.5" /> Current
          </button>
          <button
            onClick={() => { setTab("live"); setError(""); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[13px] font-semibold transition-all ${
              tab === "live" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            <Navigation className="w-3.5 h-3.5" /> Live
          </button>
        </div>

        <AnimatePresence mode="wait">
          {tab === "current" ? (
            <motion.div key="current" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-secondary/60 border border-border/30">
                <div className="w-12 h-12 rounded-xl bg-[hsl(var(--us-coral))]/10 flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-[hsl(var(--us-coral))]" />
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    placeholder="Location label"
                    className="w-full bg-transparent text-[14px] font-medium text-foreground outline-none placeholder:text-muted-foreground/50"
                  />
                  <p className="text-[13px] text-muted-foreground mt-0.5">Send your current GPS pin</p>
                </div>
              </div>

              <button
                onClick={shareCurrentLocation}
                disabled={loading}
                className="w-full py-3.5 rounded-2xl bg-[hsl(var(--us-coral))] text-white font-semibold text-[14px] disabled:opacity-50 active:scale-[0.98] transition-transform"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Share My Location"}
              </button>
            </motion.div>
          ) : (
            <motion.div key="live" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-secondary/60 border border-border/30">
                <div className="w-12 h-12 rounded-xl bg-[hsl(var(--us-sage))]/10 flex items-center justify-center">
                  <Navigation className="w-6 h-6 text-[hsl(var(--us-sage))]" />
                </div>
                <div className="flex-1">
                  <p className="text-[14px] font-medium text-foreground">Live Location</p>
                  <p className="text-[13px] text-muted-foreground mt-0.5">Share your real-time movement</p>
                </div>
              </div>

              {/* Duration picker */}
              <div className="space-y-2">
                <p className="text-[14px] font-medium text-muted-foreground flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Share for
                </p>
                <div className="flex gap-2">
                  {LIVE_DURATIONS.map((d) => (
                    <button
                      key={d.value}
                      onClick={() => setLiveDuration(d.value)}
                      className={`flex-1 py-2.5 rounded-xl text-[13px] font-semibold transition-all border ${
                        liveDuration === d.value
                          ? "bg-[hsl(var(--us-sage))]/15 border-[hsl(var(--us-sage))]/40 text-[hsl(var(--us-sage))]"
                          : "bg-secondary/40 border-border/30 text-muted-foreground"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={shareLiveLocation}
                disabled={loading}
                className="w-full py-3.5 rounded-2xl bg-[hsl(var(--us-sage))] text-white font-semibold text-[14px] disabled:opacity-50 active:scale-[0.98] transition-transform"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Share Live Location"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3">
            <p className="text-xs text-destructive text-center">{error}</p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default LocationComposer;
