import { motion } from "framer-motion";
import { Phone, PhoneOff, Video } from "lucide-react";
import type { CallType } from "@/hooks/useWebRTC";

interface IncomingCallProps {
  callerName: string;
  callType: CallType;
  onAccept: (type: CallType) => void;
  onReject: () => void;
}

const IncomingCall = ({ callerName, callType, onAccept, onReject }: IncomingCallProps) => {
  const initial = callerName.charAt(0).toUpperCase();
  const isVideo = callType === "video";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-gradient-to-b from-[hsl(var(--us-navy))] to-[hsl(var(--us-navy)/0.95)] flex flex-col items-center justify-center"
    >
      {/* Pulsing ring */}
      <div className="relative mb-8">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute inset-0 rounded-full border-2 border-[hsl(var(--us-sage))]"
            initial={{ scale: 1, opacity: 0.6 }}
            animate={{ scale: [1, 2.5], opacity: [0.6, 0] }}
            transition={{ repeat: Infinity, duration: 2, delay: i * 0.6, ease: "easeOut" }}
            style={{ width: 96, height: 96, top: 0, left: 0 }}
          />
        ))}
        <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-[hsl(var(--us-blush))] to-[hsl(var(--us-coral))] flex items-center justify-center">
          <span className="text-3xl font-display font-bold text-white">{initial}</span>
        </div>
      </div>

      <h2 className="text-2xl font-display font-semibold text-white mb-2">{callerName}</h2>
      <p className="text-sm text-white/50 mb-16">
        Incoming {isVideo ? "video" : "voice"} call…
      </p>

      <div className="flex items-center gap-16">
        {/* Reject */}
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={onReject}
            className="w-16 h-16 rounded-full bg-destructive flex items-center justify-center shadow-lg"
          >
            <PhoneOff className="w-7 h-7 text-white" />
          </button>
          <span className="text-xs text-white/50">Decline</span>
        </div>

        {/* Accept */}
        <div className="flex flex-col items-center gap-2">
          <motion.button
            onClick={() => onAccept(callType)}
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="w-16 h-16 rounded-full bg-[hsl(var(--us-sage))] flex items-center justify-center shadow-lg"
          >
            {isVideo ? (
              <Video className="w-7 h-7 text-white" />
            ) : (
              <Phone className="w-7 h-7 text-white" />
            )}
          </motion.button>
          <span className="text-xs text-white/50">Accept</span>
        </div>
      </div>
    </motion.div>
  );
};

export default IncomingCall;
