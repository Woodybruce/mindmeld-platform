import { motion } from "framer-motion";
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, X } from "lucide-react";
import type { CallState, CallType } from "@/hooks/useWebRTC";

interface CallScreenProps {
  callState: CallState;
  callType: CallType;
  partnerName: string;
  isMuted: boolean;
  isVideoOff: boolean;
  callDuration: number;
  localVideoRef: React.RefObject<HTMLVideoElement>;
  remoteVideoRef: React.RefObject<HTMLVideoElement>;
  onEndCall: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
}

const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

const CallScreen = ({
  callState,
  callType,
  partnerName,
  isMuted,
  isVideoOff,
  callDuration,
  localVideoRef,
  remoteVideoRef,
  onEndCall,
  onToggleMute,
  onToggleVideo,
}: CallScreenProps) => {
  const isVideo = callType === "video";
  const initial = partnerName.charAt(0).toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-[hsl(var(--us-navy))] flex flex-col"
    >
      {/* Remote video (full screen) */}
      {isVideo && (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Dark overlay for audio calls or when connecting */}
      {(!isVideo || callState !== "connected") && (
        <div className="absolute inset-0 bg-gradient-to-b from-[hsl(var(--us-navy))] via-[hsl(var(--us-navy)/0.95)] to-[hsl(var(--us-navy))]" />
      )}

      {/* Top info */}
      <div className="relative z-10 flex flex-col items-center pt-20 pb-6">
        {(!isVideo || callState !== "connected") && (
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[hsl(var(--us-blush))] to-[hsl(var(--us-coral))] flex items-center justify-center mb-6">
            <span className="text-3xl font-display font-bold text-white">{initial}</span>
          </div>
        )}
        <h2 className="text-xl font-display font-semibold text-white">{partnerName}</h2>
        <p className="text-sm text-white/50 mt-1">
          {callState === "calling" && "Calling…"}
          {callState === "ringing" && "Ringing…"}
          {callState === "connected" && formatDuration(callDuration)}
        </p>

        {callState === "calling" && (
          <motion.div
            className="mt-6 flex gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2.5 h-2.5 rounded-full bg-white/30"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.3 }}
              />
            ))}
          </motion.div>
        )}
      </div>

      {/* Local video (picture-in-picture) */}
      {isVideo && callState === "connected" && (
        <div className="absolute top-16 right-4 z-20 w-28 h-40 rounded-2xl overflow-hidden border-2 border-white/20 shadow-lg">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover mirror"
            style={{ transform: "scaleX(-1)" }}
          />
        </div>
      )}

      {/* Controls */}
      <div className="relative z-10 mt-auto pb-16 flex flex-col items-center">
        <div className="flex items-center gap-6">
          {/* Mute */}
          <button
            onClick={onToggleMute}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
              isMuted ? "bg-white text-[hsl(var(--us-navy))]" : "bg-white/15 text-white"
            }`}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>

          {/* Video toggle (only for video calls) */}
          {isVideo && (
            <button
              onClick={onToggleVideo}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                isVideoOff ? "bg-white text-[hsl(var(--us-navy))]" : "bg-white/15 text-white"
              }`}
            >
              {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
            </button>
          )}

          {/* End call */}
          <button
            onClick={onEndCall}
            className="w-16 h-16 rounded-full bg-destructive flex items-center justify-center shadow-lg"
          >
            <PhoneOff className="w-7 h-7 text-white" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default CallScreen;
