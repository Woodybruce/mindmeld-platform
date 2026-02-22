import { useState } from "react";
import KissChaseSetup from "@/components/KissChaseSetup";
import KissChaseGame from "@/components/KissChaseGame";
import KissChaseResult from "@/components/KissChaseResult";
import { useGameSession } from "@/hooks/useGameSession";
import { useAuth } from "@/contexts/AuthContext";
import { apiInvoke } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";

type GamePhase = "setup" | "playing" | "result";

const KissChasePage = () => {
  const [phase, setPhase] = useState<GamePhase>("setup");
  const [reward, setReward] = useState("task");
  const [timeMinutes, setTimeMinutes] = useState(30);
  const [caught, setCaught] = useState(false);
  const { user, profile } = useAuth();

  const { partnerGame, broadcastStart, broadcastQuit, clearPartnerGame } = useGameSession();

  const handleStart = (selectedReward: string, selectedTime: number) => {
    setReward(selectedReward);
    setTimeMinutes(selectedTime);
    broadcastStart(selectedReward, selectedTime);
    setPhase("playing");

    if (user && profile?.partner_id) {
      const displayName = profile.username || "Your partner";

      supabase.from("messages").insert({
        sender_id: user.id,
        receiver_id: profile.partner_id,
        content: `💋 ${displayName} started a Kiss Chase! Open the app and join before time runs out! 🏃‍♂️`,
        message_type: "text",
      } as any).then(() => {});

      apiInvoke("send-push-notification", {
        body: {
          recipientUserId: profile.partner_id,
          title: "💋 Kiss Chase!",
          body: `${displayName} started a Kiss Chase! Tap to join.`,
          data: { route: "/kiss-chase" },
        },
      }).then(() => {});
    }
  };

  // Partner started — join their game
  const handleJoinPartner = () => {
    if (!partnerGame) return;
    // Calculate remaining time based on when partner started
    const elapsedSec = Math.floor((Date.now() - partnerGame.startedAt) / 1000);
    const remaining = Math.max(partnerGame.timeMinutes * 60 - elapsedSec, 60);
    setReward(partnerGame.reward);
    setTimeMinutes(Math.ceil(remaining / 60));
    clearPartnerGame();
    setPhase("playing");
  };

  const handleCatch = () => {
    setCaught(true);
    setPhase("result");
  };

  const handleTimeUp = () => {
    setCaught(false);
    setPhase("result");
  };

  const handleQuit = () => {
    broadcastQuit();
    setPhase("setup");
  };

  if (phase === "playing") {
    return (
      <KissChaseGame
        reward={reward}
        timeMinutes={timeMinutes}
        onCatch={handleCatch}
        onTimeUp={handleTimeUp}
        onQuit={handleQuit}
      />
    );
  }

  if (phase === "result") {
    return <KissChaseResult caught={caught} reward={reward} />;
  }

  return (
    <KissChaseSetup
      onStart={handleStart}
      partnerGame={partnerGame}
      onJoinPartner={handleJoinPartner}
    />
  );
};

export default KissChasePage;
