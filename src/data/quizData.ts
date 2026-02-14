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
    id: "intimacy-style",
    title: "Intimacy Style Check",
    description: "Discover how you each experience and express closeness.",
    emoji: "🫶",
    duration: "5 min",
    gradient: "bg-gradient-to-br from-us-blush/30 to-us-coral/15",
    questions: [
      { question: "I feel closest to you when…", options: ["We talk for hours", "We're doing nothing together", "We're physically close", "We're laughing together"] },
      { question: "My ideal morning together is…", options: ["Lazy breakfast in bed", "An early walk", "Cuddling with coffee", "Separate quiet time then reconnect"] },
      { question: "I need alone time…", options: ["Daily", "A few times a week", "Rarely", "Only when stressed"] },
      { question: "Physical affection is…", options: ["Essential every day", "Nice but not critical", "Sometimes too much", "My primary connection"] },
      { question: "I feel most intimate during…", options: ["Deep conversations", "Shared experiences", "Physical closeness", "Comfortable silence"] },
      { question: "When I'm vulnerable, I want you to…", options: ["Listen without fixing", "Hold me", "Distract me", "Give me space then check in"] },
      { question: "Our best shared activity is…", options: ["Cooking together", "Watching shows", "Exercising together", "Exploring new places"] },
      { question: "I recharge my emotional battery by…", options: ["Quality time with you", "Solo hobbies", "Social time with friends", "Being in nature"] },
      { question: "Emotional intimacy means…", options: ["Sharing fears", "Being fully seen", "Trusting completely", "Feeling safe to be silly"] },
      { question: "I wish we had more…", options: ["Spontaneous affection", "Deep conversations", "Playful moments", "Quiet togetherness"] },
    ],
  },
  {
    id: "trust-check",
    title: "Trust & Safety Check-In",
    description: "How safe and trusting do you feel? A gentle, honest exploration.",
    emoji: "🛡️",
    duration: "5 min",
    gradient: "bg-gradient-to-br from-us-sage/20 to-us-gold/10",
    questions: [
      { question: "I trust my partner with my deepest secrets…", options: ["Completely", "Mostly", "Somewhat", "Working on it"] },
      { question: "When my partner makes a promise, I feel…", options: ["Totally confident", "Mostly reassured", "A little uncertain", "It depends on the promise"] },
      { question: "I feel safe being emotionally vulnerable…", options: ["Always", "Usually", "Sometimes", "Rarely"] },
      { question: "If something bothered me, I would…", options: ["Say it straight away", "Wait for the right moment", "Hint at it", "Keep it to myself"] },
      { question: "I feel most secure when…", options: ["We communicate openly", "Plans are clear", "There's physical closeness", "We're on the same page about the future"] },
      { question: "Jealousy in our relationship is…", options: ["Non-existent", "Rare and manageable", "Comes up sometimes", "Something we need to address"] },
      { question: "I feel respected when…", options: ["My opinions matter", "My boundaries are honoured", "I'm included in decisions", "All of the above"] },
      { question: "Our trust has grown because…", options: ["We've overcome challenges", "Consistent honesty", "Being reliable", "Forgiving mistakes"] },
    ],
  },
  {
    id: "romance-style",
    title: "Romance Preferences",
    description: "Big gestures or small moments? Find out what romance means to each of you.",
    emoji: "🌹",
    duration: "4 min",
    gradient: "bg-gradient-to-br from-us-coral/15 to-us-gold/15",
    questions: [
      { question: "The most romantic gesture is…", options: ["A surprise trip", "A handwritten letter", "Cooking my favourite meal", "A thoughtful small gift"] },
      { question: "My ideal date night is…", options: ["Fancy dinner out", "Cosy night in", "An adventure", "Something creative together"] },
      { question: "I feel most romanced when…", options: ["You plan something", "You remember small details", "You're spontaneous", "You make time for just us"] },
      { question: "Romance should happen…", options: ["Every day in small ways", "Weekly date nights", "Spontaneously", "On special occasions with effort"] },
      { question: "The best surprise you could give me…", options: ["A planned weekend away", "Flowers for no reason", "Taking over my chores", "A playlist of our songs"] },
      { question: "PDA (public affection) is…", options: ["Love it, always", "Hand-holding is perfect", "Keep it private", "Depends on my mood"] },
      { question: "A perfect anniversary would be…", options: ["Reliving our first date", "Somewhere we've never been", "A quiet celebration at home", "A big party with loved ones"] },
      { question: "Romance fades when…", options: ["Routine takes over", "We stop trying", "Life gets stressful", "We forget to prioritise us"] },
    ],
  },
  {
    id: "money-values",
    title: "Money & Values Check-In",
    description: "Align on spending, saving and financial priorities together.",
    emoji: "💰",
    duration: "5 min",
    gradient: "bg-gradient-to-br from-us-gold/20 to-us-cream/40",
    questions: [
      { question: "My money personality is…", options: ["Saver", "Spender", "Investor", "A mix depending on mood"] },
      { question: "The best way to handle joint expenses is…", options: ["Split everything 50/50", "Proportional to income", "One joint account", "Take turns paying"] },
      { question: "I feel anxious about money when…", options: ["We overspend", "There's no savings buffer", "We don't discuss it", "Unexpected bills arrive"] },
      { question: "My top financial priority is…", options: ["Saving for a home", "Experiences and travel", "Retirement/investments", "Day-to-day comfort"] },
      { question: "Spending on treats is…", options: ["Important for happiness", "OK occasionally", "Something I feel guilty about", "Best when planned"] },
      { question: "We should talk about money…", options: ["Monthly check-ins", "When something comes up", "Weekly", "As little as possible"] },
      { question: "A financial goal we should set together…", options: ["Emergency fund", "Holiday savings", "Investment plan", "Debt payoff"] },
      { question: "The biggest money disagreement couples have is…", options: ["Different spending habits", "Secret purchases", "Unequal contributions", "Different priorities"] },
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
  {
    id: "challenges",
    title: "Challenges Quiz",
    description: "Deep, honest questions about your relationship's challenges. Answer privately, then compare.",
    emoji: "🪞",
    duration: "15 min",
    gradient: "bg-gradient-to-br from-us-terracotta/15 to-us-cream/30",
    questions: [
      { question: "What's something I do that hurts you?", options: ["Being dismissive", "Not listening", "Being too critical", "Withdrawing emotionally"] },
      { question: "What's your favorite thing about how we resolve conflicts?", options: ["We stay calm", "We apologise quickly", "We listen to each other", "We compromise well"] },
      { question: "Is there a challenge you've been hesitant to bring up?", options: ["Yes, about finances", "Yes, about intimacy", "Yes, about family", "No, I share everything"] },
      { question: "What's an area where you feel misunderstood?", options: ["My emotions", "My needs", "My ambitions", "My boundaries"] },
      { question: "What expectation about our relationship hasn't been met?", options: ["More quality time", "Better communication", "More romance", "More support"] },
      { question: "When do you feel most insecure in our relationship?", options: ["When we argue", "When we're apart", "When plans change", "When I feel ignored"] },
      { question: "Have you ever felt emotionally disconnected from me?", options: ["Yes, often", "Sometimes", "Rarely", "Never"] },
      { question: "What in our relationship makes you anxious?", options: ["Uncertainty about the future", "Unresolved arguments", "Lack of quality time", "Nothing specific"] },
      { question: "What patterns have you noticed in our past conflicts?", options: ["We repeat the same arguments", "One of us shuts down", "We resolve quickly", "We avoid the topic"] },
      { question: "What frustrates you about our communication style?", options: ["Too indirect", "Too reactive", "Not enough of it", "Timing is off"] },
      { question: "What past hurt still affects you?", options: ["A broken promise", "Harsh words", "Feeling neglected", "Nothing lingering"] },
      { question: "What behavior of mine bothers you that I may not realize?", options: ["Phone use around you", "Tone of voice", "Being distracted", "Making assumptions"] },
      { question: "What would you change about our relationship dynamic?", options: ["More equality", "More spontaneity", "More affection", "More independence"] },
      { question: "When we argue, what makes resolution harder?", options: ["Raising voices", "Bringing up the past", "Going silent", "Being defensive"] },
      { question: "What's something you're sensitive to in relationships?", options: ["Being criticised", "Feeling controlled", "Being compared", "Feeling unappreciated"] },
      { question: "What's the most challenging part of maintaining our relationship?", options: ["Balancing time", "Staying connected", "Managing expectations", "Handling stress together"] },
      { question: "What fear do you have about our future?", options: ["Growing apart", "Financial stress", "Losing passion", "No specific fear"] },
      { question: "What's your favorite thing about our current routine?", options: ["Morning rituals", "Evening downtime", "Weekend adventures", "Daily check-ins"] },
      { question: "What personal sacrifice hasn't been acknowledged?", options: ["Career compromises", "Social sacrifices", "Emotional labour", "All are acknowledged"] },
      { question: "What would make you consider leaving this relationship?", options: ["Betrayal of trust", "Constant conflict", "Feeling unloved", "Nothing would"] },
      { question: "What have you been holding back?", options: ["A need for change", "An unspoken feeling", "A future wish", "Nothing, I'm open"] },
      { question: "What's the biggest challenge we've faced?", options: ["Long distance", "Family issues", "Trust issues", "Life transitions"] },
      { question: "Do I make you feel unsupported or unheard?", options: ["Sometimes unsupported", "Sometimes unheard", "Both at times", "No, I feel supported"] },
      { question: "Have you ever thought about cheating?", options: ["Never", "Fleetingly", "During rough patches", "Prefer not to say"] },
      { question: "What frustrates you that you haven't shared yet?", options: ["A habit of yours", "How we spend time", "Our intimacy", "Nothing unshared"] },
      { question: "What past conflict still needs more resolution?", options: ["A specific argument", "A trust issue", "A family matter", "All are resolved"] },
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
  "challenges": [
    "Have an open conversation about one unresolved issue",
    "Write down three things you appreciate about each other",
    "Set aside time weekly to check in on how you're both feeling",
  ],
  "intimacy-style": [
    "Try your partner's preferred way of connecting this week",
    "Schedule a 'no phones' evening together",
    "Share one thing that makes you feel closest to them",
  ],
  "trust-check": [
    "Share something you've been holding back",
    "Acknowledge one way your partner makes you feel safe",
    "Commit to one trust-building habit this month",
  ],
  "romance-style": [
    "Plan a surprise based on your partner's answers",
    "Recreate a favourite romantic memory together",
    "Start a 'romance jar' with date ideas you both love",
  ],
  "money-values": [
    "Set up a monthly money date to review finances together",
    "Agree on one shared financial goal for the next 3 months",
    "Create a joint 'fun fund' for guilt-free treats",
  ],
};

export function generateActionItems(quizId: string): string[] {
  return actionItemTemplates[quizId] || ["Discuss your results together", "Try something new based on your answers"];
}
