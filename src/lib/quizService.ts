import { supabase } from "@/integrations/supabase/client";
import type { QuizDefinition } from "@/data/quizData";

export interface PartnerAnswerMap {
  [questionIndex: number]: string;
}

// Create a quiz session
export async function createQuizSession(quizId: string, totalQuestions: number) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("quiz_sessions" as any)
    .insert({ user_id: user.id, quiz_id: quizId, total_questions: totalQuestions } as any)
    .select()
    .single();

  if (error) throw error;
  return data as any;
}

// Save a single answer
export async function saveQuizAnswer(sessionId: string, questionIndex: number, questionText: string, answer: string) {
  const { error } = await supabase
    .from("quiz_answers" as any)
    .insert({ session_id: sessionId, question_index: questionIndex, question_text: questionText, answer } as any);

  if (error) throw error;
}

// Complete a quiz session
export async function completeQuizSession(sessionId: string, score: number) {
  const { error } = await supabase
    .from("quiz_sessions" as any)
    .update({ score, completed_at: new Date().toISOString() } as any)
    .eq("id", sessionId);

  if (error) throw error;
}

// Get partner's answers for the same quiz
export async function getPartnerAnswers(quizId: string, myUserId: string): Promise<PartnerAnswerMap> {
  // Get partner's completed session for this quiz
  const { data: sessions } = await supabase
    .from("quiz_sessions" as any)
    .select("id, user_id")
    .eq("quiz_id", quizId)
    .not("completed_at", "is", null)
    .neq("user_id", myUserId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (!sessions || (sessions as any[]).length === 0) return {};

  const session = (sessions as any[])[0];
  const { data: answers } = await supabase
    .from("quiz_answers" as any)
    .select("question_index, answer")
    .eq("session_id", session.id);

  if (!answers) return {};

  const map: PartnerAnswerMap = {};
  (answers as any[]).forEach((a: any) => {
    map[a.question_index] = a.answer;
  });
  return map;
}

// Get all completed sessions (own + partner's)
export async function getCompletedSessions() {
  const { data } = await supabase
    .from("quiz_sessions" as any)
    .select("*")
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false });

  return (data as any[]) || [];
}

// Get answers for a session
export async function getSessionAnswers(sessionId: string) {
  const { data } = await supabase
    .from("quiz_answers" as any)
    .select("*")
    .eq("session_id", sessionId)
    .order("question_index", { ascending: true });

  return (data as any[]) || [];
}

// Subscribe to partner's quiz answers in realtime
export function subscribeToQuizAnswers(quizId: string, callback: (answer: any) => void) {
  const channel = supabase
    .channel(`quiz-answers-${quizId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "quiz_answers",
      },
      (payload) => callback(payload.new)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
