import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CallState = "idle" | "calling" | "ringing" | "connected" | "ended";
export type CallType = "audio" | "video";

interface UseWebRTCProps {
  userId: string | undefined;
  partnerId: string | undefined;
  partnerName: string;
  /** The current user's own display name, sent to the partner on an outgoing call. */
  selfName?: string;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export function useWebRTC({ userId, partnerId, partnerName, selfName }: UseWebRTCProps) {
  const [callState, setCallState] = useState<CallState>("idle");
  const [callType, setCallType] = useState<CallType>("audio");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [incomingCall, setIncomingCall] = useState<{ type: CallType; from: string } | null>(null);

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const remoteStream = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const durationInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const iceCandidateQueue = useRef<RTCIceCandidateInit[]>([]);
  // Mirror of callState readable from effect cleanups without stale closures.
  const callStateRef = useRef<CallState>(callState);
  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  const getChannelName = useCallback(() => {
    if (!userId || !partnerId) return null;
    const sorted = [userId, partnerId].sort();
    return `call-${sorted[0]}-${sorted[1]}`;
  }, [userId, partnerId]);

  // Cleanup
  const cleanup = useCallback(() => {
    localStream.current?.getTracks().forEach((t) => t.stop());
    localStream.current = null;
    remoteStream.current = null;
    peerConnection.current?.close();
    peerConnection.current = null;
    iceCandidateQueue.current = [];
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
      durationInterval.current = null;
    }
    setCallDuration(0);
    setIsMuted(false);
    setIsVideoOff(false);
  }, []);

  const setupPeerConnection = useCallback(
    (stream: MediaStream) => {
      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnection.current = pc;

      // Add local tracks
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Remote stream
      const remote = new MediaStream();
      remoteStream.current = remote;
      pc.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => remote.addTrack(track));
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remote;
      };

      // ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && channelRef.current) {
          channelRef.current.send({
            type: "broadcast",
            event: "ice-candidate",
            payload: { candidate: event.candidate.toJSON(), from: userId },
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          setCallState("connected");
          setCallDuration(0);
          // Clear any prior interval so reconnects don't leak/double-count.
          if (durationInterval.current) clearInterval(durationInterval.current);
          durationInterval.current = setInterval(() => {
            setCallDuration((d) => d + 1);
          }, 1000);
        }
        if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
          endCall();
        }
      };

      return pc;
    },
    [userId]
  );

  const getMediaStream = useCallback(async (type: CallType) => {
    const constraints: MediaStreamConstraints = {
      audio: true,
      video: type === "video" ? { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } } : false,
    };
    return navigator.mediaDevices.getUserMedia(constraints);
  }, []);

  // Start a call (caller)
  const startCall = useCallback(
    async (type: CallType) => {
      if (!userId || !partnerId) return;
      setCallType(type);
      setCallState("calling");

      try {
        const stream = await getMediaStream(type);
        localStream.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        const pc = setupPeerConnection(stream);

        // Notify partner
        channelRef.current?.send({
          type: "broadcast",
          event: "call-offer-incoming",
          // Send the CALLER's own name so the callee sees who is ringing them.
          payload: { type, from: userId, name: selfName },
        });

        // Create offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        channelRef.current?.send({
          type: "broadcast",
          event: "call-offer",
          payload: { sdp: offer.sdp, type: offer.type, callType: type, from: userId },
        });
      } catch (err) {
        console.error("Failed to start call:", err);
        cleanup();
        setCallState("idle");
      }
    },
    [userId, partnerId, getMediaStream, setupPeerConnection, cleanup, selfName]
  );

  // Accept incoming call
  const acceptCall = useCallback(
    async (type: CallType) => {
      if (!userId) return;
      setCallType(type);
      setCallState("connected");
      setIncomingCall(null);

      try {
        const stream = await getMediaStream(type);
        localStream.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        const pc = setupPeerConnection(stream);

        // Process queued ICE candidates after setting remote description
        // (will be done after answer is created)

        // The offer SDP will come via the channel - wait for it
        // Actually, we need the offer that was already received
      } catch (err) {
        console.error("Failed to accept call:", err);
        cleanup();
        setCallState("idle");
      }
    },
    [userId, getMediaStream, setupPeerConnection, cleanup]
  );

  const rejectCall = useCallback(() => {
    channelRef.current?.send({
      type: "broadcast",
      event: "call-rejected",
      payload: { from: userId },
    });
    setIncomingCall(null);
    setCallState("idle");
  }, [userId]);

  const endCall = useCallback(() => {
    channelRef.current?.send({
      type: "broadcast",
      event: "call-ended",
      payload: { from: userId },
    });
    cleanup();
    setCallState("idle");
    setIncomingCall(null);
  }, [userId, cleanup]);

  const toggleMute = useCallback(() => {
    localStream.current?.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
    setIsMuted((m) => !m);
  }, []);

  const toggleVideo = useCallback(() => {
    localStream.current?.getVideoTracks().forEach((t) => (t.enabled = !t.enabled));
    setIsVideoOff((v) => !v);
  }, []);

  // Subscribe to signaling channel
  useEffect(() => {
    const channelName = getChannelName();
    if (!channelName || !userId) return;

    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });

    channelRef.current = channel;

    let pendingOfferSdp: RTCSessionDescriptionInit | null = null;

    channel
      .on("broadcast", { event: "call-offer-incoming" }, (msg) => {
        if (msg.payload.from === userId) return;
        setIncomingCall({ type: msg.payload.type, from: msg.payload.name || "Partner" });
        setCallState("ringing");
      })
      .on("broadcast", { event: "call-offer" }, async (msg) => {
        if (msg.payload.from === userId) return;
        pendingOfferSdp = { sdp: msg.payload.sdp, type: msg.payload.type };

        // If already accepted (acceptCall was called), process now
        if (peerConnection.current && peerConnection.current.signalingState === "stable") {
          // Not yet answered - store for later
        }

        // Wait for user to accept, then process
        const waitForAccept = async () => {
          // Poll until PC exists and has tracks (user accepted)
          const maxWait = 30000;
          const start = Date.now();
          while (Date.now() - start < maxWait) {
            if (peerConnection.current && localStream.current) {
              try {
                await peerConnection.current.setRemoteDescription(
                  new RTCSessionDescription(pendingOfferSdp!)
                );

                // Process queued ICE candidates
                for (const candidate of iceCandidateQueue.current) {
                  await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
                }
                iceCandidateQueue.current = [];

                const answer = await peerConnection.current.createAnswer();
                await peerConnection.current.setLocalDescription(answer);

                channel.send({
                  type: "broadcast",
                  event: "call-answer",
                  payload: { sdp: answer.sdp, type: answer.type, from: userId },
                });
                return;
              } catch (err) {
                console.error("Error processing offer:", err);
                return;
              }
            }
            await new Promise((r) => setTimeout(r, 200));
          }
        };
        waitForAccept();
      })
      .on("broadcast", { event: "call-answer" }, async (msg) => {
        if (msg.payload.from === userId) return;
        try {
          const pc = peerConnection.current;
          if (pc) {
            await pc.setRemoteDescription(
              new RTCSessionDescription({ sdp: msg.payload.sdp, type: msg.payload.type })
            );
            // Process queued ICE candidates
            for (const candidate of iceCandidateQueue.current) {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            }
            iceCandidateQueue.current = [];
          }
        } catch (err) {
          console.error("Error processing answer:", err);
        }
      })
      .on("broadcast", { event: "ice-candidate" }, async (msg) => {
        if (msg.payload.from === userId) return;
        const pc = peerConnection.current;
        if (pc && pc.remoteDescription) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(msg.payload.candidate));
          } catch (err) {
            console.error("Error adding ICE candidate:", err);
          }
        } else {
          iceCandidateQueue.current.push(msg.payload.candidate);
        }
      })
      .on("broadcast", { event: "call-rejected" }, (msg) => {
        if (msg.payload.from === userId) return;
        cleanup();
        setCallState("idle");
        setIncomingCall(null);
      })
      .on("broadcast", { event: "call-ended" }, (msg) => {
        if (msg.payload.from === userId) return;
        cleanup();
        setCallState("idle");
        setIncomingCall(null);
      })
      .subscribe();

    return () => {
      // If a call is still live when this effect tears down (unmount / partner
      // change), tell the peer and release camera/mic/PC/duration interval.
      if (callStateRef.current !== "idle") {
        channel.send({
          type: "broadcast",
          event: "call-ended",
          payload: { from: userId },
        });
        cleanup();
      }
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [getChannelName, userId, cleanup, setupPeerConnection, getMediaStream]);

  return {
    callState,
    callType,
    isMuted,
    isVideoOff,
    callDuration,
    incomingCall,
    localVideoRef,
    remoteVideoRef,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
  };
}
