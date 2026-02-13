export interface LoveLanguageIdea {
  id: string;
  title: string;
  emoji: string;
  color: string;
  whatItMeans: string;
  example: string;
  insight: string;
  experienceStories: string[];
  proTip: string;
  everydayIdeas: string[];
  researchInsight: string;
}

export const loveLanguageIdeas: LoveLanguageIdea[] = [
  {
    id: "words-of-affirmation",
    title: "Words of Affirmation",
    emoji: "💬",
    color: "us-coral",
    whatItMeans: "Expressing love through verbal appreciation, praise, and encouragement.",
    example: "You notice your partner lights up when you compliment their cooking, and they often say things like: \"Do you think I did okay?\" or \"Tell me what you liked about it.\"",
    insight: "They're not fishing for compliments — they genuinely feel loved through kind, affirming words.",
    experienceStories: [
      "I remember one time I complimented my partner on how thoughtfully she packed our kids' lunch boxes for a school trip. Her face lit up in a way that made it clear this meant more than just a \"thanks\". That moment helped me realize that affirming her efforts verbally really filled her love tank.",
    ],
    proTip: "Be specific. \"You're amazing\" is nice, but \"You handled that meeting like a pro\" feels more personal.",
    everydayIdeas: [
      "Leave sticky notes with sweet messages",
      "Send a midday \"thinking of you\" text",
      "Compliment something small (shirt, parenting, energy)",
      "Start the day with a compliment",
      "Record a short love note voice message",
      "Praise them in front of others",
      "Say \"thank you\" for small tasks",
      "Keep a shared compliment journal",
      "Post a private love message on social media",
      "Create an affirmation jar for rough days",
    ],
    researchInsight: "A review in Current Directions in Psychological Science (Impett et al., 2024) suggests it's the intentionality behind affirming language — appreciation and emotional support — that uplifts relationships, rather than the existence of one fixed \"primary\" love language.",
  },
  {
    id: "quality-time",
    title: "Quality Time",
    emoji: "⏰",
    color: "us-sage",
    whatItMeans: "Giving your undivided attention — no screens, no distractions.",
    example: "Your partner seems frustrated when you're on your phone during dinner but relaxes and becomes more affectionate when you go for a walk together or spend a quiet hour talking.",
    insight: "They feel most connected when they have your full attention.",
    experienceStories: [
      "My husband and I started doing Sunday morning walks during the pandemic. No phones, no agenda, just coffee in hand and conversation. It became our favorite ritual, and we both noticed how much more connected we felt afterward.",
      "One night we turned off the TV and just sat on the balcony talking about our favorite childhood memories. It started casual but turned into a two-hour conversation full of laughter, stories, and even a few tears. That night reminded me how simple presence can feel sacred.",
    ],
    proTip: "Schedule it if you have to — intentional presence matters more than spontaneity.",
    everydayIdeas: [
      "Take a tech-free walk",
      "Do a screen-free breakfast ritual",
      "Cook a new recipe together",
      "Share a playlist and listen side by side",
      "Read a book together",
      "Look through old photos",
      "Go stargazing",
      "Do a puzzle or build something",
      "Take turns sharing childhood memories",
      "Have a 15-minute check-in nightly",
    ],
    researchInsight: "Couples who spend intentional time together report deeper emotional connection (Gottman, 1999). A qualitative study with married couples (Tehran-based, 2023) found that regularly practicing love languages — especially quality time — significantly improved emotional intimacy and communication satisfaction.",
  },
  {
    id: "receiving-gifts",
    title: "Receiving Gifts",
    emoji: "🎁",
    color: "us-gold",
    whatItMeans: "Showing love with thoughtful, symbolic items — not big price tags.",
    example: "You bring home their favorite snack randomly and they get emotional, saying \"You remembered!\" Or they save tickets, wrappers, and notes from past dates.",
    insight: "It's not about cost — it's about thoughtfulness and meaning.",
    experienceStories: [
      "For his birthday one year, instead of buying something fancy, I made a '52 Reasons Why I Love You' deck from an old card set. He teared up while flipping through it — and still pulls it out when we're apart. It taught me that gifts with emotional depth become treasured keepsakes.",
    ],
    proTip: "It's about knowing what makes them feel seen.",
    everydayIdeas: [
      "Bring home their favorite snack",
      "Wrap a handwritten note or sketch",
      "Create a \"thinking of you\" digital album",
      "Personalize a small gift (keychain, mug)",
      "Subscribe them to something fun",
      "Mail them a surprise, even if you live together",
      "Gift a photo memory box",
      "Leave flowers in their car",
      "Gift something tied to an inside joke",
      "Create a DIY \"just because\" basket",
    ],
    researchInsight: "Systematic reviews (2023–2024) show gift receiving is one of the least commonly preferred love languages, but when it matches a partner's preference, it still correlates strongly with relationship satisfaction.",
  },
  {
    id: "acts-of-service",
    title: "Acts of Service",
    emoji: "🤲",
    color: "us-terracotta",
    whatItMeans: "Doing things that ease your partner's load.",
    example: "They warm up your car, fold your laundry, make coffee without being asked — and they beam when you take something off their plate like doing the dishes or scheduling an appointment.",
    insight: "Helping is loving. Actions speak louder than words.",
    experienceStories: [
      "When we had a newborn and I was running on no sleep, he cleaned the entire apartment and prepared lunch for me while I napped. I cried — not because of the food, but because I felt deeply understood. That day I realized how healing love can be when it's shown.",
    ],
    proTip: "These small actions say \"I've got your back.\"",
    everydayIdeas: [
      "Tidy their workspace",
      "Handle their least favorite chore",
      "Make them coffee or tea",
      "Cook their favorite meal",
      "Fill their gas tank",
      "Book their appointment for them",
      "Bring them water without being asked",
      "Fold laundry while they relax",
      "Warm up their towel or slippers",
      "Finish a task they've been avoiding",
    ],
    researchInsight: "Studies on prosocial behavior (2022) show acts of kindness release oxytocin and boost life satisfaction, giving neurochemical support to the idea that acts of service strengthen bonding.",
  },
  {
    id: "physical-touch",
    title: "Physical Touch",
    emoji: "🫂",
    color: "us-blush",
    whatItMeans: "Affectionate, loving touch: cuddling, holding hands, hugs, gentle physical closeness.",
    example: "They reach for your hand, cuddle close, touch your arm while talking — and after conflict, a hug does more than words.",
    insight: "Physical closeness is their emotional safe zone.",
    experienceStories: [
      "Sometimes after a hard day, he'll just pull me into a long, silent hug. No words. Just arms. There's something in that stillness that says 'I've got you' more than anything else. That kind of touch doesn't fix the problem, but it makes me feel like I don't face it alone.",
    ],
    proTip: "It's not always about sex — comforting touch matters just as much.",
    everydayIdeas: [
      "Sit close while watching a show",
      "Hold hands walking or in bed",
      "Run fingers through their hair",
      "Cuddle after a long day",
      "Give spontaneous kisses",
      "Rest your head on their shoulder",
      "Touch their arm while talking",
      "Massage their neck while they work",
      "Slow dance at home",
      "Hug for 20+ seconds",
    ],
    researchInsight: "Evidence (2022–2023) suggests affectionate touch increases oxytocin, reduces cortisol, and boosts wellbeing. A 2025 Auburn University study found couples who cuddled before sleep had lower stress and stronger bonding with no negative sleep impact.",
  },
];
