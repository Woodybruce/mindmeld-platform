import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, Heart, Timer, Trophy, ArrowLeft, Zap, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { apiInvoke } from "@/lib/api";
import { toast } from "sonner";

const rewardOptions = [
  { id: "task", label: "Task Favour", desc: "Loser does a chore of winner's choice", icon: "🧹", color: "from-blue-400 to-blue-600" },
  { id: "intimacy", label: "Intimacy Reward", desc: "Winner chooses a romantic treat", icon: "💋", color: "from-us-coral to-us-terracotta" },
  { id: "giftcard", label: "Gift Card", desc: "Loser buys a £10-25 gift card", icon: "🎁", color: "from-us-gold to-amber-500" },
  { id: "dinner", label: "Dinner Date", desc: "Loser plans & pays for dinner", icon: "🍽️", color: "from-us-sage to-emerald-500" },
];

const timeOptions = [
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
  { label: "1 hour", value: 60 },
];

interface PartnerGame {
  reward: string;
  timeMinutes: number;
  startedBy: string;
  startedAt: number;
}

interface KissChaseSetupProps {
  onStart: (reward: string, timeMinutes: number) => void;
  partnerGame?: PartnerGame | null;
  onJoinPartner?: () => void;
}

const KissChaseSetup = ({ onStart, partnerGame, onJoinPartner }: KissChaseSetupProps) => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [selectedReward, setSelectedReward] = useState<string | null>("task");
  const [selectedTime, setSelectedTime] = useState<number>(30);
  const [inviteSent, setInviteSent] = useState(false);

  const sendInviteToPartner = async () => {
    if (!user || !profile?.partner_id) {
      toast.error("Link your partner first in Profile");
      return;
    }

    // Send both a chat message AND push notification for reliability
    try {
      // Chat message so partner sees it in-app
      await supabase.from("messages").insert({
        sender_id: user.id,
        receiver_id: profile.partner_id,
        content: "💋 I've started a Kiss Chase game! Open the app and join me! 🏃‍♂️",
        message_type: "text",
      } as any);
    } catch (e) {
      console.warn("Chat message failed:", e);
    }

    // Push notification for when app is closed
    try {
      const { data: pushResult, error: pushError } = await apiInvoke("send-push-notification", {
        body: {
          recipientUserId: profile.partner_id,
          title: "💋 Kiss Chase!",
          body: `${profile.username || "Your partner"} wants to play Kiss Chase! Tap to join.`,
          data: { route: "/kiss-chase" },
        },
      });

      if (pushError) {
        console.warn("Push notification error:", pushError);
        toast.success("Invite sent via chat! (Push notification unavailable)");
      } else if (pushResult?.sent === 0) {
        toast.success("Invite sent via chat! Tell your partner to open the app 💋");
      } else {
        toast.success("Invite sent to your partner! 💋");
      }
    } catch (e) {
      console.warn("Push notification failed:", e);
      toast.success("Invite sent via chat! 💋");
    }

    setInviteSent(true);
  };

  const hasPartner = !!profile?.partner_id;

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate("/")} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-display text-xl font-bold">Kiss Chase</h1>
        </div>
      </div>

      <div className="px-4 py-6 space-y-8">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-3"
        >
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-us-coral to-us-terracotta mx-auto flex items-center justify-center">
            <span className="text-4xl">💋</span>
          </div>
          <h2 className="font-display text-2xl font-bold text-foreground">Ready to Chase?</h2>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">
            Your partner's location will be shown on the map. Find them before time runs out!
          </p>
        </motion.div>

        {/* Partner started — join banner */}
        {partnerGame && onJoinPartner && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-r from-us-coral/20 to-us-terracotta/20 border-2 border-us-coral/40 rounded-2xl p-5 text-center space-y-3"
          >
            <motion.span
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="text-4xl inline-block"
            >
              💋
            </motion.span>
            <p className="text-sm font-bold text-foreground">Your partner started a Kiss Chase!</p>
            <p className="text-xs text-muted-foreground">
              {partnerGame.timeMinutes} min • {partnerGame.reward} reward
            </p>
            <Button
              onClick={onJoinPartner}
              className="w-full h-12 rounded-xl text-base font-semibold bg-gradient-to-r from-us-coral to-us-terracotta text-primary-foreground"
            >
              Join the Chase! 🏃‍♂️
            </Button>
          </motion.div>
        )}

        {/* Partner status */}
        {!hasPartner && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4 text-center"
          >
            <p className="text-sm font-semibold text-destructive">No partner linked</p>
            <p className="text-xs text-muted-foreground mt-1">Go to Profile and link your partner's email to play together with real locations.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/profile")}
              className="mt-3"
            >
              Go to Profile
            </Button>
          </motion.div>
        )}

        {hasPartner && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[hsl(var(--us-sage))]/10 border border-[hsl(var(--us-sage))]/20 rounded-2xl p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[hsl(var(--us-sage))]" />
                  Partner linked ✓
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Both of you need the game open to see live locations</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={sendInviteToPartner}
                disabled={inviteSent}
                className="gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                {inviteSent ? "Sent!" : "Invite"}
              </Button>
            </div>
          </motion.div>
        )}

        {/* Time selection */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h3 className="font-display text-lg font-semibold mb-3 flex items-center gap-2">
            <Timer className="w-5 h-5 text-us-coral" /> Time Limit
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {timeOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSelectedTime(opt.value)}
                className={`py-3 rounded-xl text-sm font-medium transition-all ${
                  selectedTime === opt.value
                    ? "bg-gradient-to-br from-us-coral to-us-terracotta text-primary-foreground shadow-lg"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Reward selection */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h3 className="font-display text-lg font-semibold mb-3 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-us-gold" /> What's at Stake?
          </h3>
          <div className="space-y-3">
            {rewardOptions.map((reward) => (
              <button
                key={reward.id}
                onClick={() => setSelectedReward(reward.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${
                  selectedReward === reward.id
                    ? "border-us-coral bg-us-coral/5 shadow-md"
                    : "border-border bg-card"
                }`}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${reward.color} flex items-center justify-center text-2xl`}>
                  {reward.icon}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{reward.label}</p>
                  <p className="text-xs text-muted-foreground">{reward.desc}</p>
                </div>
                {selectedReward === reward.id && (
                  <div className="w-6 h-6 rounded-full bg-us-coral flex items-center justify-center">
                    <Zap className="w-3.5 h-3.5 text-primary-foreground" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Start button */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Button
            onClick={() => selectedReward && onStart(selectedReward, selectedTime)}
            disabled={!selectedReward}
            className="w-full h-14 rounded-2xl text-lg font-semibold bg-gradient-to-r from-us-coral to-us-terracotta text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            <MapPin className="w-5 h-5 mr-2" />
            {hasPartner ? "Start the Chase!" : "Practice Mode (Simulated)"}
          </Button>
          <p className="text-center text-xs text-muted-foreground mt-2">
            {hasPartner
              ? "Location permission will be requested • Make sure your partner opens the game too!"
              : "Playing with a simulated partner • Link your partner for real locations"}
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default KissChaseSetup;
