export interface QuizQuestion {
  question: string;
  options: string[];
}

export interface QuizDefinition {
  id: string;
  title: string;
  description: string;
  emoji: string;
  duration: string;
  gradient: string;
  questions: QuizQuestion[];
}

export interface CompletedQuiz {
  quizId: string;
  title: string;
  emoji: string;
  score: number;
  totalQuestions: number;
  completedAt: string;
  answers: { question: string; yourAnswer: string; partnerAnswer: string; match: boolean }[];
  actionItems: string[];
}

export const quizDefinitions: QuizDefinition[] = [
  {
    id: "know-me",
    title: "How Well Do You Know Me?",
    description: "Answer questions about your partner's preferences, memories, and dreams.",
    emoji: "🧠",
    duration: "5 min",
    gradient: "bg-gradient-to-br from-us-blush/40 to-us-cream/60",
    questions: [
      { question: "What's my favourite comfort food?", options: ["Pizza", "Mac & cheese", "Chocolate", "Soup"] },
      { question: "What do I do first thing in the morning?", options: ["Check phone", "Stretch", "Make coffee", "Cuddle"] },
      { question: "What's my biggest fear?", options: ["Heights", "Spiders", "Being alone", "Failure"] },
      { question: "Where would I most want to travel?", options: ["Japan", "Italy", "New Zealand", "Iceland"] },
      { question: "What's my love language?", options: ["Words of affirmation", "Quality time", "Physical touch", "Acts of service"] },
      { question: "What makes me laugh the hardest?", options: ["Silly voices", "Memes", "Physical comedy", "Dry humour"] },
      { question: "What's my dream job?", options: ["Creative director", "Travel writer", "Chef", "Entrepreneur"] },
      { question: "How do I relax after a hard day?", options: ["Bath", "TV show", "Walk", "Cook"] },
      { question: "What song always puts me in a good mood?", options: ["A pop hit", "A throwback", "Something chill", "Something energetic"] },
      { question: "What am I most proud of?", options: ["Career", "Relationships", "Personal growth", "A specific achievement"] },
    ],
  },
  {
    id: "love-language",
    title: "Love Language Check-In",
    description: "Discover how your love languages have evolved over time.",
    emoji: "💕",
    duration: "3 min",
    gradient: "bg-gradient-to-br from-us-coral/10 to-us-blush/30",
    questions: [
      { question: "I feel most loved when my partner…", options: ["Tells me they love me", "Plans quality time", "Gives a thoughtful gift", "Helps with tasks"] },
      { question: "After a tough week, I need…", options: ["A heartfelt conversation", "A cosy night in", "A hug", "Someone to handle things"] },
      { question: "The best surprise would be…", options: ["A love letter", "A weekend trip", "A meaningful gift", "Coming home to a clean house"] },
      { question: "I feel disconnected when…", options: ["We don't talk deeply", "We're always busy", "There's no affection", "I feel unsupported"] },
      { question: "My ideal date night is…", options: ["Deep conversation over dinner", "An adventure together", "Cuddling and a movie", "Cooking together"] },
      { question: "I show love by…", options: ["Saying encouraging things", "Making plans together", "Being physically close", "Doing helpful things"] },
      { question: "A small gesture that means a lot:", options: ["A sweet text", "Undivided attention", "Holding hands", "Making me tea"] },
      { question: "When I'm stressed, I want you to…", options: ["Talk it through", "Be present quietly", "Hold me", "Take something off my plate"] },
    ],
  },
  {
    id: "dream-life",
    title: "Dream Life Alignment",
    description: "Are your future visions in sync? Find out where you align and differ.",
    emoji: "🌙",
    duration: "7 min",
    gradient: "bg-gradient-to-br from-us-sage/20 to-us-cream/40",
    questions: [
      { question: "In 5 years, where do we live?", options: ["City centre", "Suburbs", "Countryside", "Abroad"] },
      { question: "How many kids (if any)?", options: ["None", "One", "Two", "Three+"] },
      { question: "Our ideal home has…", options: ["Big garden", "City views", "Cosy kitchen", "Home office"] },
      { question: "We retire and…", options: ["Travel the world", "Live by the sea", "Start a passion project", "Be near family"] },
      { question: "Our next big purchase should be…", options: ["Property", "A trip", "A car", "Investments"] },
      { question: "Work-life balance means…", options: ["Flexible hours", "Weekends sacred", "Remote work", "Clear boundaries"] },
      { question: "Our holiday style is…", options: ["Adventure", "Relaxation", "Cultural", "Spontaneous"] },
      { question: "A pet in our future?", options: ["Dog", "Cat", "Both", "No pets"] },
      { question: "We handle finances by…", options: ["Joint account", "Split everything", "One manages", "Mix of both"] },
      { question: "What matters most for our future?", options: ["Security", "Freedom", "Family", "Experiences"] },
      { question: "Our social life looks like…", options: ["Big friend groups", "Small close circle", "Mostly us", "Mix of everything"] },
      { question: "Legacy we want to leave…", options: ["Happy family", "Creative work", "Community impact", "Financial security"] },
    ],
  },
  {
    id: "conflict-style",
    title: "Conflict Style Quiz",
    description: "Understand how you each handle disagreements.",
    emoji: "🤝",
    duration: "4 min",
    gradient: "bg-gradient-to-br from-us-gold/15 to-us-cream/40",
    questions: [
      { question: "When upset, I tend to…", options: ["Talk immediately", "Need space first", "Write my feelings", "Go quiet"] },
      { question: "During an argument, I…", options: ["Stay calm", "Get emotional", "Try to fix it fast", "Shut down"] },
      { question: "After a disagreement, I need…", options: ["To talk it out", "Time alone", "Physical comfort", "A distraction"] },
      { question: "I apologise by…", options: ["Saying sorry directly", "Showing through actions", "Writing a message", "Giving space then reconnecting"] },
      { question: "The thing that frustrates me most is…", options: ["Being dismissed", "Raised voices", "Passive aggression", "Unresolved issues"] },
      { question: "I feel heard when…", options: ["You repeat back what I said", "You ask follow-up questions", "You hold my hand", "You make changes"] },
      { question: "Compromise means…", options: ["Meeting halfway", "Taking turns", "Finding a third option", "Letting small things go"] },
      { question: "Our conflict resolution could improve by…", options: ["More patience", "Better timing", "More empathy", "Clearer communication"] },
    ],
  },
];

const actionItemTemplates: Record<string, string[]> = {
  "know-me": [
    "Plan a date around your partner's favourite comfort food",
    "Ask your partner about a dream they haven't shared yet",
    "Create a playlist of songs that make you both happy",
  ],
  "love-language": [
    "Practice your partner's top love language this week",
    "Schedule a check-in to discuss how you both feel loved",
    "Do one small gesture in their love language daily",
  ],
  "dream-life": [
    "Create a shared vision board for your future together",
    "Have a dedicated 'dream planning' date night",
    "Set one shared goal to work towards this month",
  ],
  "conflict-style": [
    "Agree on a 'pause' signal for heated moments",
    "Write each other a letter about what you need during conflict",
    "Practice active listening in your next disagreement",
  ],
};

export function generateActionItems(quizId: string): string[] {
  return actionItemTemplates[quizId] || ["Discuss your results together", "Try something new based on your answers"];
}
