import { useState } from "react";
import KissChaseSetup from "@/components/KissChaseSetup";
import KissChaseGame from "@/components/KissChaseGame";
import KissChaseResult from "@/components/KissChaseResult";

type GamePhase = "setup" | "playing" | "result";

const KissChasePage = () => {
  const [phase, setPhase] = useState<GamePhase>("setup");
  const [reward, setReward] = useState("task");
  const [timeMinutes, setTimeMinutes] = useState(30);
  const [caught, setCaught] = useState(false);

  const handleStart = (selectedReward: string, selectedTime: number) => {
    setReward(selectedReward);
    setTimeMinutes(selectedTime);
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

  return <KissChaseSetup onStart={handleStart} />;
};

export default KissChasePage;
