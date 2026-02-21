import { useState } from "react";
import KissChaseSetup from "@/components/KissChaseSetup";
import KissChaseGame from "@/components/KissChaseGame";
import KissChaseResult from "@/components/KissChaseResult";
import { useGameSession } from "@/hooks/useGameSession";

type GamePhase = "setup" | "playing" | "result";

const KissChasePage = () => {
  const [phase, setPhase] = useState<GamePhase>("setup");
  const [reward, setReward] = useState("task");
  const [timeMinutes, setTimeMinutes] = useState(30);
  const [caught, setCaught] = useState(false);

  const { partnerGame, broadcastStart, broadcastQuit, clearPartnerGame } = useGameSession();

  const handleStart = (selectedReward: string, selectedTime: number) => {
    setReward(selectedReward);
    setTimeMinutes(selectedTime);
    broadcastStart(selectedReward, selectedTime);
    setPhase("playing");
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
