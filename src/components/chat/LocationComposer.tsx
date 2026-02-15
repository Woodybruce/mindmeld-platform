import { useState } from "react";
import { X, MapPin, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface LocationComposerProps {
  open: boolean;
  onClose: () => void;
  onSend: (data: { lat: number; lng: number; name: string }) => void;
}

const LocationComposer = ({ open, onClose, onSend }: LocationComposerProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [locationName, setLocationName] = useState("My Location");

  const shareLocation = () => {
    setLoading(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onSend({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          name: locationName.trim() || "My Location",
        });
        setLoading(false);
        setLocationName("My Location");
        onClose();
      },
      (err) => {
        setLoading(false);
        setError(err.code === 1 ? "Location permission denied" : "Unable to get location");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
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
            <p className="text-[11px] text-muted-foreground mt-0.5">Your current GPS coordinates</p>
          </div>
        </div>

        {error && <p className="text-xs text-destructive text-center">{error}</p>}

        <button
          onClick={shareLocation}
          disabled={loading}
          className="w-full py-3.5 rounded-2xl bg-[hsl(var(--us-coral))] text-white font-semibold text-[14px] disabled:opacity-50 active:scale-[0.98] transition-transform"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Share My Location"}
        </button>
      </motion.div>
    </motion.div>
  );
};

export default LocationComposer;
