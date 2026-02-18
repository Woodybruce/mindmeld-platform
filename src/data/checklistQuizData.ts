export interface ChecklistSection {
  title: string;
  /** If set, this section only shows for the specified gender selection */
  forGender?: "women" | "men";
  items: ChecklistItem[];
}

export interface ChecklistItem {
  id: string;
  text: string;
  type: "checkbox" | "rating" | "choice" | "fill";
  choices?: string[];
}

export interface ChecklistQuizDefinition {
  id: string;
  title: string;
  description: string;
  emoji: string;
  duration: string;
  gradient: string;
  /** Whether participants pick a gender-role perspective first */
  hasGenderPerspective: boolean;
  sections: ChecklistSection[];
}

export const checklistQuizzes: ChecklistQuizDefinition[] = [
  {
    id: "together-list",
    title: "Us Together",
    description: "Prioritise what matters, pick activities, and plan trips you both want to do.",
    emoji: "💑",
    duration: "5 min",
    gradient: "bg-gradient-to-br from-us-sage/20 to-us-gold/20",
    hasGenderPerspective: false,
    sections: [
      {
        title: "Our Top Priorities",
        items: [
          { id: "top-datenight", text: "Date night every week", type: "checkbox" },
          { id: "top-getaway", text: "Go away once every month together", type: "checkbox" },
          { id: "top-custom1", text: "Cook a new recipe together weekly", type: "checkbox" },
          { id: "top-custom2", text: "Have a daily check-in conversation", type: "checkbox" },
          { id: "top-custom3", text: "Exercise or walk together regularly", type: "checkbox" },
        ],
      },
      {
        title: "Things We'd Like to Do Together",
        items: [
          { id: "act-dancing", text: "Dancing", type: "checkbox" },
          { id: "act-show", text: "Go see an act", type: "checkbox" },
          { id: "act-paint", text: "Paint / draw each other", type: "checkbox" },
          { id: "act-pottery", text: "Pottery class together", type: "checkbox" },
          { id: "act-gallery", text: "Go to 2 art Galleries", type: "checkbox" },
          { id: "act-concert", text: "Attend a live concert", type: "checkbox" },
          { id: "act-wine", text: "Wine or cocktail tasting", type: "checkbox" },
          { id: "act-spa", text: "Couples spa day", type: "checkbox" },
          { id: "act-volunteer", text: "Volunteer together", type: "checkbox" },
          { id: "act-stargazing", text: "Go stargazing", type: "checkbox" },
        ],
      },
      {
        title: "Trips We Want to Do",
        items: [
          { id: "trip-scottish-lakes", text: "Scottish Lakes", type: "checkbox" },
          { id: "trip-amalfi", text: "Amalfi coast", type: "checkbox" },
          { id: "trip-colondor", text: "Colondor hotel", type: "checkbox" },
          { id: "trip-amsterdam", text: "Amsterdam", type: "checkbox" },
          { id: "trip-scotland-lake", text: "Scotland lake house", type: "checkbox" },
          { id: "trip-comporta", text: "Comporta Portugal", type: "checkbox" },
          { id: "trip-paris", text: "Paris weekend", type: "checkbox" },
          { id: "trip-iceland", text: "Iceland Northern Lights", type: "checkbox" },
          { id: "trip-japan", text: "Japan", type: "checkbox" },
        ],
      },
    ],
  },
  {
    id: "our-challenges",
    title: "Our Challenges",
    description: "Identify challenges, commit to solutions, and celebrate what you've solved together.",
    emoji: "⚡",
    duration: "8 min",
    gradient: "bg-gradient-to-br from-us-coral/15 to-us-blush/25",
    hasGenderPerspective: false,
    sections: [
      {
        title: "Rate Your Relationship Right Now",
        items: [
          { id: "rate-communication", text: "Communication quality (1–10)", type: "rating" },
          { id: "rate-trust", text: "Trust & safety (1–10)", type: "rating" },
          { id: "rate-intimacy", text: "Intimacy & connection (1–10)", type: "rating" },
          { id: "rate-priorities", text: "Feeling prioritised (1–10)", type: "rating" },
          { id: "rate-conflict", text: "Conflict resolution (1–10)", type: "rating" },
          { id: "rate-trend", text: "Overall trend", type: "choice", choices: ["Getting better", "Same", "Getting worse"] },
        ],
      },
      {
        title: "Challenges We Recognise",
        items: [
          { id: "ch-communication", text: "Communication", type: "checkbox" },
          { id: "ch-judgment", text: "Judgment of each other", type: "checkbox" },
          { id: "ch-rejection", text: "Rejection — physical and time together", type: "checkbox" },
          { id: "ch-safety", text: "Doesn't feel safe due to reaction", type: "checkbox" },
          { id: "ch-fear-leaving", text: "Fear partner is going to leave", type: "checkbox" },
          { id: "ch-family", text: "Family pressures and external stressors", type: "checkbox" },
          { id: "ch-dismissive", text: "Dismissive of problems", type: "checkbox" },
          { id: "ch-judgmental", text: "Judgmental of problems", type: "checkbox" },
          { id: "ch-prioritising", text: "Not prioritising the relationship", type: "checkbox" },
          { id: "ch-intimacy", text: "Intimacy challenges", type: "checkbox" },
          { id: "ch-phone", text: "Phone use — being present", type: "checkbox" },
        ],
      },
      {
        title: "What We're Doing to Solve Them",
        items: [
          { id: "sol-open", text: "Open ourselves to one another unconditionally", type: "checkbox" },
          { id: "sol-boundaries", text: "Set healthy boundaries and learn to say no", type: "checkbox" },
          { id: "sol-supportive", text: "Be supportive and grateful for each other", type: "checkbox" },
          { id: "sol-no-judgment", text: "Able to ask and respond without judgment", type: "checkbox" },
          { id: "sol-disagree", text: "Agree to be able to disagree", type: "checkbox" },
          { id: "sol-truth", text: "Talk with truth", type: "checkbox" },
          { id: "sol-repair", text: "Repair after any conflict with discussion", type: "checkbox" },
          { id: "sol-prioritise", text: "Prioritise our relationship over everything else", type: "checkbox" },
          { id: "sol-phone", text: "Phone down and be present", type: "checkbox" },
          { id: "sol-family-support", text: "Try to maintain family support", type: "checkbox" },
          { id: "sol-comfort", text: "Learn how to comfort each other about difficult topics", type: "checkbox" },
          { id: "sol-workload", text: "Manage family workload / tasks", type: "checkbox" },
          { id: "sol-embrace", text: "Embrace and kiss for 10 seconds every time you leave or reunite", type: "checkbox" },
          { id: "sol-love", text: "Say I love you", type: "checkbox" },
          { id: "sol-time", text: "Spend intentional time together without distractions", type: "checkbox" },
          { id: "sol-physical", text: "Focus on our physical and sexual connection", type: "checkbox" },
        ],
      },
    ],
  },
  {
    id: "sex-bucket-list",
    title: "Sex Bucket",
    description: "Explore desires, rate satisfaction, and discover what you both want to try.",
    emoji: "🔥",
    duration: "10 min",
    gradient: "bg-gradient-to-br from-us-coral/20 to-us-blush/30",
    hasGenderPerspective: true,
    sections: [
      {
        title: "Quick Snapshot",
        items: [
          { id: "snap-satisfaction", text: "Satisfaction rating (1–10)", type: "rating" },
          { id: "snap-skills", text: "Skills rating (1–10)", type: "rating" },
          { id: "snap-trend", text: "Trend", type: "choice", choices: ["Better", "Worse", "Same"] },
          { id: "snap-frequency", text: "Avg. times per month (solo or partnered)", type: "rating" },
        ],
      },
      {
        title: "Libido & Confidence",
        items: [
          { id: "libido-mine", text: "My libido level (1–10)", type: "rating" },
          { id: "libido-partner", text: "Partner's libido level (1–10)", type: "rating" },
          { id: "libido-confident", text: "I feel confident I can bring my partner to orgasm", type: "checkbox" },
          { id: "libido-improve", text: "I'd like to improve my sexual confidence/stamina", type: "checkbox" },
        ],
      },
      {
        title: "Pleasure & Orgasms",
        forGender: "men",
        items: [
          { id: "pleasure-stamina", text: "I want more stamina / longer-lasting sex", type: "checkbox" },
          { id: "pleasure-penile", text: "Penile orgasm", type: "checkbox" },
          { id: "pleasure-prostate", text: "Prostate (P-spot) orgasm", type: "checkbox" },
          { id: "pleasure-blended", text: "Blended P-spot + penile orgasm", type: "checkbox" },
          { id: "pleasure-urethral", text: "Urethral orgasm", type: "checkbox" },
        ],
      },
      {
        title: "Mind / Fantasy / Play",
        items: [
          { id: "mind-hypnosis", text: "Erotic hypnosis", type: "checkbox" },
          { id: "mind-roleplay", text: "Fantasy / roleplay", type: "checkbox" },
          { id: "mind-sensation", text: "Sensation play (spanking, feathers, electro-stim etc.)", type: "checkbox" },
          { id: "mind-dominance", text: "Dominance / submission / rougher play", type: "checkbox" },
        ],
      },
      {
        title: "Toys & Tools",
        items: [
          { id: "toys-vibrator", text: "Vibrators (bullet / wand)", type: "checkbox" },
          { id: "toys-air", text: "Air stimulator", type: "checkbox" },
          { id: "toys-licker", text: "Licker toy", type: "checkbox" },
          { id: "toys-thruster", text: "Thruster / pulsator", type: "checkbox" },
        ],
      },
      {
        title: "Intimacy & Connection Practices",
        items: [
          { id: "intimacy-solo", text: "Regular solo pleasure practice", type: "checkbox" },
          { id: "intimacy-massage", text: "Sensual massage (incl breast massage)", type: "checkbox" },
          { id: "intimacy-petting", text: "Petting / stroking / hair play", type: "checkbox" },
          { id: "intimacy-kissing", text: "More erotic kissing / making out", type: "checkbox" },
          { id: "intimacy-neck", text: "Neck/ear play (breath, licking, sucking)", type: "checkbox" },
          { id: "intimacy-holding", text: "Longer sensual holding moments", type: "checkbox" },
        ],
      },
      {
        title: "Skills & Techniques",
        items: [
          { id: "skills-manual", text: "Manual genital massage skills", type: "checkbox" },
          { id: "skills-oral", text: "Improve oral techniques", type: "checkbox" },
          { id: "skills-oral-orgasm", text: "Learn to orgasm while receiving oral", type: "checkbox" },
          { id: "skills-69", text: "Explore mutual oral ('69')", type: "checkbox" },
          { id: "skills-positions", text: "Explore positions stimulating multiple zones", type: "checkbox" },
        ],
      },
      {
        title: "Novelty, Talk & Confidence",
        items: [
          { id: "novelty-locations", text: "Sex in new/unusual locations", type: "checkbox" },
          { id: "novelty-talk", text: "More sensual talk / dirty talk", type: "checkbox" },
          { id: "novelty-fantasies", text: "Share fantasies (even if not acted on)", type: "checkbox" },
          { id: "novelty-moans", text: "More moans / feedback / vocal response", type: "checkbox" },
          { id: "novelty-ask", text: "Feel confident asking for what I want", type: "checkbox" },
          { id: "novelty-partner-ask", text: "Encourage partner to ask too", type: "checkbox" },
          { id: "novelty-frames", text: "Share 'favorite frames' (best moments)", type: "checkbox" },
        ],
      },
      {
        title: "Dressing Up / Media",
        items: [
          { id: "dress-lingerie", text: "Sexy clothes / lingerie / costumes", type: "checkbox" },
          { id: "dress-photos", text: "Take sexy photos or video", type: "checkbox" },
        ],
      },
      {
        title: "Clubs / Dance / Water Play",
        items: [
          { id: "club-dance", text: "Erotic dance / lap dance / pole dance with partner", type: "checkbox" },
          { id: "club-exotic", text: "Go to an exotic dance club", type: "checkbox" },
          { id: "club-water", text: "Water play (hot tub / shower / spring / waterfall)", type: "checkbox" },
        ],
      },
      {
        title: "Kink / BDSM Exploration",
        items: [
          { id: "kink-spanking", text: "Spanking / flogging / restraints / blindfolds", type: "checkbox" },
          { id: "kink-rope", text: "Rope bondage (Shibari)", type: "checkbox" },
          { id: "kink-furniture", text: "Sex furniture restraint play", type: "checkbox" },
          { id: "kink-domination", text: "Domination / being dominated", type: "checkbox" },
          { id: "kink-harness", text: "Harness / strap-on play", type: "checkbox" },
          { id: "kink-remote", text: "Remote control toy play", type: "checkbox" },
        ],
      },
      {
        title: "Anal / Pumps / Enhancement",
        items: [
          { id: "anal-explore", text: "Explore anal pleasure", type: "checkbox" },
          { id: "anal-suction", text: "Suction devices (clit/nipple/penis/vulva pump)", type: "checkbox" },
          { id: "anal-pump", text: "Penis pump / enlargement techniques", type: "checkbox" },
        ],
      },
      {
        title: "Tantra / Spiritual / Expanded Orgasm",
        items: [
          { id: "tantra-techniques", text: "Tantra / spiritual sex techniques", type: "checkbox" },
          { id: "tantra-expanded", text: "Expanded orgasm / orgasmic meditation", type: "checkbox" },
          { id: "tantra-multi", text: "Multi-orgasmic stamina training", type: "checkbox" },
          { id: "tantra-ejaculation", text: "Female ejaculation healing / exploration", type: "checkbox" },
          { id: "tantra-thrusting", text: "Taoist thrusting techniques", type: "checkbox" },
          { id: "tantra-360", text: "360° tantric positions", type: "checkbox" },
          { id: "tantra-piercings", text: "Piercings / clamps / jewelry", type: "checkbox" },
        ],
      },
    ],
  },
  {
    id: "sex-satisfaction",
    title: "Sex Satisfaction",
    description: "Rate your satisfaction, confidence, and libido — then compare with your partner.",
    emoji: "💜",
    duration: "3 min",
    gradient: "bg-gradient-to-br from-purple-500/15 to-us-blush/25",
    hasGenderPerspective: true,
    sections: [
      {
        title: "Quick Snapshot",
        items: [
          { id: "sat-satisfaction", text: "Satisfaction rating (1–10)", type: "rating" },
          { id: "sat-skills", text: "Skills rating (1–10)", type: "rating" },
          { id: "sat-trend", text: "Trend", type: "choice", choices: ["Better", "Worse", "Same"] },
          { id: "sat-frequency", text: "Avg. times per month (solo or partnered)", type: "rating" },
        ],
      },
      {
        title: "Libido & Confidence",
        items: [
          { id: "sat-libido-mine", text: "My libido level (1–10)", type: "rating" },
          { id: "sat-libido-partner", text: "Partner's libido level (1–10)", type: "rating" },
          { id: "sat-confident", text: "I feel confident I can bring my partner to orgasm", type: "checkbox" },
          { id: "sat-improve", text: "I'd like to improve my sexual confidence/stamina", type: "checkbox" },
        ],
      },
    ],
  },
];
