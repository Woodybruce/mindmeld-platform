export interface ReflectionQuestion {
  id: string;
  question: string;
  placeholder?: string;
}

export interface ReflectionQuizDefinition {
  id: string;
  title: string;
  description: string;
  emoji: string;
  duration: string;
  gradient: string;
  questions: ReflectionQuestion[];
}

export const reflectionQuizzes: ReflectionQuizDefinition[] = [
  {
    id: "challenges",
    title: "Challenges Quiz",
    description: "Deep, honest questions about your relationship's challenges. Answer privately, then compare.",
    emoji: "🪞",
    duration: "15 min",
    gradient: "bg-gradient-to-br from-us-terracotta/15 to-us-cream/30",
    questions: [
      { id: "c1", question: "What's something I do that hurts you?" },
      { id: "c2", question: "What's your favorite thing about how we resolve conflicts?" },
      { id: "c3", question: "Is there a challenge you've been hesitant to bring up?" },
      { id: "c4", question: "What's an area where you feel misunderstood in our relationship?" },
      { id: "c5", question: "What expectation about our romantic relationship hasn't been met?" },
      { id: "c6", question: "When do you feel most insecure in our relationship?" },
      { id: "c7", question: "Have you ever felt emotionally disconnected from me?" },
      { id: "c8", question: "What in our relationship makes you anxious?" },
      { id: "c9", question: "What patterns have you noticed in our past conflicts?" },
      { id: "c10", question: "What's one thing that frustrates you about our communication style?" },
      { id: "c11", question: "What past hurt or unresolved issue still affects you?" },
      { id: "c12", question: "What behavior of mine bothers you that I may not realize?" },
      { id: "c13", question: "What would you change about our relationship dynamic?" },
      { id: "c14", question: "When we argue, what do I do that makes resolution harder?" },
      { id: "c15", question: "What's something you're sensitive to or find annoying in relationships?" },
      { id: "c16", question: "What's the most challenging part of maintaining our relationship?" },
      { id: "c17", question: "What fear or anxiety do you have about our future?" },
      { id: "c18", question: "What's your favorite thing about our current routine?" },
      { id: "c19", question: "What personal sacrifice have you made that hasn't been acknowledged?" },
      { id: "c20", question: "What would make you consider leaving this relationship?" },
      { id: "c21", question: "What have you been holding back in our relationship?" },
      { id: "c22", question: "What's the biggest challenge we've faced as a couple?" },
      { id: "c23", question: "Do I make you feel unsupported or unheard?" },
      { id: "c24", question: "Have you ever thought about cheating?" },
      { id: "c25", question: "What frustrates you that you haven't shared yet?" },
      { id: "c26", question: "What past conflict still affects you, and does it need more resolution?" },
    ],
  },
];
