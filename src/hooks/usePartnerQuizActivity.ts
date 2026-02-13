import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { quizDefinitions } from "@/data/quizData";

interface PartnerQuizActivity {
  quizId: string;
  quizTitle: string;
  quizEmoji: string;
  startedAt: string;
}

export function usePartnerQuizActivity() {
  const { user, profile } = useAuth();
  const [partnerActivity, setPartnerActivity] = useState<PartnerQuizActivity | null>(null);

  useEffect(() => {
    if (!user || !profile?.partner_id) return;

    // Subscribe to partner's new quiz sessions (not yet completed)
    const channel = supabase
      .channel("partner-quiz-activity")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "quiz_sessions",
        },
        (payload: any) => {
          const session = payload.new;
          // Only show if it's the partner's session
          if (session.user_id === profile.partner_id) {
            const quiz = quizDefinitions.find((q) => q.id === session.quiz_id);
            setPartnerActivity({
              quizId: session.quiz_id,
              quizTitle: quiz?.title || session.quiz_id,
              quizEmoji: quiz?.emoji || "📝",
              startedAt: session.created_at,
            });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "quiz_sessions",
        },
        (payload: any) => {
          const session = payload.new;
          // Clear activity when partner completes quiz
          if (session.user_id === profile.partner_id && session.completed_at) {
            setPartnerActivity(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, profile?.partner_id]);

  const dismiss = () => setPartnerActivity(null);

  return { partnerActivity, dismiss };
}
